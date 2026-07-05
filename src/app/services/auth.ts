import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { saveToken } from '../utils/security';
import { normalizarUsuarioAlmacenado } from '../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../utils/userStorageSync';
import {
  mergePerfilEnLocalStorage,
  normalizarPerfilUsuario,
  unwrapUsuarioPayload,
  type PerfilUsuarioCompleto,
} from './perfil';

export interface LoginResponse {
  success: boolean;
  usuario?: {
    id?: string;
    nombre?: string;
    email: string;
    rol?: string;
  };
  token?: string;
  error?: string;
  requiereVerificacion?: boolean;
}

export interface RegisterResponse {
  success: boolean;
  usuario?: {
    id: string;
    nombre: string;
    email: string;
    rol?: string;
    activo?: boolean;
  };
  token?: string;
  error?: string;
  message?: string;
  requiereVerificacion?: boolean;
  metodo?: 'email' | 'sms';
}

export interface ForgotPasswordResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

export interface ResetPasswordResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

export interface SolicitarEnlaceResponse {
  success: boolean;
  message?: string;
  error?: string;
  retryAfter?: number;
}

export interface ValidarTokenResponse {
  success: boolean;
  valid?: boolean;
  email?: string;
  nombre?: string;
  error?: string;
  message?: string;
}

export interface SMSResponse {
  success?: boolean;
  message?: string;
  email?: string;
  token?: string;
  error?: string;
  retryAfter?: number;
}

export interface SecurityQuestionsResponse {
  questions?: Array<{
    id: string;
    pregunta: string;
    question?: string;
  }>;
  error?: string;
}

export interface GoogleLoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;  // Token opcional si el backend lo devuelve al verificar OTP
}

export interface ResendOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
  retryAfter?: number;
  metodo?: 'email' | 'sms'; // ✅ NUEVO: Método usado para el reenvío
}

export async function getMiPerfil(): Promise<PerfilUsuarioCompleto> {
  const res = await apiClient.get<unknown>('/api/auth/me', getBackendBaseUrl());
  const obj = unwrapUsuarioPayload(res);
  if (!obj) throw new Error('No se pudo leer el perfil');
  return normalizarPerfilUsuario(obj);
}

// Helper para guardar datos de autenticacion (usando utilidades de seguridad)
const saveAuthData = (data: { token?: string; user?: unknown; usuario?: unknown }) => {
  if (typeof window !== 'undefined') {
    if (data.token) {
      // ✅ Usar utilidad de seguridad para guardar token
      // ✅ Solo loguear en desarrollo y sin información sensible
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] Guardando token...');
      }
      saveToken(data.token);
      const userData = data.user ?? data.usuario;
      if (userData) {
        localStorage.setItem('user', JSON.stringify(normalizarUsuarioAlmacenado(userData)));
        emitMiruUserStorageUpdated();
      }
      // Perfil completo (foto, etc.): el login suele no traer `foto`; /api/auth/me sí.
      void (async () => {
        try {
          const perfil = await getMiPerfil();
          mergePerfilEnLocalStorage(perfil);
        } catch {
          /* sin /me o red: se completa al entrar a /perfil */
        }
      })();
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Auth] No se recibió token en la respuesta');
      }
    }
  }
};

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    try {
      // Limpiar y normalizar email: trim, lowercase, y asegurar que no tenga caracteres especiales problemáticos
      const emailLimpio = email.trim().toLowerCase().replace(/[^\w@.-]/g, '');
      
      // ✅ Logs seguros: solo en desarrollo y sin datos sensibles
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] Intentando login');
        // ✅ Log seguro: solo longitud, nunca el contenido de la contraseña
        console.log('[Auth] Payload enviado:', { 
          emailLength: emailLimpio.length,
          passwordLength: password.length,
          // ❌ NUNCA loguear: email, contraseña, tokens, ni siquiera parciales
        });
      }
      
      // skip403Redirect: una cuenta no activada devuelve 403; NO redirigir a /403,
      // dejar que el catch lo detecte y devuelva requiereVerificacion para ir a la activación.
      const data = await apiClient.post<LoginResponse>(
        '/api/auth/login',
        { email: emailLimpio, password },
        { customBase: BACKEND_BASE, skip403Redirect: true },
      );
      
      // ✅ NO loguear respuesta completa (puede contener tokens)
      // Solo loguear información no sensible en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] Respuesta del backend:', { 
          success: data.success, 
          hasToken: !!data.token, 
          hasUser: !!data.usuario,
          error: data.error 
          // ❌ NUNCA loguear: token, user completo, ni JSON.stringify de respuesta
        });
      }
      
      // Verificar si la respuesta tiene el formato correcto
      if (!data) {
        console.error('[Auth] La respuesta del backend está vacía');
        throw new Error('Error: No se recibió respuesta del servidor');
      }
      
      // Si el login falla, loggear el error específico
      if (!data.success) {
        console.error('[Auth] Login fallido - Error:', data.error);
        console.error('[Auth] Login fallido - Requiere verificación:', data.requiereVerificacion);
      }
      
      saveAuthData(data);
      
      // ✅ NO verificar ni loguear tokens (información sensible)
      // Solo verificar en desarrollo y sin mostrar el token
      if (process.env.NODE_ENV === 'development') {
        const tokenVerificado = localStorage.getItem('token') || localStorage.getItem('authToken');
        console.log('[Auth] Token guardado:', tokenVerificado ? 'Sí' : 'No');
        // ❌ NUNCA loguear el token mismo
      }
      
      return data;
    } catch (error: unknown) {
      // Si el error es sobre cuenta no verificada, devolver un objeto con requiereVerificacion
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
      
      // Verificar si el error indica que la cuenta no está activada/verificada
      const lowerError = errorMessage.toLowerCase();
      if (lowerError.includes('no está activada') || 
          lowerError.includes('no está activado') ||
          lowerError.includes('no está verificada') ||
          lowerError.includes('no está verificado') ||
          lowerError.includes('no está confirmada') ||
          lowerError.includes('no está confirmado') ||
          lowerError.includes('revisa tu correo') ||
          lowerError.includes('cuenta no activada') ||
          lowerError.includes('activar tu cuenta')) {
        return {
          success: false,
          error: errorMessage,
          requiereVerificacion: true
        };
      }
      
      // Para otros errores, lanzar el error normalmente
      throw error;
    }
  },

  async register(registerData: {
    nombre: string;
    email: string;
    password: string;
    telefono: string;
    fechaNacimiento: string;
    metodoVerificacion?: 'email' | 'sms'; // ✅ NUEVO: Método de verificación
    preguntaSeguridad: {
      pregunta: string;
      respuesta: string;
    };
    // Sin dirección embebida: se usan registros DireccionUsuario después del alta.
    perfilCapilar: {
      tipoCabello: string;
      colorNatural?: string;
      colorActual?: string;
      productosUsados?: string;
      tieneAlergias: boolean;
      alergias?: string;
      tratamientosQuimicos: boolean;
      tratamientos?: string;
    };
    aceptaAvisoPrivacidad: boolean;
    recibePromociones: boolean;
  }): Promise<RegisterResponse> {
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const data = await apiClient.post<RegisterResponse>('/api/usuarios/registro', registerData, BACKEND_BASE);
    // No guardar datos de autenticación si requiere verificación
    if (data.success && data.token && !data.requiereVerificacion) {
      saveAuthData(data);
    }
    return data;
  },

  async forgotPassword(
    email: string,
    method: 'email' | 'sms' | 'security-questions' = 'email'
  ): Promise<ForgotPasswordResponse> {
    void email;
    void method;
    // Esta ruta no existe en el backend actual
    // El flujo de recuperación se maneja directamente con las preguntas de seguridad
    // Por ahora retornamos un mensaje de éxito
    return {
      success: true,
      message: 'Por favor, usa el método de preguntas de seguridad para recuperar tu contraseña'
    };
  },

  // ✅ Solicitar enlace de recuperación de contraseña
  async solicitarEnlaceRecuperacion(email: string): Promise<SolicitarEnlaceResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<SolicitarEnlaceResponse>(
        '/api/auth/solicitar-enlace-recuperacion',
        { email },
        BACKEND_BASE
      );
      return data;
    } catch (error: unknown) {
      console.error('Error solicitando enlace de recuperación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al solicitar el enlace de recuperación';
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  },

  // ✅ Validar token de recuperación
  async validarTokenRecuperacion(email: string, token: string): Promise<ValidarTokenResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<ValidarTokenResponse>(
        '/api/auth/validar-token-recuperacion',
        { email, token },
        BACKEND_BASE
      );
      return data;
    } catch (error: unknown) {
      console.error('Error validando token de recuperación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Token inválido o expirado';
      return {
        success: false,
        valid: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  },

  async resetPassword(token: string | null, email: string | null, nuevaPassword: string): Promise<ResetPasswordResponse> {
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    // Limpiar y normalizar email para evitar falsos positivos de SQL injection
    const emailLimpio = email ? email.trim().toLowerCase().replace(/[^\w@.-]/g, '') : null;
    const payload = { token, email: emailLimpio, nuevaPassword };
    
    // ✅ Log seguro: solo en desarrollo y sin datos sensibles
    if (process.env.NODE_ENV === 'development') {
      console.log('[resetPassword] Enviando cambio de contraseña:', { 
        hasToken: !!token, 
        emailLength: emailLimpio?.length || 0,
        nuevaPasswordLength: nuevaPassword?.length 
        // ❌ NUNCA loguear: token (ni parcial), email, contraseña (ni parcial)
      });
    }
    return apiClient.post<ResetPasswordResponse>(
      '/api/auth/cambiar-password',
      payload,
      BACKEND_BASE
    );
  },

  /** Enviar OTP por SMS para recuperación de contraseña. Backend: POST /api/auth/enviar-codigo-recuperacion-sms */
  async sendSMSCode(phone: string): Promise<SMSResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    const data = await apiClient.post<SMSResponse>(
      '/api/auth/enviar-codigo-recuperacion-sms',
      { phone: phone.replace(/\s/g, '').trim() },
      BACKEND_BASE
    );
    return data;
  },

  /** Verificar OTP SMS y obtener token de reset. Backend: POST /api/auth/verificar-codigo-recuperacion-sms → { success, token, email } */
  async verifySMSCode(phone: string, codigo: string): Promise<SMSResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    const data = await apiClient.post<SMSResponse>(
      '/api/auth/verificar-codigo-recuperacion-sms',
      { phone: phone.replace(/\s/g, '').trim(), codigo },
      BACKEND_BASE
    );
    return data;
  },

  // ❌ DEPRECADO: Este método usa GET /api/pregunta-seguridad (solo para registro)
  // Para recuperación de contraseña, usar getUserSecurityQuestion
  async getSecurityQuestions(email: string): Promise<SecurityQuestionsResponse> {
    // Opción 1: Usar /api/pregunta-seguridad?email=... (GET)
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const data = await apiClient.get<{ success?: boolean; data?: Array<{ id: string; pregunta: string }> }>(
      `/api/pregunta-seguridad?email=${encodeURIComponent(email)}`,
      BACKEND_BASE
    );

    if (data.success && data.data && data.data.length > 0) {
      return {
        questions: data.data.map(q => ({ id: q.id, pregunta: q.pregunta }))
      };
    }
    
    // Si no hay datos, retornar array vacío
    return { questions: [] };
  },

  // ✅ NUEVO: Obtener pregunta de seguridad del usuario para recuperación de contraseña
  // Usa POST /api/auth/pregunta-seguridad
  async getUserSecurityQuestion(email: string): Promise<{ success: boolean; pregunta?: string; message?: string; error?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<{ success?: boolean; pregunta?: string; question?: string; message?: string; error?: string }>(
        '/api/auth/pregunta-seguridad',
        { email },
        BACKEND_BASE
      );
      
      console.log('Respuesta del backend para pregunta de seguridad:', data);
      
      // Manejar diferentes formatos de respuesta del backend
      const pregunta = data.pregunta || data.question;
      const success = data.success !== false && !!pregunta;
      
      if (success && pregunta) {
        return {
          success: true,
          pregunta: pregunta,
        };
      } else {
        // Por seguridad, no revelar si el email existe o no
        // El backend debería devolver siempre un mensaje genérico
        const errorMsg = data.error || data.message;
        return {
          success: false,
          message: errorMsg || 'Si el email existe y tiene pregunta de seguridad configurada, se mostrará la pregunta.',
          error: errorMsg,
        };
      }
    } catch (error: unknown) {
      console.error('Error obteniendo pregunta de seguridad del usuario:', error);
      
      // Manejar errores HTTP específicos
      const err = error as Error & { status?: number; response?: { data?: { message?: string } } };
      if (err.status === 404) {
        return {
          success: false,
          message: 'Si el email existe y tiene pregunta de seguridad configurada, se mostrará la pregunta.',
          error: 'Usuario no encontrado o sin pregunta de seguridad',
        };
      } else if (err.status === 400) {
        const errorMessage = err.response?.data?.message || err.message || 'Error al obtener la pregunta de seguridad';
        return {
          success: false,
          message: errorMessage,
          error: errorMessage,
        };
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener la pregunta de seguridad';
      return {
        success: false,
        message: 'Si el email existe y tiene pregunta de seguridad configurada, se mostrará la pregunta.',
        error: errorMessage,
      };
    }
  },

  async verifySecurityQuestions(email: string, answers: Record<string, string>): Promise<{ success?: boolean; token?: string; error?: string }> {
    // El backend espera { email, respuesta } en /api/auth/verificar-respuesta
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const preguntaTexto = Object.keys(answers)[0];
    const respuesta = answers[preguntaTexto];

    return apiClient.post<{ success?: boolean; token?: string; email?: string; error?: string }>(
      '/api/auth/verificar-respuesta',
      { email, respuesta },
      BACKEND_BASE
    );
  },

  async getAvailableSecurityQuestions() {
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const endpoint = `/api/pregunta-seguridad`;
    const data = await apiClient.get<{ success?: boolean; count?: number; data?: Array<{id: string; pregunta: string}>; questions?: Array<{id: string; pregunta: string}> }>(
      endpoint,
      BACKEND_BASE
    );
    
    // Normalizar respuesta
    if (data.success && data.data && Array.isArray(data.data)) {
      return { questions: data.data };
    } else if (Array.isArray(data)) {
      return { questions: data };
    } else if (data.questions && Array.isArray(data.questions)) {
      return data;
    }
    
    return { questions: [] };
  },

  async loginWithGoogle(): Promise<GoogleLoginResponse> {
    // Redirige a la URL de autenticación de Google en el backend
    // El backend debería manejar la autenticación OAuth y redirigir de vuelta
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const redirectUrl = `${BACKEND_BASE}/api/auth/google`;
    window.location.href = redirectUrl;
    // Nota: Este método no retorna inmediatamente ya que redirige
    return { success: false, error: 'Redirecting to Google' };
  },

  // Verificar código OTP para activar cuenta
  async verifyOTP(email: string, codigo: string): Promise<VerifyOTPResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    // skip401Redirect: un código OTP inválido/expirado devuelve 401 pero NO es una sesión
    // expirada; no debe expulsar al usuario a /login (rompía la activación desde /register).
    return apiClient.post<VerifyOTPResponse>(
      '/api/auth/verificar-otp',
      { email, codigo },
      { customBase: BACKEND_BASE, skip401Redirect: true }
    );
  },

  // Reenviar código OTP
  // NOTA: el backend (ReenviarCodigoDto) SOLO acepta { email } y rechaza cualquier
  // otra propiedad (forbidNonWhitelisted). Enviar metodoVerificacion provocaba 400.
  async resendOTPCode(email: string, _metodoVerificacion?: 'email' | 'sms'): Promise<ResendOTPResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    return apiClient.post<ResendOTPResponse>(
      '/api/auth/reenviar-codigo',
      { email },
      { customBase: BACKEND_BASE, skip401Redirect: true }
    );
  },

  // ✅ Enviar código OTP para recuperación de contraseña
  async sendPasswordRecoveryOTP(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<{ success: boolean; message?: string; error?: string }>(
        '/api/auth/enviar-codigo-recuperacion-sms',
        { email },
        BACKEND_BASE
      );
      return data;
    } catch (error: unknown) {
      console.error('Error enviando código de recuperación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar el código de verificación';
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  },

  // ✅ Verificar código OTP para recuperación de contraseña
  async verifyPasswordRecoveryOTP(email: string, codigo: string): Promise<{ success: boolean; token?: string; message?: string; error?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<{ success: boolean; token?: string; message?: string; error?: string }>(
        '/api/auth/verificar-codigo-recuperacion-sms',
        { email, codigo },
        BACKEND_BASE
      );
      return data;
    } catch (error: unknown) {
      console.error('Error verificando código de recuperación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al verificar el código';
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  },

  // Verificar si un correo ya está registrado (validación en tiempo real)
  async verificarCorreoExistente(email: string): Promise<{ existe: boolean; message?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<{ existe: boolean; message?: string }>(
        '/api/auth/verificar-correo',
        { correo: email },
        BACKEND_BASE
      );
      return data;
    } catch (error) {
      console.error('Error al verificar correo:', error);
      return { existe: false, message: 'Error al verificar el correo' };
    }
  },

  // ✅ Cerrar sesión (revoca token) - Logout individual
  // Según GUIA_FRONTEND_LOGOUT_GLOBAL.md
  async logout(logoutAll: boolean = false): Promise<{ success: boolean; message?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      if (logoutAll) {
        // Logout global: cerrar todas las sesiones
        const data = await apiClient.post<{ success: boolean; message?: string }>(
          '/api/auth/logout-all',
          {},
          BACKEND_BASE
        );
        return data;
      } else {
        // Logout individual: solo esta sesión
        const data = await apiClient.post<{ success: boolean; message?: string }>(
          '/api/auth/logout',
          { logoutAll: false },
          BACKEND_BASE
        );
        return data;
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aún así retornar éxito para limpiar el token local
      return { success: true, message: logoutAll ? 'Todas las sesiones cerradas' : 'Sesión cerrada' };
    }
  },

  // ✅ Cerrar todas las sesiones (logout global)
  // Según GUIA_FRONTEND_LOGOUT_GLOBAL.md
  async logoutAll(): Promise<{ success: boolean; message?: string }> {
    return this.logout(true);
  },

  // ✅ Renovar token
  async refreshToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<{ success: boolean; token?: string; error?: string }>(
        '/api/auth/refresh',
        {},
        BACKEND_BASE
      );
      if (data.success && data.token) {
        saveToken(data.token);
      }
      return data;
    } catch (error) {
      console.error('Error renovando token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al renovar token';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Perfil del usuario autenticado (alineado con Prisma `Usuario` + opcional `direcciones`).
   * GET `/api/auth/me` — el backend debe devolver los campos del modelo o un subconjunto.
   */
  async getProfile(): Promise<{
    success: boolean;
    data?: PerfilUsuarioCompleto;
    error?: string;
  }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const raw = await apiClient.get<unknown>('/api/auth/me', BACKEND_BASE);
      const obj = unwrapUsuarioPayload(raw);
      if (!obj) {
        return { success: false, error: 'Respuesta de perfil no reconocida' };
      }
      return { success: true, data: normalizarPerfilUsuario(obj) };
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener perfil';
      return { success: false, error: errorMessage };
    }
  },
};

