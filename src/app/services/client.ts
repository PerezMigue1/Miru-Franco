// Cliente API centralizado con manejo de errores y tokens

import { getApiBaseUrl, getBackendBaseUrl } from './config';
import { getToken, saveToken, clearAuthData } from '../utils/security';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  endpoint?: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, endpoint: customEndpoint, ...fetchOptions } = options;
    
    // Calcular API_BASE en runtime para evitar problemas con builds cacheados
    // Usar getApiBaseUrl() que calcula en runtime en lugar de la constante
    const apiBase = getApiBaseUrl();
    
    // Construir URL: si hay customEndpoint, usarlo; si no, construir desde API_BASE
    // Si customEndpoint es una URL completa, usarla directamente; si no, construir desde customEndpoint + endpoint
    let url: string;
    if (customEndpoint) {
      // Si customEndpoint ya incluye el endpoint completo, usarlo directamente
      // Si no, construir: customEndpoint + endpoint
      url = customEndpoint.includes('http') && !customEndpoint.endsWith(endpoint) 
        ? `${customEndpoint}${endpoint}` 
        : customEndpoint;
    } else {
      url = `${apiBase}${endpoint}`;
    }
    
    // Log detallado para debugging en producción
    console.log(`[API Client] ${fetchOptions.method || 'GET'} ${url}`);
    console.log(`[API Client] Endpoint: ${endpoint}`);
    if (customEndpoint) {
      console.log(`[API Client] Using customEndpoint: ${customEndpoint}`);
    } else {
      console.log(`[API Client] Using API_BASE (runtime): ${apiBase}`);
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    };

    // Agregar token si existe y no se omite
    let token: string | null = null;
    if (!skipAuth) {
      token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        
        // Verificar si necesita renovación (cada 10 minutos)
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          const lastActivity = tokenData.lastActivity || tokenData.iat;
          const timeSinceActivity = now - lastActivity;
          
          // Si han pasado más de 10 minutos, renovar token
          if (timeSinceActivity > 10 * 60) {
            try {
              const BACKEND_BASE = getBackendBaseUrl();
              const refreshResponse = await fetch(`${BACKEND_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                if (refreshData.token) {
                  saveToken(refreshData.token);
                  token = refreshData.token;
                  headers['Authorization'] = `Bearer ${token}`;
                }
              }
            } catch (refreshError) {
              // Si falla la renovación, continuar con el token actual
              console.warn('Error renovando token:', refreshError);
            }
          }
        } catch {
          // Ignorar errores de decodificación del token
        }
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Manejar errores HTTP
      if (!response.ok) {
        // ✅ Manejar error 401 (No autorizado) según guía
        if (response.status === 401) {
          const errorText = await response.text();
          let errorData;
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          const message = errorData.message || errorData.error || '';
          const lowerMessage = message.toLowerCase();

          // Bandera para saber si el logout fue iniciado manualmente desde el frontend
          const isManualLogout = typeof window !== 'undefined' &&
            localStorage.getItem('manualLogout') === 'true';
          
          // ✅ NO redirigir automáticamente si estamos en la página de login o registro
          // Solo redirigir si realmente hay un problema de sesión expirada o token inválido
          // NO redirigir cuando el usuario está intentando hacer login con credenciales incorrectas
          const isLoginPage = typeof window !== 'undefined' && (
            window.location.pathname === '/login' ||
            window.location.pathname === '/register' ||
            window.location.pathname === '/forgot-password' ||
            window.location.pathname === '/reset-password' ||
            window.location.pathname.includes('/auth')
          );
          
          if (typeof window !== 'undefined' && !isLoginPage) {
            // ✅ Manejar error 401 según GUIA_FRONTEND_EXPIRACION_INACTIVIDAD.md
            // Verificar si es por inactividad
            if (lowerMessage.includes('inactividad') || lowerMessage.includes('sesión expirada')) {
              // Sesión expirada por inactividad - limpiar todo y redirigir
              clearAuthData(); // Limpiar token y usuario
              
              // Si el logout fue manual, no mostrar mensaje de inactividad
              if (isManualLogout) {
                localStorage.removeItem('manualLogout');
              } else {
                // Mostrar mensaje según la guía
                alert('Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.');
              }
              
              // Redirigir al login según la guía
              window.location.href = '/login';
            } else if (lowerMessage.includes('revocado') || 
                       lowerMessage.includes('sesión cerrada') ||
                       lowerMessage.includes('token revocado') ||
                       lowerMessage.includes('nueva sesión') ||
                       lowerMessage.includes('otro dispositivo')) {
              // Token revocado por nueva sesión en otro dispositivo
              // Según requerimiento: cuando se inicia sesión en segundo dispositivo,
              // se cierra automáticamente la sesión del primer dispositivo
              clearAuthData();
              alert('Se inició sesión en otro dispositivo. Tu sesión actual ha sido cerrada. Por favor inicia sesión nuevamente si deseas continuar.');
              window.location.href = '/login';
            } else if (lowerMessage.includes('verificar') || lowerMessage.includes('confirmado')) {
              // Usuario no ha verificado correo
              const email = errorData.email || '';
              window.location.href = `/verificar-email?email=${encodeURIComponent(email)}`;
            } else {
              // Error genérico de autenticación - limpiar y redirigir al login
              clearAuthData();
              window.location.href = '/login';
            }
          } else if (typeof window !== 'undefined' && isLoginPage) {
            // Si estamos en la página de login, solo limpiar el token si existe
            // pero NO redirigir - dejar que el componente Login maneje el error
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            if (token) {
              clearAuthData();
            }
          }
          
          throw new Error(message || 'No autorizado. Por favor, inicia sesión nuevamente.');
        }
        
        // ✅ Manejar error 403 (Prohibido - cuenta bloqueada o sin permisos)
        if (response.status === 403) {
          const errorText = await response.text();
          let errorData;
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          const message = errorData.message || errorData.error || 'Acceso denegado';
          const lowerMessage = message.toLowerCase();
          
          if (lowerMessage.includes('bloqueada')) {
            // Cuenta bloqueada por fuerza bruta
            throw new Error(message);
          } else if (lowerMessage.includes('permisos')) {
            // Sin permisos (RBAC)
            throw new Error('No tienes permisos para realizar esta acción');
          }
          
          throw new Error(message);
        }
        
        // ✅ Manejar error 429 (Rate Limiting)
        if (response.status === 429) {
          const errorText = await response.text();
          let errorData;
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          // Extraer retryAfter del cuerpo de la respuesta o del header
          const retryAfter = errorData.retryAfter || response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(String(retryAfter)) : 60;
          
          // Crear error personalizado con retryAfter
          const error = new Error(errorData.message || `Demasiados intentos. Espera ${waitTime} segundos antes de intentar de nuevo.`) as Error & { status?: number; retryAfter?: number; data?: unknown };
          error.status = 429;
          error.retryAfter = waitTime;
          error.data = errorData;
          throw error;
        }

        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Si es HTML, extraer mensaje
          const htmlMatch = errorText.match(/<pre>(.*?)<\/pre>/);
          errorData = { 
            error: htmlMatch 
              ? htmlMatch[1] 
              : errorText.substring(0, 200) || `Error ${response.status}: ${response.statusText}`,
            message: htmlMatch 
              ? htmlMatch[1] 
              : errorText.substring(0, 200) || `Error ${response.status}: ${response.statusText}`
          };
        }
        
        // Preservar el mensaje del backend para detectar cuenta no verificada
        const errorMessage = errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`;
        
        console.error(`[API Error] ${url}:`, errorData);
        
        // Crear un error personalizado que preserve el mensaje original
        const error = new Error(errorMessage) as Error & { status?: number; data?: unknown };
        // Agregar propiedades adicionales para identificar el tipo de error
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`[API] Error en ${url}:`, error);
      
      // Mejorar mensaje de error para "Failed to fetch" (problemas de CORS o conexión)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        const enhancedError = new Error(
          `No se pudo conectar con el servidor en ${url}. ` +
          `Posibles causas: CORS no configurado, backend no disponible, o URL incorrecta. ` +
          `Verifica que el backend esté corriendo y que CORS permita solicitudes desde el frontend.`
        ) as Error & { originalError?: Error; url?: string; isNetworkError?: boolean };
        enhancedError.originalError = error;
        enhancedError.url = url;
        enhancedError.isNetworkError = true;
        throw enhancedError;
      }
      
      throw error;
    }
  }

  async get<T>(endpoint: string, customBase?: string): Promise<T> {
    // Construir URL completa: customBase + endpoint
    // Si customBase ya incluye el endpoint, usarlo directamente
    const url = customBase ? `${customBase}${endpoint}` : undefined;
    console.log(`[API Client] GET - endpoint: ${endpoint}, customBase: ${customBase}, constructed url: ${url}`);
    return this.request<T>(endpoint, { method: 'GET', endpoint: url });
  }

  async post<T>(endpoint: string, body?: unknown, customBase?: string): Promise<T> {
    const url = customBase ? `${customBase}${endpoint}` : undefined;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      endpoint: url,
    });
  }

  async put<T>(endpoint: string, body?: unknown, customBase?: string): Promise<T> {
    const url = customBase ? `${customBase}${endpoint}` : undefined;
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      endpoint: url,
    });
  }

  async delete<T>(endpoint: string, customBase?: string): Promise<T> {
    const url = customBase ? `${customBase}${endpoint}` : undefined;
    return this.request<T>(endpoint, { method: 'DELETE', endpoint: url });
  }
}

export const apiClient = new ApiClient();

