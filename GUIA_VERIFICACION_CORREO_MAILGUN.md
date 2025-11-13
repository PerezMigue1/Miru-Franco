# Guía: Verificación de Correo Electrónico con Mailgun

## 📋 ¿Qué es Mailgun?

Mailgun es un servicio de envío de correos electrónicos transaccionales que permite enviar emails de verificación, confirmación y notificaciones de forma confiable.

## 🔄 Flujo de Verificación de Correo

```
1. Usuario se registra → Backend crea cuenta con emailVerificado: false
2. Backend genera token de verificación único
3. Backend envía email con link de verificación usando Mailgun
4. Usuario hace clic en el link → Frontend verifica el token
5. Backend marca emailVerificado: true
6. Usuario puede iniciar sesión normalmente
```

## 🛠️ Implementación

### Backend (Node.js/Express)

#### 1. Instalar dependencias

```bash
npm install mailgun.js crypto
```

#### 2. Configurar Mailgun

```javascript
// config/mailgun.js
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY, // Tu API key de Mailgun
});

const DOMAIN = process.env.MAILGUN_DOMAIN; // Tu dominio verificado en Mailgun

module.exports = { mg, DOMAIN };
```

#### 3. Modelo de Usuario - Agregar campos de verificación

```javascript
// models/Usuario.js
const UsuarioSchema = new mongoose.Schema({
  // ... otros campos ...
  email: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  emailVerificado: { 
    type: Boolean, 
    default: false 
  },
  emailVerificacionToken: { 
    type: String, 
    default: null 
  },
  emailVerificacionExpira: { 
    type: Date, 
    default: null 
  },
  // ... resto de campos ...
});
```

#### 4. Generar token de verificación

```javascript
// utils/emailVerification.js
const crypto = require('crypto');

function generarTokenVerificacion() {
  return crypto.randomBytes(32).toString('hex');
}

function generarLinkVerificacion(token, email) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/verificar-email?token=${token}&email=${encodeURIComponent(email)}`;
}

module.exports = {
  generarTokenVerificacion,
  generarLinkVerificacion
};
```

#### 5. Enviar email de verificación

```javascript
// services/emailService.js
const { mg, DOMAIN } = require('../config/mailgun');
const { generarLinkVerificacion } = require('../utils/emailVerification');

async function enviarEmailVerificacion(email, token) {
  const verificationLink = generarLinkVerificacion(token, email);
  
  const data = {
    from: 'Miru Franco Beauty Salón <noreply@tudominio.com>',
    to: email,
    subject: 'Verifica tu correo electrónico - Miru Franco',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #710014; color: #F2F1ED; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #710014; 
            color: #F2F1ED; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Miru Franco Beauty Salón</h1>
          </div>
          <div class="content">
            <h2>¡Bienvenido/a!</h2>
            <p>Gracias por registrarte en Miru Franco Beauty Salón.</p>
            <p>Para completar tu registro, por favor verifica tu correo electrónico haciendo clic en el siguiente botón:</p>
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">Verificar Correo Electrónico</a>
            </div>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #710014;">${verificationLink}</p>
            <p><strong>Este enlace expirará en 24 horas.</strong></p>
            <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Miru Franco Beauty Salón. Todos los derechos reservados.</p>
            <p>Segunda Cerrada de Allende No. 15, Colonia Juárez, Huejutla de Reyes, Hidalgo</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      ¡Bienvenido/a a Miru Franco Beauty Salón!
      
      Gracias por registrarte. Para completar tu registro, verifica tu correo electrónico visitando este enlace:
      
      ${verificationLink}
      
      Este enlace expirará en 24 horas.
      
      Si no creaste esta cuenta, puedes ignorar este correo.
    `
  };

  try {
    const response = await mg.messages.create(DOMAIN, data);
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error enviando email:', error);
    throw new Error('Error al enviar el email de verificación');
  }
}

module.exports = {
  enviarEmailVerificacion
};
```

#### 6. Modificar el controlador de registro

```javascript
// controllers/userController.js
const Usuario = require('../models/Usuario');
const { generarTokenVerificacion } = require('../utils/emailVerification');
const { enviarEmailVerificacion } = require('../services/emailService');

exports.registrar = async (req, res) => {
  try {
    const { nombre, email, password, telefono, fechaNacimiento, /* ... otros campos */ } = req.body;

    // Verificar si el email ya existe
    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(400).json({ 
        success: false, 
        error: 'Este correo electrónico ya está registrado' 
      });
    }

    // Generar token de verificación
    const tokenVerificacion = generarTokenVerificacion();
    const fechaExpiracion = new Date();
    fechaExpiracion.setHours(fechaExpiracion.getHours() + 24); // Expira en 24 horas

    // Crear nuevo usuario
    const nuevoUsuario = new Usuario({
      nombre,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      telefono,
      fechaNacimiento,
      emailVerificado: false,
      emailVerificacionToken: tokenVerificacion,
      emailVerificacionExpira: fechaExpiracion,
      // ... otros campos ...
    });

    await nuevoUsuario.save();

    // Enviar email de verificación
    try {
      await enviarEmailVerificacion(email, tokenVerificacion);
    } catch (emailError) {
      console.error('Error enviando email de verificación:', emailError);
      // No fallar el registro si el email falla, pero loguear el error
    }

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Por favor verifica tu correo electrónico para activar tu cuenta.',
      user: {
        _id: nuevoUsuario._id,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al crear la cuenta' 
    });
  }
};
```

#### 7. Endpoint para verificar email

```javascript
// controllers/userController.js
exports.verificarEmail = async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token y email son requeridos' 
      });
    }

    const usuario = await Usuario.findOne({ 
      email: email.toLowerCase(),
      emailVerificacionToken: token
    });

    if (!usuario) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token de verificación inválido' 
      });
    }

    // Verificar si el token expiró
    if (new Date() > usuario.emailVerificacionExpira) {
      return res.status(400).json({ 
        success: false, 
        error: 'El token de verificación ha expirado. Solicita uno nuevo.' 
      });
    }

    // Verificar el email
    usuario.emailVerificado = true;
    usuario.emailVerificacionToken = null;
    usuario.emailVerificacionExpira = null;
    await usuario.save();

    res.json({
      success: true,
      message: 'Correo electrónico verificado exitosamente'
    });
  } catch (error) {
    console.error('Error verificando email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al verificar el correo electrónico' 
    });
  }
};
```

#### 8. Endpoint para reenviar email de verificación

```javascript
// controllers/userController.js
exports.reenviarEmailVerificacion = async (req, res) => {
  try {
    const { email } = req.body;

    const usuario = await Usuario.findOne({ email: email.toLowerCase() });

    if (!usuario) {
      // Por seguridad, no revelar si el email existe o no
      return res.json({
        success: true,
        message: 'Si el correo existe, se enviará un nuevo email de verificación'
      });
    }

    if (usuario.emailVerificado) {
      return res.status(400).json({
        success: false,
        error: 'Este correo electrónico ya está verificado'
      });
    }

    // Generar nuevo token
    const tokenVerificacion = generarTokenVerificacion();
    const fechaExpiracion = new Date();
    fechaExpiracion.setHours(fechaExpiracion.getHours() + 24);

    usuario.emailVerificacionToken = tokenVerificacion;
    usuario.emailVerificacionExpira = fechaExpiracion;
    await usuario.save();

    // Enviar email
    try {
      await enviarEmailVerificacion(usuario.email, tokenVerificacion);
      res.json({
        success: true,
        message: 'Se ha enviado un nuevo email de verificación'
      });
    } catch (emailError) {
      console.error('Error enviando email:', emailError);
      res.status(500).json({
        success: false,
        error: 'Error al enviar el email de verificación'
      });
    }
  } catch (error) {
    console.error('Error reenviando email:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud'
    });
  }
};
```

#### 9. Modificar el login para verificar email

```javascript
// controllers/userController.js
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ email: email.toLowerCase() });

    if (!usuario || !await bcrypt.compare(password, usuario.password)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }

    // Verificar si el email está verificado
    if (!usuario.emailVerificado) {
      return res.status(403).json({
        success: false,
        error: 'Por favor verifica tu correo electrónico antes de iniciar sesión',
        requiereVerificacion: true
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario._id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: usuario._id,
        email: usuario.email,
        nombre: usuario.nombre
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al iniciar sesión' 
    });
  }
};
```

#### 10. Rutas

```javascript
// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/registrar', userController.registrar);
router.post('/login', userController.login);
router.get('/verificar-email', userController.verificarEmail);
router.post('/reenviar-verificacion', userController.reenviarEmailVerificacion);

module.exports = router;
```

---

### Frontend (Next.js/React)

#### 1. Actualizar auth.ts - Agregar métodos de verificación

```typescript
// src/app/services/auth.ts

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: {
    _id: string;
    email: string;
    name: string;
  };
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

export const api = {
  // ... otros métodos ...
  
  async register(data: RegisterData): Promise<RegisterResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    return apiClient.post<RegisterResponse>(
      '/api/usuarios/registrar',
      data,
      BACKEND_BASE
    );
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
```

#### 2. Crear página de verificación de email

```typescript
// src/app/verificar-email/page.tsx

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { colors, colorsWithOpacity } from '../utils/colors';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu correo electrónico...');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('Token o email no proporcionado');
      return;
    }

    const verifyEmail = async () => {
      try {
        const { api } = await import('../services');
        const result = await api.verifyEmail(token, email);

        if (result.success) {
          setStatus('success');
          setMessage('¡Correo electrónico verificado exitosamente!');
          setTimeout(() => {
            router.push('/?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Error al verificar el correo');
        }
      } catch (error) {
        console.error('Error verificando email:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Error al verificar el correo');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.fondoGeneral }}>
      <Header />
      
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div 
            className="rounded-lg shadow-lg p-8 border text-center"
            style={{ 
              backgroundColor: colors.headerFooter,
              borderColor: colorsWithOpacity.bordeSutil 
            }}
          >
            {status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-menu-texto-principal mx-auto mb-4"></div>
                <h2 className="text-page-title mb-4 text-texto-fondo-oscuro">
                  Verificando...
                </h2>
                <p className="text-sm" style={{ color: colorsWithOpacity.textoFondoOscuro80 }}>
                  {message}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-page-title mb-4 text-texto-fondo-oscuro">
                  ¡Verificación Exitosa!
                </h2>
                <p className="text-sm mb-6" style={{ color: colorsWithOpacity.textoFondoOscuro80 }}>
                  {message}
                </p>
                <p className="text-xs" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
                  Redirigiendo al login...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-page-title mb-4 text-texto-fondo-oscuro">
                  Error en la Verificación
                </h2>
                <p className="text-sm mb-6" style={{ color: colorsWithOpacity.textoFondoOscuro80 }}>
                  {message}
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: colors.botonesPrincipales }}
                >
                  Ir al Login
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-fondo-general">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-menu-texto-principal mx-auto mb-4"></div>
          <p className="text-texto-fondo-oscuro">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
```

#### 3. Actualizar Register.tsx para manejar verificación

```typescript
// En src/app/components/auth/Register.tsx

const handleSubmit = async (skipValidation = false) => {
  // ... validación ...
  
  try {
    const { api } = await import('../../services');
    const response = await api.register(registerData);
    
    if (response.success) {
      // Mostrar mensaje de verificación en lugar de éxito inmediato
      setRegisterSuccess(true);
      setErrors({});
      
      // Mensaje especial para verificación
      setTimeout(() => {
        // Redirigir al login con mensaje
        router.push('/?verification_required=true&email=' + encodeURIComponent(formData.email));
      }, 2000);
    } else {
      throw new Error(response.error || 'Error al crear la cuenta');
    }
  } catch (error) {
    // ... manejo de errores ...
  }
};
```

#### 4. Actualizar Login.tsx para mostrar mensaje si requiere verificación

```typescript
// En src/app/components/auth/Login.tsx

const handleSubmit = async (e: React.FormEvent) => {
  // ... código de login ...
  
  const result = await api.login(email, password);
  
  if (!result.success) {
    if (result.requiereVerificacion) {
      setErrors({ 
        general: 'Por favor verifica tu correo electrónico antes de iniciar sesión. ¿No recibiste el email?',
        showResendButton: true 
      });
    } else {
      setErrors({ general: result.error || 'Error al iniciar sesión' });
    }
  } else {
    // Login exitoso
    onLoginSuccess?.();
  }
};

// Agregar botón para reenviar verificación
const handleResendVerification = async () => {
  try {
    const { api } = await import('../../services');
    const result = await api.resendVerificationEmail(email);
    
    if (result.success) {
      setErrors({ 
        general: 'Se ha enviado un nuevo email de verificación. Revisa tu bandeja de entrada.' 
      });
    } else {
      setErrors({ general: result.error || 'Error al reenviar el email' });
    }
  } catch (error) {
    setErrors({ general: 'Error al reenviar el email de verificación' });
  }
};
```

---

## 🔧 Configuración de Mailgun

### 1. Crear cuenta en Mailgun

1. Ve a [mailgun.com](https://www.mailgun.com)
2. Crea una cuenta
3. Verifica tu dominio o usa el dominio de prueba (sandbox)

### 2. Obtener credenciales

- **API Key**: En el dashboard de Mailgun → Settings → API Keys
- **Domain**: Tu dominio verificado (ej: `mg.tudominio.com` o el sandbox)

### 3. Variables de entorno

```env
# .env
MAILGUN_API_KEY=tu-api-key-aqui
MAILGUN_DOMAIN=mg.tudominio.com
FRONTEND_URL=https://miru-franco-web.vercel.app
```

---

## ✅ Resumen de Endpoints del Backend

1. **POST `/api/usuarios/registrar`** - Registro (envía email de verificación)
2. **GET `/api/usuarios/verificar-email?token=...&email=...`** - Verificar email
3. **POST `/api/usuarios/reenviar-verificacion`** - Reenviar email de verificación
4. **POST `/api/usuarios/login`** - Login (verifica si el email está verificado)

---

## 🔒 Seguridad

- Los tokens de verificación expiran en 24 horas
- Los tokens son únicos y aleatorios (32 bytes)
- El email debe estar verificado antes de permitir login
- No se revela si un email existe o no al reenviar verificación

---

## 📧 Personalización del Email

Puedes personalizar el template del email en `services/emailService.js`:
- Colores de la marca
- Logo
- Estructura HTML
- Texto y mensajes

---

¿Quieres que implemente esto en tu código ahora?

