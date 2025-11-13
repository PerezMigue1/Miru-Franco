# Instrucciones para Implementar Mailgun en el Backend

## 🔑 Credenciales de Mailgun

**API Key:** `TU_MAILGUN_API_KEY_AQUI`

**Domain:** `TU_MAILGUN_DOMAIN_AQUI`

## 📦 Instalación de Dependencias

```bash
npm install mailgun.js form-data crypto
```

## 🔧 Configuración

### 1. Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
MAILGUN_API_KEY=TU_MAILGUN_API_KEY_AQUI
MAILGUN_DOMAIN=TU_MAILGUN_DOMAIN_AQUI
FRONTEND_URL=https://miru-franco-web.vercel.app
```

### 2. Crear archivo de configuración de Mailgun

```javascript
// config/mailgun.js
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

const DOMAIN = process.env.MAILGUN_DOMAIN;

module.exports = { mg, DOMAIN };
```

### 3. Crear utilidad para tokens de verificación

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

### 4. Crear servicio de email

```javascript
// services/emailService.js
const { mg, DOMAIN } = require('../config/mailgun');
const { generarLinkVerificacion } = require('../utils/emailVerification');

async function enviarEmailVerificacion(email, token) {
  const verificationLink = generarLinkVerificacion(token, email);
  
  const data = {
    from: 'Miru Franco Beauty Salón <noreply@TU_MAILGUN_DOMAIN_AQUI>',
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
          .header { background-color: #710014; color: #F2F1ED; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
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

## 📝 Actualizar Modelo de Usuario

Agrega estos campos a tu modelo `Usuario`:

```javascript
// models/Usuario.js
const UsuarioSchema = new mongoose.Schema({
  // ... campos existentes ...
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

## 🔄 Actualizar Controlador de Registro

```javascript
// controllers/userController.js
const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
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

## ✅ Endpoint para Verificar Email

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

## 📧 Endpoint para Reenviar Email de Verificación

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

## 🔐 Actualizar Login para Verificar Email

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

## 🛣️ Agregar Rutas

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

## ✅ Endpoints que el Frontend Espera

1. **POST `/api/usuarios/registrar`** - Registro (debe enviar email de verificación)
2. **POST `/api/usuarios/login`** - Login (debe verificar si email está verificado)
3. **GET `/api/usuarios/verificar-email?token=...&email=...`** - Verificar email
4. **POST `/api/usuarios/reenviar-verificacion`** - Reenviar email de verificación

## 📝 Notas Importantes

- El dominio de Mailgun es un sandbox, solo puedes enviar emails a direcciones autorizadas
- Para producción, necesitarás verificar tu propio dominio en Mailgun
- Los tokens de verificación expiran en 24 horas
- El frontend ya está listo y esperando estos endpoints

