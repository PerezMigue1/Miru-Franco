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

  async register(name: string, email: string, password: string, phone?: string): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, phone }),
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
};

