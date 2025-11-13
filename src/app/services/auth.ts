import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface LoginResponse {
  success: boolean;
  user?: {
    _id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
  requiereVerificacion?: boolean;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: {
    _id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
  requiereVerificacion?: boolean;
}

export interface VerifyEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ResendVerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
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

// Helper para guardar datos de autenticacion
const saveAuthData = (data: { token?: string; user?: unknown }) => {
  if (typeof window !== 'undefined') {
    if (data.token) {
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
  }
};

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const BACKEND_BASE = getBackendBaseUrl(); // Calculado en runtime
    const data = await apiClient.post<LoginResponse>('/api/usuarios/login', { email, password }, BACKEND_BASE);
    saveAuthData(data);
    return data;
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

  async verifyEmail(token: string, email: string): Promise<VerifyEmailResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    return apiClient.get<VerifyEmailResponse>(
      `/api/usuarios/verificar-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
      BACKEND_BASE
    );
  },

  async resendVerificationEmail(email: string): Promise<ResendVerificationResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    return apiClient.post<ResendVerificationResponse>(
      '/api/usuarios/reenviar-verificacion',
      { email },
      BACKEND_BASE
    );
  },
};

