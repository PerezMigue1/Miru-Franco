# 📱 Guía: Actualizar Frontend para Verificación por SMS

## 📋 Resumen de Cambios en el Backend

El backend ahora soporta **dos métodos de verificación**:
- ✅ **Email** (método por defecto, funciona como antes)
- ✅ **SMS** (nuevo, opcional)

## 🔧 Cambios Necesarios en el Frontend

### 1. Agregar Selector de Método en el Registro

**Ubicación:** Componente de registro de usuario

#### Ejemplo con React/Next.js:

```jsx
import { useState } from 'react';

export default function RegistroPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    fechaNacimiento: '',
    metodoVerificacion: 'email', // ← NUEVO: Campo para elegir método
    // ... otros campos
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('https://miru-franco.onrender.com/api/usuarios/registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          metodoVerificacion: formData.metodoVerificacion, // ← Incluir método seleccionado
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar');
      }

      // ✅ Mostrar mensaje según el método usado
      if (data.metodo === 'sms') {
        alert('Código enviado a tu teléfono. Revisa tus mensajes SMS.');
      } else {
        alert('Código enviado a tu correo. Revisa tu email.');
      }

      // Redirigir a pantalla de verificación
      router.push('/verificar-codigo');
      
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... otros campos del formulario ... */}

      {/* ✅ NUEVO: Selector de método de verificación */}
      <div>
        <label>Método de verificación:</label>
        <select
          value={formData.metodoVerificacion}
          onChange={(e) => setFormData({ ...formData, metodoVerificacion: e.target.value })}
        >
          <option value="email">📧 Email</option>
          <option value="sms">📱 SMS</option>
        </select>
        <small>
          {formData.metodoVerificacion === 'sms' 
            ? 'Se enviará un código a tu teléfono: ' + formData.telefono
            : 'Se enviará un código a tu correo: ' + formData.email
          }
        </small>
      </div>

      {/* ... resto del formulario ... */}
    </form>
  );
}
```

### 2. Agregar Selector de Método en Reenvío de Código

**Ubicación:** Componente de "Reenviar código OTP"

#### Ejemplo completo:

```jsx
import { useState } from 'react';

export default function ReenviarCodigoPage() {
  const [email, setEmail] = useState('');
  const [metodoVerificacion, setMetodoVerificacion] = useState<'email' | 'sms'>('email'); // ← NUEVO
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReenviar = async (e) => {
    e.preventDefault();
    
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('https://miru-franco.onrender.com/api/usuarios/reenviar-codigo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          metodoVerificacion, // ← NUEVO: Incluir método seleccionado
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al reenviar código');
      }

      // ✅ Mostrar mensaje según el método
      setSuccess(true);
      if (data.metodo === 'sms') {
        setError('');
        alert('Nuevo código enviado a tu teléfono. Revisa tus mensajes SMS.');
      } else {
        setError('');
        alert('Nuevo código enviado a tu correo. Revisa tu email.');
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleReenviar}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      {/* ✅ NUEVO: Selector de método */}
      <div>
        <label>Método de verificación:</label>
        <select
          value={metodoVerificacion}
          onChange={(e) => setMetodoVerificacion(e.target.value as 'email' | 'sms')}
          disabled={loading}
        >
          <option value="email">📧 Email</option>
          <option value="sms">📱 SMS</option>
        </select>
        <small>
          {metodoVerificacion === 'sms' 
            ? 'Se enviará un código a tu teléfono registrado'
            : 'Se enviará un código a tu correo electrónico'
          }
        </small>
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>Código reenviado exitosamente</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Reenviar código'}
      </button>
    </form>
  );
}
```

### 3. Actualizar Mensajes de Éxito

**Ubicación:** Pantalla de verificación de código

Actualiza los mensajes para reflejar si el código llegó por Email o SMS:

```jsx
export default function VerificarCodigoPage() {
  const [codigo, setCodigo] = useState('');
  const [metodo, setMetodo] = useState<'email' | 'sms'>('email'); // Recibir del estado anterior

  // ... lógica de verificación ...

  return (
    <div>
      <h2>Verificar código</h2>
      
      {/* ✅ Mensaje dinámico según el método */}
      <p>
        {metodo === 'sms' 
          ? 'Ingresa el código de 6 dígitos enviado a tu teléfono'
          : 'Ingresa el código de 6 dígitos enviado a tu correo'
        }
      </p>

      <input
        type="text"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        maxLength={6}
        placeholder="123456"
      />

      {/* ... resto del componente ... */}
    </div>
  );
}
```

### 4. Ejemplo Completo con Manejo de Estado Global

Si usas Context API o Redux, puedes guardar el método seleccionado:

```jsx
// Context o Redux Store
const [verificacionState, setVerificacionState] = useState({
  metodo: 'email', // 'email' | 'sms'
  email: '',
  telefono: '',
});

// En el componente de registro
const handleRegistro = async () => {
  const response = await fetch('/api/usuarios/registro', {
    method: 'POST',
    body: JSON.stringify({
      ...formData,
      metodoVerificacion: verificacionState.metodo,
    }),
  });

  const data = await response.json();
  
  // Guardar método usado para mostrar en pantalla de verificación
  setVerificacionState({
    ...verificacionState,
    metodo: data.metodo || 'email',
  });

  // Redirigir a verificación
  router.push('/verificar-codigo');
};
```

## 📝 Checklist de Implementación

### Para el Frontend:

- [ ] **Agregar selector de método** en el formulario de registro
- [ ] **Agregar selector de método** en el formulario de reenvío de código
- [ ] **Incluir `metodoVerificacion`** en el body de las peticiones
- [ ] **Actualizar mensajes** para mencionar "teléfono" o "correo" según el método
- [ ] **Manejar respuesta del backend** que incluye `metodo: 'email' | 'sms'`
- [ ] **Validar que el teléfono esté presente** si se selecciona SMS
- [ ] **Mostrar mensaje de éxito** según el método usado

### Mejoras Opcionales (UX):

- [ ] Mostrar icono 📧 o 📱 según el método seleccionado
- [ ] Deshabilitar SMS si el teléfono no está completo
- [ ] Guardar preferencia del usuario (localStorage)
- [ ] Mostrar costo estimado de SMS (si aplica)
- [ ] Validar formato de teléfono antes de enviar

## 🧪 Cómo Probar

### Prueba 1: Registro con Email (Comportamiento Actual)

1. Ve a la pantalla de registro
2. Selecciona "Email" como método
3. Completa el formulario
4. **Resultado esperado:**
   - Código enviado por email
   - Mensaje: "Código enviado a tu correo"

### Prueba 2: Registro con SMS (Nuevo)

1. Ve a la pantalla de registro
2. Selecciona "SMS" como método
3. Completa el formulario (asegúrate de tener teléfono válido)
4. **Resultado esperado:**
   - Código enviado por SMS (si Twilio está configurado)
   - Mensaje: "Código enviado a tu teléfono"

### Prueba 3: Reenvío con SMS

1. Ve a la pantalla de "Reenviar código"
2. Ingresa tu email
3. Selecciona "SMS" como método
4. Haz clic en "Reenviar código"
5. **Resultado esperado:**
   - Código enviado por SMS
   - Mensaje: "Nuevo código enviado a tu teléfono"

## 📊 Estructura de Respuestas del Backend

### Registro Exitoso con Email:

```json
{
  "success": true,
  "message": "Ingresa el código para activar tu cuenta. El código expira en 2 minutos.",
  "requiereVerificacion": true,
  "metodo": "email"
}
```

### Registro Exitoso con SMS:

```json
{
  "success": true,
  "message": "Ingresa el código enviado a tu teléfono para activar tu cuenta. El código expira en 2 minutos.",
  "requiereVerificacion": true,
  "metodo": "sms"
}
```

### Reenvío Exitoso con Email:

```json
{
  "success": true,
  "message": "Nuevo código enviado al correo. Recuerda que el código expira en 2 minutos.",
  "metodo": "email"
}
```

### Reenvío Exitoso con SMS:

```json
{
  "success": true,
  "message": "Nuevo código enviado a tu teléfono. Recuerda que el código expira en 2 minutos.",
  "metodo": "sms"
}
```

## 💡 Ejemplo de UI Mejorada

```jsx
export default function SelectorMetodoVerificacion({ value, onChange, telefono, email }) {
  return (
    <div style={{ margin: '20px 0' }}>
      <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
        ¿Cómo quieres recibir tu código de verificación?
      </label>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Opción Email */}
        <label
          style={{
            flex: 1,
            padding: '15px',
            border: value === 'email' ? '2px solid #710014' : '2px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: value === 'email' ? '#f8f8f8' : 'white',
          }}
        >
          <input
            type="radio"
            value="email"
            checked={value === 'email'}
            onChange={(e) => onChange(e.target.value)}
            style={{ marginRight: '10px' }}
          />
          <div>
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>📧</div>
            <div style={{ fontWeight: 'bold' }}>Email</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {email}
            </div>
          </div>
        </label>

        {/* Opción SMS */}
        <label
          style={{
            flex: 1,
            padding: '15px',
            border: value === 'sms' ? '2px solid #710014' : '2px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: value === 'sms' ? '#f8f8f8' : 'white',
            opacity: !telefono ? 0.5 : 1,
          }}
          title={!telefono ? 'Teléfono requerido para SMS' : ''}
        >
          <input
            type="radio"
            value="sms"
            checked={value === 'sms'}
            onChange={(e) => onChange(e.target.value)}
            disabled={!telefono}
            style={{ marginRight: '10px' }}
          />
          <div>
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>📱</div>
            <div style={{ fontWeight: 'bold' }}>SMS</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {telefono || 'Teléfono no disponible'}
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
```

## 🔍 Validaciones Recomendadas

```jsx
const validarFormulario = (formData) => {
  const errores = {};

  // Si se selecciona SMS, validar que el teléfono esté presente
  if (formData.metodoVerificacion === 'sms') {
    if (!formData.telefono || formData.telefono.trim() === '') {
      errores.telefono = 'El teléfono es requerido para recibir códigos por SMS';
    }
    
    // Validar formato de teléfono (opcional)
    const telefonoRegex = /^\+?[1-9]\d{1,14}$/;
    if (formData.telefono && !telefonoRegex.test(formData.telefono.replace(/\s/g, ''))) {
      errores.telefono = 'Formato de teléfono inválido. Debe incluir código de país (ej: +521234567890)';
    }
  }

  return errores;
};
```

## 📚 Resumen de Cambios

| Componente | Cambio Requerido |
|------------|------------------|
| **Formulario de Registro** | Agregar selector de método (`email` o `sms`) |
| **Formulario de Reenvío** | Agregar selector de método |
| **Body de Peticiones** | Incluir `metodoVerificacion` en JSON |
| **Mensajes de Éxito** | Mostrar según método usado |
| **Pantalla de Verificación** | Mensaje dinámico según método |

## ✅ Resumen

1. **Agregar selector** de método (Email/SMS) en registro y reenvío
2. **Incluir `metodoVerificacion`** en las peticiones al backend
3. **Actualizar mensajes** para reflejar el método usado
4. **Validar teléfono** si se selecciona SMS
5. **Manejar respuesta** del backend que incluye `metodo`

El backend ya está listo. Solo necesitas agregar la UI para que el usuario pueda elegir el método de verificación.

