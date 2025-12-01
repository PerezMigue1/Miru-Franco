// Utilidades de seguridad para el frontend según GUIA_SEGURIDAD_FRONTEND.md

/**
 * Valida una contraseña según los requisitos de seguridad
 * Implementa todas las validaciones del backend según GUIA_VALIDACION_CONTRASENA_BACKEND_VS_FRONTEND.md
 * 
 * Validaciones:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos una letra minúscula
 * - Al menos un número
 * - Al menos un carácter especial
 * - No datos personales
 * - No patrones simples
 * - No contraseñas comunes
 */
export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
  strength?: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (
  password: string,
  userData?: {
    nombre?: string;
    email?: string;
    telefono?: string;
    fechaNacimiento?: string;
    direccion?: {
      calle?: string;
      colonia?: string;
    };
    preguntaSeguridad?: {
      respuesta?: string;
    };
  }
): PasswordValidationResult => {
  const errors: string[] = [];

  // 1. Longitud mínima
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }

  // 2. Combinación de caracteres
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una letra mayúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Debe incluir al menos una letra minúscula');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Debe incluir al menos un número');
  }
  
  // Caracteres especiales
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Debe incluir al menos un carácter especial (!@#$%^&*()_+-=[]{}|;:\'",.<>?/)');
  }

  // 3. No datos personales (solo si se proporcionan)
  if (userData) {
    const passwordLower = password.toLowerCase();
    
    if (userData.nombre) {
      const nombreLower = userData.nombre.toLowerCase();
      if (passwordLower.includes(nombreLower)) {
        errors.push('La contraseña no puede contener tu nombre');
      }
    }
    
    if (userData.email) {
      const emailPart = userData.email.split('@')[0].toLowerCase();
      if (passwordLower.includes(emailPart)) {
        errors.push('La contraseña no puede contener tu email');
      }
    }
    
    if (userData.telefono) {
      const telefonoClean = userData.telefono.replace(/\D/g, '');
      if (telefonoClean && password.includes(telefonoClean)) {
        errors.push('La contraseña no puede contener tu teléfono');
      }
    }
    
    if (userData.fechaNacimiento) {
      const fecha = new Date(userData.fechaNacimiento);
      const año = fecha.getFullYear().toString();
      const dia = fecha.getDate().toString();
      if (password.includes(año) || password.includes(dia)) {
        errors.push('La contraseña no puede contener tu fecha de nacimiento');
      }
    }
    
    if (userData.direccion) {
      if (userData.direccion.calle) {
        const calleLower = userData.direccion.calle.toLowerCase();
        if (passwordLower.includes(calleLower)) {
          errors.push('La contraseña no puede contener tu dirección');
        }
      }
      if (userData.direccion.colonia) {
        const coloniaLower = userData.direccion.colonia.toLowerCase();
        if (passwordLower.includes(coloniaLower)) {
          errors.push('La contraseña no puede contener tu dirección');
        }
      }
    }
    
    if (userData.preguntaSeguridad?.respuesta) {
      const respuestaLower = userData.preguntaSeguridad.respuesta.toLowerCase();
      if (passwordLower.includes(respuestaLower)) {
        errors.push('La contraseña no puede contener la respuesta de tu pregunta de seguridad');
      }
    }
  }

  // 4. No patrones simples
  const passwordLower = password.toLowerCase();
  
  // Secuencias de teclado
  const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '123456', '654321'];
  if (keyboardPatterns.some(pattern => passwordLower.includes(pattern))) {
    errors.push('La contraseña no puede seguir patrones simples de teclado');
  }
  
  // Letras consecutivas
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    errors.push('La contraseña no puede contener letras consecutivas');
  }
  
  // Números consecutivos
  if (/012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210/.test(password)) {
    errors.push('La contraseña no puede contener números consecutivos');
  }
  
  // Mismo carácter repetido 3+ veces
  if (/(.)\1{2,}/.test(password)) {
    errors.push('La contraseña no puede tener el mismo carácter repetido 3 o más veces');
  }
  
  // Solo números o solo letras
  if (/^\d+$/.test(password)) {
    errors.push('La contraseña no puede contener solo números');
  }
  if (/^[a-zA-Z]+$/.test(password)) {
    errors.push('La contraseña no puede contener solo letras');
  }

  // 5. No contraseñas comunes
  const commonPasswords = [
    'password', 'password123', '12345678', '123456789', '1234567890',
    'qwerty', 'qwerty123', 'abc123', 'monkey', '1234567',
    'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou',
    'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
    'shadow', '123123', '654321', 'superman', 'qazwsx',
    'michael', 'football', 'welcome', 'jesus', 'ninja',
    'mustang', 'password1', '123qwe', 'admin', 'root'
  ];
  
  if (commonPasswords.includes(passwordLower)) {
    errors.push('Esta contraseña es muy común, elige otra más segura');
  }

  // Calcular fortaleza
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    const hasLength = password.length >= 12;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const criteriaMet = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (criteriaMet >= 5 && password.length >= 12) {
      strength = 'strong';
    } else if (criteriaMet >= 4) {
      strength = 'medium';
    }
  }

  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : undefined,
    errors: errors.length > 0 ? errors : undefined,
    strength,
  };
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
 * Limpia todos los datos de autenticación (token y usuario)
 * Según GUIA_FRONTEND_EXPIRACION_INACTIVIDAD.md
 */
export const clearAuthData = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
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

