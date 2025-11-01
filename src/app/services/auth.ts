// Cambia esta URL por la URL de tu backend en producción
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/auth';

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

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    if (data.token) {
      // Guardar token en localStorage
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }

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
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al registrar usuario');
    }

    if (data.token) {
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }

    return data;
  },

  async forgotPassword(email: string, method: 'email' | 'sms' | 'security-questions' = 'email') {
    const response = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, method }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al enviar solicitud de recuperación');
    }

    return data;
  },

  async resetPassword(token: string | null, email: string | null, password: string) {
    const response = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al restablecer contraseña');
    }

    return data;
  },

  async sendSMSCode(phone: string) {
    const response = await fetch(`${API_BASE}/verify-sms`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al enviar código SMS');
    }

    return data;
  },

  async verifySMSCode(phone: string, code: string) {
    const response = await fetch(`${API_BASE}/verify-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, code }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al verificar código');
    }

    return data;
  },

  async getSecurityQuestions(email: string) {
    const response = await fetch(`${API_BASE}/verify-security-questions?email=${encodeURIComponent(email)}`, {
      method: 'GET',
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al obtener preguntas de seguridad');
    }

    return data;
  },

  async verifySecurityQuestions(email: string, answers: Record<string, string>) {
    const response = await fetch(`${API_BASE}/verify-security-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, answers }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al verificar respuestas');
    }

    return data;
  },

  async getAvailableSecurityQuestions() {
    try {
      const response = await fetch(`${API_BASE}/security-questions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Verificar si la respuesta es OK antes de parsear JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `Error ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Log para debugging
      console.log('Respuesta de security-questions:', data);

      // La respuesta puede venir como un array directo o como { questions: [...] }
      // Normalizamos para que siempre sea un array
      if (Array.isArray(data)) {
        return { questions: data };
      } else if (data.questions && Array.isArray(data.questions)) {
        return data;
      } else if (data.preguntas && Array.isArray(data.preguntas)) {
        // Si viene como 'preguntas' en lugar de 'questions'
        return { questions: data.preguntas };
      } else {
        console.warn('Formato de respuesta inesperado:', data);
        return { questions: [] };
      }
    } catch (error) {
      console.error('Error en getAvailableSecurityQuestions:', error);
      throw error;
    }
  },
};

