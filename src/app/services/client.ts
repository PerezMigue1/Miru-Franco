// Cliente API centralizado con manejo de errores y tokens

import { getApiBaseUrl, getBackendBaseUrl } from './config';
import { getToken, saveToken, clearAuthData } from '../utils/security';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  endpoint?: string;
  /** Si es true, en 403 no se redirige a /403; se lanza el error para que la página lo muestre */
  skip403Redirect?: boolean;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, endpoint: customEndpoint, skip403Redirect = false, ...fetchOptions } = options;
    
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
                credentials: 'include', // ⚠️ OBLIGATORIO: El backend tiene credentials: true
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
      // En el navegador, usar URL relativa cuando sea mismo origen para que el proxy de Next.js aplique
      let fetchUrl = url;
      if (typeof window !== 'undefined' && url.startsWith(window.location.origin)) {
        fetchUrl = url.slice(window.location.origin.length) || '/';
      }
      const response = await fetch(fetchUrl, {
        ...fetchOptions,
        headers,
        credentials: 'include', // ⚠️ OBLIGATORIO: El backend tiene credentials: true
      });

      // Manejar errores HTTP
      if (!response.ok) {
        // ✅ Manejar error 401 (No autorizado) según guía
        if (response.status === 401) {
          let errorText = await response.text();
          let errorData: { message?: string; error?: string; email?: string };
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          const message = errorData.message || errorData.error || '';
          let lowerMessage = message.toLowerCase();

          // ✅ NO redirigir si estamos en la página de login o registro
          const isLoginPage = typeof window !== 'undefined' && (
            window.location.pathname === '/login' ||
            window.location.pathname === '/register' ||
            window.location.pathname === '/forgot-password' ||
            window.location.pathname === '/reset-password' ||
            window.location.pathname.includes('/auth')
          );

          // ✅ Intentar renovar token y reintentar la petición UNA vez antes de echar al usuario (evita "acceso denegado" al admin tras un cambio)
          if (typeof window !== 'undefined' && !isLoginPage && token) {
            try {
              const BACKEND_BASE = getBackendBaseUrl();
              const refreshRes = await fetch(`${BACKEND_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                credentials: 'include',
              });
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json() as { token?: string };
                if (refreshData.token) {
                  saveToken(refreshData.token);
                  const newHeaders = { ...headers, 'Authorization': `Bearer ${refreshData.token}` };
                  const retryRes = await fetch(fetchUrl, { ...fetchOptions, headers: newHeaders, credentials: 'include' });
                  if (retryRes.ok) {
                    return (await retryRes.json()) as T;
                  }
                  if (retryRes.status === 401) {
                    errorText = await retryRes.text();
                    try {
                      errorData = JSON.parse(errorText);
                    } catch {
                      errorData = { message: errorText };
                    }
                    lowerMessage = (errorData.message || errorData.error || '').toLowerCase();
                  }
                }
              }
            } catch {
              // Si falla el refresh, seguir con el manejo normal de 401
            }
          }

          // Bandera para saber si el logout fue iniciado manualmente desde el frontend
          const isManualLogout = typeof window !== 'undefined' &&
            localStorage.getItem('manualLogout') === 'true';

          if (typeof window !== 'undefined' && !isLoginPage) {
            // ✅ Manejar error 401 según GUIA_FRONTEND_EXPIRACION_INACTIVIDAD.md
            // Verificar si es por inactividad
            // NO mostrar mensaje de inactividad si el login fue reciente (menos de 10 segundos)
            const lastLoginTime = typeof window !== 'undefined' ? localStorage.getItem('lastLoginTime') : null;
            const isRecentLogin = lastLoginTime && (Date.now() - parseInt(lastLoginTime)) < 10000; // 10 segundos
            
            if ((lowerMessage.includes('inactividad') || lowerMessage.includes('sesión expirada')) && !isRecentLogin) {
              // Sesión expirada por inactividad - limpiar todo y redirigir
              clearAuthData(); // Limpiar token y usuario
              
              // Si el logout fue manual, no mostrar mensaje de inactividad
              if (isManualLogout) {
                localStorage.removeItem('manualLogout');
              } else {
                // Mostrar mensaje según la guía
                alert('Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.');
              }
              
              // replace para que "atrás" lleve a la página anterior, no a la protegida
              window.location.replace('/login');
            } else if (
              lowerMessage.includes('otro dispositivo') ||
              lowerMessage.includes('cerrada desde otro dispositivo') ||
              lowerMessage.includes('nueva sesión en otro dispositivo')
            ) {
              // Solo cuando el backend indica EXPLÍCITAMENTE sesión en otro dispositivo (evitar confundir con token expirado)
              clearAuthData();
              alert('Se inició sesión en otro dispositivo. Tu sesión actual ha sido cerrada. Por favor inicia sesión nuevamente si deseas continuar.');
              window.location.replace('/login');
            } else if (lowerMessage.includes('verificar') || lowerMessage.includes('confirmado')) {
              // Usuario no ha verificado correo
              const email = errorData.email || '';
              window.location.replace(`/verificar-email?email=${encodeURIComponent(email)}`);
            } else {
              // Error genérico de autenticación - limpiar y redirigir al login (replace para no apilar historial)
              clearAuthData();
              window.location.replace('/login');
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
          const finalMessage = lowerMessage.includes('permisos') ? 'No tienes permisos para realizar esta acción' : message;
          // No redirigir si la petición pidió mostrar el error en la misma página (ej. cambio de rol/estado en admin)
          if (skip403Redirect) {
            throw new Error(finalMessage);
          }
          if (typeof window !== 'undefined') {
            window.location.replace('/403');
            throw new Error(finalMessage);
          }
          throw new Error(finalMessage);
        }
        
        // ✅ Manejar error 500 (Error interno del servidor)
        if (response.status === 500) {
          const isAuthPage = typeof window !== 'undefined' && (
            window.location.pathname === '/login' ||
            window.location.pathname === '/register' ||
            window.location.pathname.includes('/auth')
          );
          // En login/registro no redirigir a /500: mostrar el error en el formulario
          if (typeof window !== 'undefined' && !isAuthPage) {
            window.location.replace('/500');
          }
          throw new Error('Error del servidor. Comprueba que el backend esté en marcha (ej. http://localhost:3001) e intenta de nuevo.');
        }
        
        // ✅ Manejar error 400 (Bad Request) - el cliente lanza error; las pantallas pueden redirigir a /400 si lo desean
        if (response.status === 400) {
          const errorText = await response.text();
          let errorData: { message?: string | string[]; error?: string; errors?: Record<string, string> };
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          let message: string = typeof errorData.message === 'string'
            ? errorData.message
            : Array.isArray(errorData.message)
              ? errorData.message.join(' | ')
              : (errorData.error || 'Solicitud incorrecta. Revisa los datos enviados.');
          if (message === 'Bad Request' && errorData.errors && Object.keys(errorData.errors).length > 0) {
            message = Object.entries(errorData.errors).map(([k, v]) => `${k}: ${v}`).join(' | ');
          }
          const err = new Error(message) as Error & { status?: number; data?: unknown; validationErrors?: Record<string, string> };
          err.status = 400;
          err.data = errorData;
          err.validationErrors = errorData.errors || (typeof errorData.message === 'object' && Array.isArray(errorData.message) ? { general: errorData.message.join('; ') } : {});
          throw err;
        }
        
        // ✅ Manejar error 409 (Conflict - ej. email ya registrado)
        if (response.status === 409) {
          const errorText = await response.text();
          let errorData: { message?: string; error?: string };
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          const message = errorData.message || errorData.error || 'El correo ya está registrado. Usa otro email.';
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
          'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e intenta de nuevo más tarde.'
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

  async patch<T>(endpoint: string, body?: unknown, customBase?: string, requestOptions?: { skip403Redirect?: boolean }): Promise<T> {
    const url = customBase ? `${customBase}${endpoint}` : undefined;
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      endpoint: url,
      ...requestOptions,
    });
  }

  async delete<T>(endpoint: string, customBase?: string): Promise<T> {
    const url = customBase ? `${customBase}${endpoint}` : undefined;
    return this.request<T>(endpoint, { method: 'DELETE', endpoint: url });
  }
}

export const apiClient = new ApiClient();

