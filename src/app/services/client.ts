// Cliente API centralizado con manejo de errores y tokens

import { API_BASE } from './config';

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
    
    const url = customEndpoint || `${API_BASE}${endpoint}`;
    
    console.log(`[API] ${fetchOptions.method || 'GET'} ${url}`);
    
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
              : errorText.substring(0, 200) || `Error ${response.status}: ${response.statusText}` 
          };
        }
        
        console.error(`[API Error] ${url}:`, errorData);
        throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`[API] Error en ${url}:`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string, customBase?: string): Promise<T> {
    const url = customBase ? `${customBase}${endpoint}` : undefined;
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

