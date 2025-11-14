# Guía de Implementación: Verificación OTP (Igual a Nova_Graf-main)

Esta guía replica **exactamente** la implementación del proyecto Nova_Graf-main.

## 📋 Estructura de Archivos

```
backend/
├── models/
│   └── Usuario.js          (Modificar)
├── controllers/
│   └── authController.js   (Modificar)
├── routes/
│   └── auth.js            (Modificar)
├── utils/
│   └── sendEmail.js       (Crear nuevo)
├── package.json           (Modificar)
└── .env                   (Crear/Modificar)
```

---

## 1. Instalar Dependencias

```bash
npm install @sendgrid/mail
```

**Versión usada en Nova_Graf:** `@sendgrid/mail@^8.1.6`

---

## 2. Modificar Modelo de Usuario

**Archivo:** `models/Usuario.js`

Agregar estos campos al esquema:

```javascript
import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema({
  // ... tus campos existentes ...
  
  // Campos para verificación OTP (AGREGAR ESTOS)
  confirmado: { 
    type: Boolean, 
    default: false 
  },
  codigoOTP: { 
    type: String 
  },
  otpExpira: { 
    type: Date 
  },
  
  // ... resto de campos ...
}, { timestamps: true });

export default mongoose.model("Usuario", usuarioSchema);
```

---

## 3. Crear Utilidad para Enviar Emails

**Archivo:** `utils/sendEmail.js` (CREAR NUEVO)

```javascript
// sendemail.js (función de activación corregida)

import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendOTPEmail = async (correo, codigoOTP) => {
  try {
    const msg = {
      to: correo,
      from: { // 💡 CORRECCIÓN: Usar el formato de objeto
        name: process.env.SENDGRID_FROM_NAME, 
        email: process.env.SENDGRID_FROM_EMAIL,
      }, 
      subject: "Código de activación - Miru Franco",
      html: `<h2>Bienvenido a Miru Franco Salón Beauty</h2>
             <p>Tu código de verificación es:</p>
             <h3>${codigoOTP}</h3>
             <p>Expira en 2 minutos.</p>`,
    };
    await sgMail.send(msg);
    console.log("Correo de activación enviado a:", correo);
  } catch (err) {
    console.error("Error enviando correo de activación:", err.response?.body || err.message);
    throw new Error("No se pudo enviar el correo de activación");
  }
};
```

---

## 4. Modificar Controlador de Registro

**Archivo:** `controllers/authController.js`

**Importar la función al inicio:**
```javascript
import { sendOTPEmail } from "../utils/sendEmail.js";
```

**Modificar la función `registerUser`:**

```javascript
// 🔹 Registro tradicional
export const registerUser = async (req, res) => {
  const {
    nombre,
    email,  // O correo, según tu modelo
    password,  // O contraseña, según tu modelo
    telefono,
    // ... otros campos ...
  } = req.body;

  try {
    const existingUser = await Usuario.findOne({ email }); // O correo
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "Correo ya registrado" 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generar código OTP de 6 dígitos
    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new Usuario({
      nombre,
      email,  // O correo
      password: hashedPassword,
      telefono,
      // ... otros campos ...
      codigoOTP,
      otpExpira: new Date(Date.now() + 2 * 60 * 1000), // 2 minutos
      confirmado: false,
    });

    await user.save();
    console.log("Usuario registrado:", email, "OTP:", codigoOTP, "Expira en 2 minutos");

    try {
      await sendOTPEmail(email, codigoOTP);
      return res.status(201).json({ 
        success: true,
        message: "Ingresa el código para activar tu cuenta. El código expira en 2 minutos." 
      });
    } catch (err) {
      console.error("Error al enviar correo de activación:", err);
      return res.status(500).json({
        success: false,
        message: "Usuario registrado, pero no se pudo enviar el correo de activación",
      });
    }
  } catch (err) {
    console.error("Error al registrar usuario:", err);
    return res.status(500).json({ 
      success: false,
      message: "Error al registrar usuario" 
    });
  }
};
```

---

## 5. Crear Función Verificar OTP

**Archivo:** `controllers/authController.js`

Agregar esta función:

```javascript
// 🔹 Verificar OTP (para registro)
export const verificarOTP = async (req, res) => {
   const { email, codigo } = req.body; // O correo, según tu modelo
 
   try {
     const usuario = await Usuario.findOne({ email }); // O correo
     if (!usuario) {
       return res.status(404).json({ 
         success: false,
         message: "Usuario no encontrado." 
       });
     }
 
     if (!usuario.codigoOTP) {
       return res.status(400).json({ 
         success: false,
         message: "No hay código activo. Solicita uno nuevo." 
       });
     }
     
     // Verificar si el código ha expirado (2 minutos)
     if (usuario.otpExpira < new Date()) {
       return res.status(400).json({ 
         success: false,
         message: "Código expirado. El código OTP solo es válido por 2 minutos. Solicita uno nuevo." 
       });
     }
 
     if (usuario.codigoOTP !== codigo) {
       return res.status(400).json({ 
         success: false,
         message: "Código incorrecto." 
       });
     }
 
     usuario.codigoOTP = undefined;
     usuario.otpExpira = undefined;
     usuario.confirmado = true;
     await usuario.save();
 
     res.status(200).json({ 
       success: true,
       message: "Código verificado correctamente. Cuenta activada." 
     });
   } catch (error) {
     console.error(error);
     res.status(500).json({ 
       success: false,
       message: "Error al verificar el código" 
     });
   }
};
```

---

## 6. Crear Función Reenviar Código

**Archivo:** `controllers/authController.js`

Agregar esta función:

```javascript
// 🔹 Reenviar código OTP (para registro)
export const reenviarCodigo = async (req, res) => {
  const { email } = req.body; // O correo, según tu modelo

  try {
    const usuario = await Usuario.findOne({ email }); // O correo
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        message: "Usuario no encontrado." 
      });
    }

    const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
    usuario.codigoOTP = nuevoCodigo;
    usuario.otpExpira = new Date(Date.now() + 2 * 60 * 1000); // 2 minutos
    await usuario.save();

    await sendOTPEmail(email, nuevoCodigo); // O correo

    res.status(200).json({ 
      success: true,
      message: "✅ Nuevo código enviado al correo. Recuerda que el código expira en 2 minutos." 
    });
  } catch (error) {
    console.error("Error al reenviar código:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al reenviar el código" 
    });
  }
};
```

---

## 7. Modificar Función de Login

**Archivo:** `controllers/authController.js`

Modificar la función `login` para verificar que la cuenta esté confirmada:

```javascript
// 🔹 Login
export const login = async (req, res) => {
  const { email, password } = req.body; // O correo, contraseña

  try {
    const user = await Usuario.findOne({ email }); // O correo
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "El correo no está registrado" 
      });
    }

    // VERIFICAR QUE LA CUENTA ESTÉ CONFIRMADA
    if (!user.confirmado) {
      return res.status(403).json({ 
        success: false,
        message: "Tu cuenta no está activada. Revisa tu correo.",
        requiereVerificacion: true
      });
    }

    const passwordValida = await bcrypt.compare(password, user.password);
    if (!passwordValida) {
      return res.status(401).json({ 
        success: false,
        message: "Contraseña incorrecta" 
      });
    }

    // Login exitoso
    // Generar token JWT (o tu método de autenticación)
    const token = generarToken(user); // Tu función para generar token

    res.status(200).json({
      success: true,
      message: `Bienvenido ${user.nombre}!`,
      token: token,
      user: {
        _id: user._id,
        email: user.email, // O correo
        name: user.nombre,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ 
      success: false,
      message: "Error en el servidor" 
    });
  }
};
```

---

## 8. Agregar Rutas

**Archivo:** `routes/auth.js`

**Importar las funciones:**
```javascript
import {
  registerUser,
  login,
  verificarOTP,
  reenviarCodigo,
  // ... otras funciones ...
} from "../controllers/authController.js";
```

**Agregar las rutas:**
```javascript
const router = express.Router();

// Rutas existentes
router.post("/registrar", registerUser); // O "/register"
router.post("/login", login);

// Nuevas rutas para verificación OTP
router.post("/verificar-otp", verificarOTP);
router.post("/reenviar-codigo", reenviarCodigo);

export default router;
```

**⚠️ IMPORTANTE:** Asegúrate de que las rutas coincidan con lo que espera el frontend:
- `POST /api/usuarios/verificar-otp`
- `POST /api/usuarios/reenviar-codigo`

Si tus rutas están bajo `/api/usuarios/`, entonces:
```javascript
router.post("/api/usuarios/verificar-otp", verificarOTP);
router.post("/api/usuarios/reenviar-codigo", reenviarCodigo);
```

---

## 9. Variables de Entorno

**Archivo:** `.env` (en la raíz del backend)

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.tu_api_key_aqui
SENDGRID_FROM_EMAIL=noreply@sendgrid.net
SENDGRID_FROM_NAME=Miru Franco Salón Beauty

# Otras variables...
MONGO_URI=tu_mongo_uri
PORT=3000
```

**📖 Cómo obtener estas variables:** Lee `GUIA_CONFIGURACION_SENDGRID.md`

---

## 10. Estructura Completa del Código

### `utils/sendEmail.js` (Completo)
```javascript
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendOTPEmail = async (correo, codigoOTP) => {
  try {
    const msg = {
      to: correo,
      from: {
        name: process.env.SENDGRID_FROM_NAME, 
        email: process.env.SENDGRID_FROM_EMAIL,
      }, 
      subject: "Código de activación - Miru Franco",
      html: `<h2>Bienvenido a Miru Franco Salón Beauty</h2>
             <p>Tu código de verificación es:</p>
             <h3>${codigoOTP}</h3>
             <p>Expira en 2 minutos.</p>`,
    };
    await sgMail.send(msg);
    console.log("Correo de activación enviado a:", correo);
  } catch (err) {
    console.error("Error enviando correo de activación:", err.response?.body || err.message);
    throw new Error("No se pudo enviar el correo de activación");
  }
};
```

### `controllers/authController.js` (Funciones clave)

```javascript
import Usuario from "../models/Usuario.js";
import bcrypt from "bcrypt";
import { sendOTPEmail } from "../utils/sendEmail.js";

// ... otras importaciones ...

// REGISTRO
export const registerUser = async (req, res) => {
  // ... código de validación ...
  
  const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
  
  const user = new Usuario({
    // ... campos ...
    codigoOTP,
    otpExpira: new Date(Date.now() + 2 * 60 * 1000),
    confirmado: false,
  });
  
  await user.save();
  await sendOTPEmail(email, codigoOTP);
  
  return res.status(201).json({ 
    success: true,
    message: "Ingresa el código para activar tu cuenta. El código expira en 2 minutos." 
  });
};

// VERIFICAR OTP
export const verificarOTP = async (req, res) => {
  const { email, codigo } = req.body;
  const usuario = await Usuario.findOne({ email });
  
  if (!usuario.codigoOTP || usuario.otpExpira < new Date() || usuario.codigoOTP !== codigo) {
    return res.status(400).json({ success: false, message: "Código inválido o expirado" });
  }
  
  usuario.codigoOTP = undefined;
  usuario.otpExpira = undefined;
  usuario.confirmado = true;
  await usuario.save();
  
  res.status(200).json({ success: true, message: "Cuenta activada." });
};

// REENVIAR CÓDIGO
export const reenviarCodigo = async (req, res) => {
  const { email } = req.body;
  const usuario = await Usuario.findOne({ email });
  
  const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
  usuario.codigoOTP = nuevoCodigo;
  usuario.otpExpira = new Date(Date.now() + 2 * 60 * 1000);
  await usuario.save();
  
  await sendOTPEmail(email, nuevoCodigo);
  res.status(200).json({ success: true, message: "Nuevo código enviado." });
};

// LOGIN (modificado)
export const login = async (req, res) => {
  const user = await Usuario.findOne({ email });
  
  if (!user.confirmado) {
    return res.status(403).json({ 
      success: false,
      message: "Tu cuenta no está activada. Revisa tu correo.",
      requiereVerificacion: true
    });
  }
  
  // ... resto del login ...
};
```

---

## ✅ Checklist de Implementación

- [ ] Instalar `@sendgrid/mail`
- [ ] Agregar campos `codigoOTP`, `otpExpira`, `confirmado` al modelo Usuario
- [ ] Crear archivo `utils/sendEmail.js`
- [ ] Modificar función `registerUser` para generar y enviar OTP
- [ ] Crear función `verificarOTP`
- [ ] Crear función `reenviarCodigo`
- [ ] Modificar función `login` para verificar `confirmado: true`
- [ ] Agregar rutas en `routes/auth.js`
- [ ] Configurar variables de entorno (`.env`)
- [ ] Probar registro y recepción de correo
- [ ] Probar verificación de código
- [ ] Probar login con cuenta no activada
- [ ] Probar reenvío de código

---

## 🔍 Notas Importantes

1. **Expiración:** El código expira en **2 minutos** (no 10 como dice el email)
2. **Formato del código:** 6 dígitos numéricos (100000-999999)
3. **Campos del modelo:** Asegúrate de usar `email` o `correo` consistentemente según tu modelo
4. **Rutas:** Verifica que las rutas coincidan con lo que espera el frontend
5. **Respuestas:** Todas las respuestas deben incluir `success: true/false`

---

## 📞 Siguiente Paso

Una vez implementado, configura SendGrid siguiendo:
**`GUIA_CONFIGURACION_SENDGRID.md`**

