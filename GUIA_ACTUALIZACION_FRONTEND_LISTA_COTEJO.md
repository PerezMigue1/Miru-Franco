# 🚀 Guía de Actualización del Frontend - Lista de Cotejo Implementada

Esta guía te muestra cómo actualizar tu frontend para aprovechar todas las funcionalidades de seguridad implementadas en el backend según la lista de cotejo.

---

## 📋 Resumen de Funcionalidades Implementadas

### ✅ Implementado y Requiere Actualización del Frontend

1. **Validación de datos de entrada** - El backend sanitiza automáticamente
2. **Verificación de correo electrónico** - OTP con expiración de 2 minutos
3. **Requisitos de complejidad de contraseña** - Validación estricta
4. **Recuperación de contraseña** - Con expiración de 15 minutos
5. **Bloqueo por fuerza bruta** - 5 intentos = bloqueo 15 minutos
6. **Sesiones expiradas por inactividad** - 15 minutos sin actividad
7. **Revocación de sesiones activas** - Logout invalida tokens
8. **Tokens JWT seguros** - Con renovación automática
9. **OAuth2.0 seguro** - Google OAuth implementado
10. **Protección XSS** - Sanitización automática
11. **Headers de seguridad HTTP** - Configurados automáticamente
12. **Logging seguro** - No expone datos sensibles

---

## 1. ✅ Validación de Contraseñas - Requisitos de Complejidad

### Cambios en el Backend
El backend ahora rechaza contraseñas que no cumplan:
- Mínimo 8 caracteres
- Al menos una letra mayúscula
- Al menos una letra minúscula
- Al menos un número

### Actualización del Frontend

**Antes:**
```typescript
// Validación básica o sin validación
const password = e.target.value;
setPassword(password);
```

**Después:**
```typescript
// Validación en tiempo real
const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una letra mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Debe incluir al menos una letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Debe incluir al menos un número');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Usar en formulario
const [password, setPassword] = useState('');
const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setPassword(value);
  
  const validation = validatePassword(value);
  setPasswordErrors(validation.errors);
};

// Mostrar errores
{passwordErrors.length > 0 && (
  <div className="password-errors">
    {passwordErrors.map((error, i) => (
      <p key={i} className="error-text">{error}</p>
    ))}
  </div>
)}
```

**Mensajes de Error del Backend:**
```typescript
// El backend devuelve este mensaje si la contraseña es débil:
{
  "statusCode": 400,
  "message": [
    "La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número"
  ]
}
```

---

## 2. ✅ Verificación de Correo Electrónico (OTP)

### Flujo Completo

```typescript
// 1. Registro de usuario
const handleRegister = async (formData: RegisterForm) => {
  try {
    const response = await fetch(`${API_URL}/api/usuarios/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Usuario registrado, pero NO confirmado
      // Redirigir a pantalla de verificación
      router.push(`/verificar-correo?email=${formData.email}`);
    } else {
      setError(data.message || 'Error al registrar');
    }
  } catch (error) {
    setError('Error al registrar usuario');
  }
};

// 2. Pantalla de verificación OTP
function VerificarCorreoPage() {
  const [codigoOTP, setCodigoOTP] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
  }, []);
  
  const handleVerificar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/usuarios/verificar-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigoOTP }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Correo verificado, redirigir a login
        alert('Correo verificado exitosamente. Ya puedes iniciar sesión.');
        router.push('/login');
      } else {
        if (data.message?.includes('expirado')) {
          setError('El código ha expirado. Solicita uno nuevo.');
        } else if (data.message?.includes('incorrecto')) {
          setError('Código incorrecto. Intenta nuevamente.');
        } else {
          setError(data.message || 'Error al verificar');
        }
      }
    } catch (error) {
      setError('Error al verificar código');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReenviar = async () => {
    try {
      const response = await fetch(`${API_URL}/api/usuarios/reenviar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        alert('Código reenviado. Revisa tu correo.');
      }
    } catch (error) {
      alert('Error al reenviar código');
    }
  };
  
  return (
    <form onSubmit={handleVerificar}>
      <h2>Verifica tu correo electrónico</h2>
      <p>Ingresa el código de 6 dígitos enviado a {email}</p>
      
      {error && <div className="error">{error}</div>}
      
      <input
        type="text"
        value={codigoOTP}
        onChange={(e) => setCodigoOTP(e.target.value)}
        placeholder="Código OTP"
        maxLength={6}
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Verificando...' : 'Verificar'}
      </button>
      
      <button type="button" onClick={handleReenviar}>
        Reenviar código
      </button>
      
      <p className="info">
        ⏱️ El código expira en 2 minutos
      </p>
    </form>
  );
}

// 3. Bloquear login si no está verificado
const handleLogin = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/api/usuarios/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    if (data.message?.includes('verificar') || data.message?.includes('confirmado')) {
      // Usuario no ha verificado correo
      router.push(`/verificar-correo?email=${email}`);
      return;
    }
    setError(data.message || 'Credenciales inválidas');
  } else {
    // Login exitoso
    localStorage.setItem('authToken', data.token);
    router.push('/dashboard');
  }
};
```

---

## 3. ✅ Bloqueo por Fuerza Bruta

### Manejo en el Frontend

```typescript
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/api/usuarios/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('authToken', data.token);
      router.push('/dashboard');
    } else {
      // Manejar diferentes tipos de errores
      if (data.message?.includes('bloqueada')) {
        // Extraer tiempo de bloqueo del mensaje
        const match = data.message.match(/(\d+) minutos/);
        const minutos = match ? match[1] : '15';
        
        setError(
          `Tu cuenta está bloqueada temporalmente por múltiples intentos fallidos. ` +
          `Intenta de nuevo en ${minutos} minutos.`
        );
        
        // Deshabilitar formulario
        setFormDisabled(true);
        
        // Habilitar después del tiempo de bloqueo
        setTimeout(() => {
          setFormDisabled(false);
          setError('');
        }, parseInt(minutos) * 60 * 1000);
      } else {
        setError(data.message || 'Credenciales inválidas');
      }
    }
  } catch (error) {
    setError('Error al iniciar sesión');
  }
};
```

**Mensaje del Backend cuando está bloqueado:**
```json
{
  "statusCode": 403,
  "message": "Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en 15 minutos."
}
```

---

## 4. ✅ Sesiones Expiradas por Inactividad

### Implementación Completa

```typescript
// Cliente API configurado
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://miru-franco.onrender.com';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de request: agregar token y renovar si es necesario
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Verificar si necesita renovación
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        const lastActivity = tokenData.lastActivity || tokenData.iat;
        const timeSinceActivity = now - lastActivity;
        
        // Si han pasado más de 10 minutos, renovar token
        if (timeSinceActivity > 10 * 60) {
          const refreshResponse = await axios.post(
            `${API_URL}/api/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (refreshResponse.data.token) {
            localStorage.setItem('authToken', refreshResponse.data.token);
            config.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
          }
        }
      } catch (error) {
        // Ignorar errores de decodificación
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de response: manejar sesiones expiradas
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const message = error.response?.data?.message || '';
      
      if (message.includes('inactividad') || message.includes('expirada')) {
        // Sesión expirada por inactividad
        localStorage.removeItem('authToken');
        
        // Mostrar mensaje y redirigir
        alert('Tu sesión expiró por inactividad. Por favor inicia sesión nuevamente.');
        window.location.href = '/login?reason=inactivity';
      } else if (message.includes('revocado')) {
        // Token revocado (logout desde otro dispositivo)
        localStorage.removeItem('authToken');
        window.location.href = '/login?reason=revoked';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Hook de Renovación Automática (React)

```typescript
import { useEffect, useRef } from 'react';

export function useAutoRefreshToken() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    const refreshToken = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('authToken', data.token);
        } else {
          // Token inválido, limpiar y redirigir
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error renovando token:', error);
      }
    };
    
    // Renovar cada 10 minutos
    intervalRef.current = setInterval(refreshToken, 10 * 60 * 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
```

**Usar en App:**
```typescript
function App() {
  useAutoRefreshToken();
  // ... resto del código
}
```

---

## 5. ✅ Revocación de Sesiones Activas (Logout)

### Actualización del Logout

**Antes:**
```typescript
const logout = () => {
  localStorage.removeItem('authToken');
  router.push('/login');
};
```

**Después:**
```typescript
const logout = async () => {
  const token = localStorage.getItem('authToken');
  
  // Llamar al endpoint de logout para revocar el token
  if (token) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Continuar con el logout local aunque falle el servidor
    }
  }
  
  // Limpiar token local
  localStorage.removeItem('authToken');
  
  // Redirigir al login
  router.push('/login');
};
```

**Endpoint:**
```
POST /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { "success": true, "message": "Sesión cerrada correctamente" }
```

---

## 6. ✅ Recuperación de Contraseña con Expiración

### Flujo Completo Actualizado

```typescript
// Paso 1: Obtener pregunta de seguridad
const obtenerPregunta = async (email: string) => {
  try {
    const response = await fetch(`${API_URL}/api/usuarios/pregunta-seguridad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        success: true,
        pregunta: data.pregunta,
      };
    } else {
      return {
        success: false,
        error: data.message || 'Error al obtener pregunta',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Error al obtener pregunta de seguridad',
    };
  }
};

// Paso 2: Verificar respuesta (obtiene token con expiración de 15 min)
const verificarRespuesta = async (email: string, respuesta: string) => {
  try {
    const response = await fetch(`${API_URL}/api/usuarios/verificar-respuesta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, respuesta }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Guardar token temporal (expira en 15 minutos)
      localStorage.setItem('resetPasswordToken', data.token);
      localStorage.setItem('resetPasswordEmail', email);
      localStorage.setItem('resetPasswordExpires', String(Date.now() + 15 * 60 * 1000));
      
      return {
        success: true,
        token: data.token,
      };
    } else {
      return {
        success: false,
        error: data.message || 'Respuesta incorrecta',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Error al verificar respuesta',
    };
  }
};

// Paso 3: Cambiar contraseña (usar token antes de que expire)
const cambiarPassword = async (nuevaPassword: string) => {
  const token = localStorage.getItem('resetPasswordToken');
  const email = localStorage.getItem('resetPasswordEmail');
  const expires = localStorage.getItem('resetPasswordExpires');
  
  if (!token || !email) {
    return {
      success: false,
      error: 'Token no encontrado. Por favor inicia el proceso nuevamente.',
    };
  }
  
  // Verificar si el token expiró
  if (expires && Date.now() > parseInt(expires)) {
    localStorage.removeItem('resetPasswordToken');
    localStorage.removeItem('resetPasswordEmail');
    localStorage.removeItem('resetPasswordExpires');
    
    return {
      success: false,
      error: 'El token ha expirado. Por favor inicia el proceso nuevamente.',
    };
  }
  
  try {
    const response = await fetch(`${API_URL}/api/usuarios/cambiar-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        token,
        nuevaPassword,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Limpiar tokens temporales
      localStorage.removeItem('resetPasswordToken');
      localStorage.removeItem('resetPasswordEmail');
      localStorage.removeItem('resetPasswordExpires');
      
      return {
        success: true,
        message: 'Contraseña actualizada exitosamente',
      };
    } else {
      if (data.message?.includes('expirado')) {
        return {
          success: false,
          error: 'El token ha expirado. Por favor inicia el proceso nuevamente.',
        };
      }
      return {
        success: false,
        error: data.message || 'Error al cambiar contraseña',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Error al cambiar contraseña',
    };
  }
};
```

### Componente de Recuperación Completo

```typescript
function RecuperarPasswordPage() {
  const [step, setStep] = useState<'email' | 'pregunta' | 'cambiar'>('email');
  const [email, setEmail] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // Timer para mostrar tiempo restante del token
  useEffect(() => {
    if (step === 'cambiar') {
      const expires = localStorage.getItem('resetPasswordExpires');
      if (expires) {
        const interval = setInterval(() => {
          const remaining = Math.max(0, parseInt(expires) - Date.now());
          setTimeRemaining(Math.floor(remaining / 1000));
          
          if (remaining <= 0) {
            setError('El token ha expirado. Por favor inicia el proceso nuevamente.');
            setStep('email');
          }
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [step]);
  
  const handleObtenerPregunta = async () => {
    setLoading(true);
    setError('');
    
    const result = await obtenerPregunta(email);
    
    if (result.success) {
      setPregunta(result.pregunta);
      setStep('pregunta');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };
  
  const handleVerificarRespuesta = async () => {
    setLoading(true);
    setError('');
    
    const result = await verificarRespuesta(email, respuesta);
    
    if (result.success) {
      setStep('cambiar');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };
  
  const handleCambiarPassword = async () => {
    setLoading(true);
    setError('');
    
    const result = await cambiarPassword(nuevaPassword);
    
    if (result.success) {
      alert('Contraseña actualizada exitosamente');
      router.push('/login');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };
  
  return (
    <div>
      {step === 'email' && (
        <div>
          <h2>Recuperar Contraseña</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <button onClick={handleObtenerPregunta} disabled={loading}>
            {loading ? 'Cargando...' : 'Continuar'}
          </button>
        </div>
      )}
      
      {step === 'pregunta' && (
        <div>
          <h2>Responde tu pregunta de seguridad</h2>
          <p>{pregunta}</p>
          <input
            type="text"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Tu respuesta"
          />
          <button onClick={handleVerificarRespuesta} disabled={loading}>
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </div>
      )}
      
      {step === 'cambiar' && (
        <div>
          <h2>Nueva Contraseña</h2>
          {timeRemaining !== null && (
            <p className="timer">
              ⏱️ Tiempo restante: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </p>
          )}
          <input
            type="password"
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            placeholder="Nueva contraseña"
          />
          <button onClick={handleCambiarPassword} disabled={loading}>
            {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

---

## 7. ✅ Manejo de Errores Mejorado

### Interceptor Global de Errores

```typescript
// Agregar al apiClient
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || '';
    
    switch (status) {
      case 401:
        if (message.includes('inactividad') || message.includes('expirada')) {
          localStorage.removeItem('authToken');
          window.location.href = '/login?reason=inactivity';
        } else if (message.includes('revocado')) {
          localStorage.removeItem('authToken');
          window.location.href = '/login?reason=revoked';
        } else if (message.includes('verificar') || message.includes('confirmado')) {
          // Usuario no ha verificado correo
          const email = error.config?.data ? JSON.parse(error.config.data).email : '';
          window.location.href = `/verificar-correo?email=${email}`;
        }
        break;
        
      case 403:
        if (message.includes('bloqueada')) {
          // Cuenta bloqueada por fuerza bruta
          alert(message);
        } else if (message.includes('permisos')) {
          // Sin permisos (RBAC)
          alert('No tienes permisos para realizar esta acción');
        }
        break;
        
      case 429:
        // Rate limit excedido
        alert('Demasiados intentos. Por favor espera un momento.');
        break;
        
      case 400:
        // Errores de validación
        if (Array.isArray(message)) {
          // Múltiples errores de validación
          return Promise.reject({ validationErrors: message });
        }
        break;
    }
    
    return Promise.reject(error);
  }
);
```

---

## 8. ✅ OAuth2.0 con Google

### Implementación

```typescript
const handleGoogleLogin = () => {
  // Redirigir al endpoint de Google OAuth
  window.location.href = `${API_URL}/api/auth/google`;
};

// Callback después de autenticación
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const success = urlParams.get('success');
  const error = urlParams.get('error');
  
  if (success === 'true' && token) {
    // Guardar token y redirigir
    localStorage.setItem('authToken', token);
    router.push('/dashboard');
  } else if (error) {
    // Mostrar error
    setError(decodeURIComponent(error));
  }
}, []);
```

---

## 9. ✅ Validación de Datos de Entrada

### El Backend Sanitiza Automáticamente

El backend ya sanitiza todos los datos de entrada, pero puedes agregar validación adicional en el frontend:

```typescript
// Sanitizar entrada antes de enviar
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '');
};

// Usar en formularios
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  const sanitizedData = {
    nombre: sanitizeInput(formData.nombre),
    email: sanitizeInput(formData.email).toLowerCase(),
    // ...
  };
  
  // Enviar al backend
  fetch(`${API_URL}/api/usuarios/registrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitizedData),
  });
};
```

---

## 10. ✅ Sistema de Roles (RBAC) - Preparación

### Verificar Rol del Usuario

```typescript
const getUserProfile = async () => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data; // { id, nombre, email, rol, ... }
    }
  } catch (error) {
    console.error('Error al obtener perfil:', error);
  }
  
  return null;
};

// Componente que verifica si es admin
function AdminOnly({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    getUserProfile().then((profile) => {
      setIsAdmin(profile?.rol === 'admin');
      setLoading(false);
    });
  }, []);
  
  if (loading) return <div>Cargando...</div>;
  if (!isAdmin) return <div>No tienes permisos para acceder a esta sección</div>;
  
  return <>{children}</>;
}

// Usar
<AdminOnly>
  <AdminPanel />
</AdminOnly>
```

---

## 📋 Checklist de Actualización

- [ ] **Validación de contraseñas** - Agregar validación en tiempo real
- [ ] **Verificación de correo** - Implementar flujo completo de OTP
- [ ] **Bloqueo por fuerza bruta** - Manejar mensajes de cuenta bloqueada
- [ ] **Sesiones expiradas** - Implementar renovación automática de tokens
- [ ] **Logout mejorado** - Llamar a endpoint `/api/auth/logout`
- [ ] **Recuperación de contraseña** - Manejar expiración de tokens (15 min)
- [ ] **Manejo de errores** - Interceptores para 401, 403, 429
- [ ] **OAuth Google** - Manejar callback y guardar token
- [ ] **Sanitización** - Validar datos antes de enviar (opcional, backend ya lo hace)
- [ ] **Roles** - Verificar rol del usuario si hay contenido admin

---

## 🔗 Endpoints Disponibles

### Autenticación
- `POST /api/usuarios/registrar` - Registrar usuario
- `POST /api/usuarios/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión (revoca token)
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/me` - Obtener perfil (incluye rol)
- `GET /api/auth/google` - Iniciar OAuth con Google

### Verificación
- `POST /api/usuarios/verificar-otp` - Verificar código OTP
- `POST /api/usuarios/reenviar-codigo` - Reenviar código OTP

### Recuperación
- `POST /api/usuarios/pregunta-seguridad` - Obtener pregunta
- `POST /api/usuarios/verificar-respuesta` - Verificar respuesta (obtiene token)
- `POST /api/usuarios/cambiar-password` - Cambiar contraseña con token

---

## 🎯 Resumen de Cambios Principales

1. **Contraseñas**: Validar en tiempo real (8+ chars, mayúscula, minúscula, número)
2. **OTP**: Flujo completo de verificación con expiración de 2 minutos
3. **Fuerza bruta**: Mostrar mensaje cuando cuenta está bloqueada
4. **Inactividad**: Renovar tokens automáticamente cada 10 minutos
5. **Logout**: Llamar a endpoint para revocar token
6. **Recuperación**: Manejar expiración de tokens (15 minutos)
7. **Errores**: Interceptores para manejar todos los casos
8. **OAuth**: Manejar callback de Google
9. **Roles**: Verificar rol del usuario para contenido admin

---

## 📚 Ejemplo Completo: Cliente API Configurado

Ver archivo `GUIA_ACTUALIZACION_FRONTEND_SEGURIDAD.md` para un ejemplo completo de cliente API con todos los interceptores configurados.

---

¡Con estos cambios, tu frontend estará completamente actualizado con todas las medidas de seguridad implementadas en el backend!

