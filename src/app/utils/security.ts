// Utilidades de seguridad para el frontend según GUIA_SEGURIDAD_FRONTEND.md

/**
 * Valida una contraseña según los requisitos de seguridad
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos una letra minúscula
 * - Al menos un número
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe incluir al menos una letra mayúscula' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe incluir al menos una letra minúscula' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe incluir al menos un número' };
  }
  
  return { valid: true };
};

/**
 * Sanitiza entrada de usuario para prevenir XSS
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Sanitiza email (solo normaliza, no escapa HTML)
 */
export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

/**
 * Maneja errores de bloqueo de cuenta y rate limiting
 */
export const handleSecurityError = (error: unknown, response?: Response): { 
  message: string; 
  isBlocked?: boolean; 
  blockedUntil?: number;
  isRateLimited?: boolean;
} => {
  const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
  
  // Verificar si es un error de bloqueo de cuenta
  if (errorMessage.toLowerCase().includes('bloqueada temporalmente') || 
      errorMessage.toLowerCase().includes('bloqueada')) {
    const match = errorMessage.match(/(\d+)\s*minutos?/i);
    const minutos = match ? parseInt(match[1]) : 15;
    const blockedUntil = Date.now() + (minutos * 60 * 1000);
    
    return {
      message: `Tu cuenta está bloqueada temporalmente. Intenta de nuevo en ${minutos} minutos.`,
      isBlocked: true,
      blockedUntil,
    };
  }
  
  // Verificar si es rate limiting (429)
  if (response?.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter ? parseInt(retryAfter) : 60;
    
    return {
      message: `Demasiados intentos. Espera ${waitTime} segundos antes de intentar de nuevo.`,
      isRateLimited: true,
    };
  }
  
  // Error genérico (no revelar detalles)
  return {
    message: 'Credenciales inválidas o error al procesar la solicitud',
  };
};

/**
 * Obtiene headers de autenticación
 */
export const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Guarda token de forma segura
 */
export const saveToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
    // También guardar como authToken para compatibilidad
    localStorage.setItem('authToken', token);
  }
};

/**
 * Elimina token de forma segura
 */
export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
  }
};

/**
 * Obtiene token actual
 */
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  }
  return null;
};

/**
 * Fetch con retry y backoff exponencial para rate limiting
 */
export const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      // Rate limited
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Valida si un token existe y no está vacío
 */
export const hasValidToken = (): boolean => {
  const token = getToken();
  return token !== null && token.trim().length > 0;
};

