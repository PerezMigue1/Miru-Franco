import { apiClient } from './client';
import { BACKEND_BASE } from './config';

export interface LoginResponse {
  success: boolean;
  user?: {
    _id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
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
    const data = await apiClient.post<RegisterResponse>('/api/usuarios', registerData, BACKEND_BASE);
    saveAuthData(data);
    return data;
  },

  async forgotPassword(email: string, method: 'email' | 'sms' | 'security-questions' = 'email'): Promise<ForgotPasswordResponse> {
    return apiClient.post<ForgotPasswordResponse>('/forgot-password', { email, method });
  },

  async resetPassword(token: string | null, email: string | null, password: string): Promise<ResetPasswordResponse> {
    return apiClient.post<ResetPasswordResponse>('/reset-password', { token, email, password });
  },

  async sendSMSCode(phone: string): Promise<SMSResponse> {
    return apiClient.put<SMSResponse>('/verify-sms', { phone });
  },

  async verifySMSCode(phone: string, code: string): Promise<SMSResponse> {
    return apiClient.post<SMSResponse>('/verify-sms', { phone, code });
  },

  async getSecurityQuestions(email: string): Promise<SecurityQuestionsResponse> {
    return apiClient.get<SecurityQuestionsResponse>(`/verify-security-questions?email=${encodeURIComponent(email)}`);
  },

  async verifySecurityQuestions(email: string, answers: Record<string, string>): Promise<{ success?: boolean; token?: string; error?: string }> {
    return apiClient.post<{ success?: boolean; token?: string; error?: string }>('/verify-security-questions', { email, answers });
  },

  async getAvailableSecurityQuestions() {
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
    const redirectUrl = `${BACKEND_BASE}/api/auth/google`;
    window.location.href = redirectUrl;
    // Nota: Este método no retorna inmediatamente ya que redirige
    return { success: false, error: 'Redirecting to Google' };
  },
};

