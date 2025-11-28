// Cliente API centralizado con manejo de errores y tokens

import { getApiBaseUrl } from './config';
import { removeToken } from '../utils/security';

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
    if (!skipAuth) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
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
          // Token inválido o expirado
          if (typeof window !== 'undefined') {
            removeToken();
            // Redirigir al login solo si estamos en el cliente
            window.location.href = '/';
          }
          throw new Error('No autorizado. Por favor, inicia sesión nuevamente.');
        }
        
        // ✅ Manejar error 429 (Rate Limiting)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) : 60;
          throw new Error(`Demasiados intentos. Espera ${waitTime} segundos antes de intentar de nuevo.`);
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

