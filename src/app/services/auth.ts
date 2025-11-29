import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { saveToken } from '../utils/security';

export interface LoginResponse {
  success: boolean;
  user?: {
    _id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
  requiereVerificacion?: boolean; // Indica si la cuenta no está confirmada
}

export interface RegisterResponse {
  success: boolean;
  user?: {
    _id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
  message?: string;
  requiereVerificacion?: boolean; // Indica si se requiere verificación OTP
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
  error?: string;
}

export interface SecurityQuestionsResponse {
  questions?: Array<{
    _id: string;
    pregunta: string;
    question?: string;
  }>;
  error?: string;
}

export interface GoogleLoginResponse {
  success: boolean;
  user?: {
    _id: string;
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
}

// Helper para guardar datos de autenticacion (usando utilidades de seguridad)
const saveAuthData = (data: { token?: string; user?: unknown }) => {
  if (typeof window !== 'undefined') {
    if (data.token) {
      // ✅ Usar utilidad de seguridad para guardar token
      console.log('[Auth] Guardando token...');
      saveToken(data.token);
      console.log('[Auth] Token guardado:', localStorage.getItem('token') ? 'Sí' : 'No');
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('[Auth] Datos de usuario guardados');
      }
    } else {
      console.warn('[Auth] No se recibió token en la respuesta');
    }
  }
};

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    try {
      console.log('[Auth] Intentando login para:', email);
      const data = await apiClient.post<LoginResponse>('/api/usuarios/login', { email, password }, BACKEND_BASE);
      console.log('[Auth] Respuesta completa del backend:', JSON.stringify(data, null, 2));
      console.log('[Auth] Respuesta del backend:', { success: data.success, hasToken: !!data.token, hasUser: !!data.user });
      
      // Verificar si la respuesta tiene el formato correcto
      if (!data) {
        console.error('[Auth] La respuesta del backend está vacía');
        throw new Error('Error: No se recibió respuesta del servidor');
      }
      
      saveAuthData(data);
      
      // Verificar que el token se guardó
      const tokenVerificado = localStorage.getItem('token') || localStorage.getItem('authToken');
      console.log('[Auth] Token verificado después de guardar:', tokenVerificado ? 'Sí' : 'No');
      
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
    preguntaSeguridad: {
      pregunta: string;
      respuesta: string;
    };
    direccion: {
      calle: string;
      numero: string;
      colonia: string;
      codigoPostal: string;
      referencia?: string;
    };
    perfilCapilar: {
      tipoCabello: string;
      tieneAlergias: boolean;
      alergias?: string;
      tratamientosQuimicos: boolean;
      tratamientos?: string;
    };
    aceptaAvisoPrivacidad: boolean;
    recibePromociones: boolean;
  }): Promise<RegisterResponse> {
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const data = await apiClient.post<RegisterResponse>('/api/usuarios/registrar', registerData, BACKEND_BASE);
    // No guardar datos de autenticación si requiere verificación
    if (data.success && data.token && !data.requiereVerificacion) {
      saveAuthData(data);
    }
    return data;
  },

  async forgotPassword(_email: string, _method: 'email' | 'sms' | 'security-questions' = 'email'): Promise<ForgotPasswordResponse> {
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
        '/api/usuarios/solicitar-enlace-recuperacion',
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
        '/api/usuarios/validar-token-recuperacion',
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
    const payload = { token, email, nuevaPassword };
    console.log('[resetPassword] Enviando:', { 
      token: token ? `${token.substring(0, 10)}...` : null, 
      email, 
      nuevaPassword: nuevaPassword ? `${nuevaPassword.substring(0, 3)}...` : null,
      nuevaPasswordLength: nuevaPassword?.length 
    });
    return apiClient.post<ResetPasswordResponse>(
      '/api/usuarios/cambiar-password',
      payload,
      BACKEND_BASE
    );
  },

  async sendSMSCode(_phone: string): Promise<SMSResponse> {
    // Esta funcionalidad aún no está implementada en el backend
    return {
      success: false,
      message: 'Funcionalidad SMS aún no disponible'
    };
  },

  async verifySMSCode(_phone: string, _code: string): Promise<SMSResponse> {
    // Esta funcionalidad aún no está implementada en el backend
    return {
      success: false,
      message: 'Funcionalidad SMS aún no disponible'
    };
  },

  // ❌ DEPRECADO: Este método usa GET /api/pregunta-seguridad (solo para registro)
  // Para recuperación de contraseña, usar getUserSecurityQuestion
  async getSecurityQuestions(email: string): Promise<SecurityQuestionsResponse> {
    // Opción 1: Usar /api/pregunta-seguridad?email=... (GET)
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const data = await apiClient.get<{ success?: boolean; data?: Array<{ _id: string; pregunta: string }> }>(
      `/api/pregunta-seguridad?email=${encodeURIComponent(email)}`,
      BACKEND_BASE
    );
    
    if (data.success && data.data && data.data.length > 0) {
      return {
        questions: data.data.map(q => ({ _id: q._id, pregunta: q.pregunta }))
      };
    }
    
    // Si no hay datos, retornar array vacío
    return { questions: [] };
  },

  // ✅ NUEVO: Obtener pregunta de seguridad del usuario para recuperación de contraseña
  // Usa POST /api/usuarios/pregunta-seguridad según GUIA_FRONTEND_RECUPERACION_PASSWORD.md
  async getUserSecurityQuestion(email: string): Promise<{ success: boolean; pregunta?: string; message?: string; error?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<{ success: boolean; pregunta?: string; message?: string; error?: string }>(
        '/api/usuarios/pregunta-seguridad',
        { email },
        BACKEND_BASE
      );
      
      if (data.success && data.pregunta) {
        return {
          success: true,
          pregunta: data.pregunta,
        };
      } else {
        // Usuario no tiene pregunta (puede ser usuario de Google)
        return {
          success: false,
          message: data.message || 'No se encontró pregunta de seguridad',
          error: data.error,
        };
      }
    } catch (error: unknown) {
      console.error('Error obteniendo pregunta de seguridad del usuario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener la pregunta de seguridad';
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  },

  async verifySecurityQuestions(email: string, answers: Record<string, string>): Promise<{ success?: boolean; token?: string; error?: string }> {
    // El backend espera { email, respuesta } en /api/usuarios/verificar-respuesta
    // Necesitamos extraer la respuesta del objeto answers
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const preguntaTexto = Object.keys(answers)[0];
    const respuesta = answers[preguntaTexto];
    
    // Usar la ruta de usuarios que devuelve el token
    return apiClient.post<{ success?: boolean; token?: string; email?: string; error?: string }>(
      '/api/usuarios/verificar-respuesta',
      { email, respuesta },
      BACKEND_BASE
    );
  },

  async getAvailableSecurityQuestions() {
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const endpoint = `/api/pregunta-seguridad`;
    const data = await apiClient.get<{ success?: boolean; count?: number; data?: Array<{_id: string; pregunta: string}>; questions?: Array<{_id: string; pregunta: string}> }>(
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
    return apiClient.post<VerifyOTPResponse>(
      '/api/usuarios/verificar-otp',
      { email, codigo },
      BACKEND_BASE
    );
  },

  // Reenviar código OTP
  async resendOTPCode(email: string): Promise<ResendOTPResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    return apiClient.post<ResendOTPResponse>(
      '/api/usuarios/reenviar-codigo',
      { email },
      BACKEND_BASE
    );
  },

  // ✅ Enviar código OTP para recuperación de contraseña
  async sendPasswordRecoveryOTP(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<{ success: boolean; message?: string; error?: string }>(
        '/api/usuarios/enviar-codigo-recuperacion',
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
        '/api/usuarios/verificar-codigo-recuperacion',
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

  // ✅ Cerrar sesión (revoca token)
  async logout(): Promise<{ success: boolean; message?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.post<{ success: boolean; message?: string }>(
        '/api/auth/logout',
        {},
        BACKEND_BASE
      );
      return data;
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aún así retornar éxito para limpiar el token local
      return { success: true, message: 'Sesión cerrada' };
    }
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

  // ✅ Obtener perfil del usuario (incluye rol)
  async getProfile(): Promise<{ success: boolean; data?: { id: string; nombre: string; email: string; rol?: string }; error?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    try {
      const data = await apiClient.get<{ success: boolean; data?: { id: string; nombre: string; email: string; rol?: string }; error?: string }>(
        '/api/auth/me',
        BACKEND_BASE
      );
      return data;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener perfil';
      return { success: false, error: errorMessage };
    }
  },
};

