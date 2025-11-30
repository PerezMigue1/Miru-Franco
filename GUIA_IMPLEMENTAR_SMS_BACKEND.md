# 📱 Guía: Implementar Envío de SMS en el Backend

> **⚠️ NOTA:** Esta guía es para Twilio. Si estás usando **SendGrid**, consulta `GUIA_CONFIGURAR_SENDGRID_SMS.md` en su lugar.

## 🔴 Problema Actual

El frontend está enviando `metodoVerificacion: 'sms'` pero el código no llega porque el backend **no está implementado para enviar SMS**.

---

## ✅ Solución: Implementar Envío de SMS

### Paso 1: Instalar Twilio (Servicio de SMS)

**Opción A: Twilio (Recomendado)**

```bash
npm install twilio
```

**Opción B: Otro servicio de SMS**
- AWS SNS
- Vonage (Nexmo)
- MessageBird

---

### Paso 2: Configurar Variables de Entorno

Agregar a tu archivo `.env`:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=tu_account_sid_aqui
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_PHONE_NUMBER=+1234567890  # Número de Twilio (formato: +1234567890)
```

**Cómo obtener las credenciales de Twilio:**
1. Ve a [https://www.twilio.com/](https://www.twilio.com/)
2. Crea una cuenta (plan gratuito disponible)
3. Obtén tu `Account SID` y `Auth Token` del dashboard
4. Obtén un número de teléfono de Twilio

---

### Paso 3: Crear Utilidad para Enviar SMS

**Archivo:** `utils/sendSMS.js` (CREAR NUEVO)

```javascript
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Envía un código OTP por SMS
 * @param {string} telefono - Número de teléfono del destinatario (formato: +521234567890)
 * @param {string} codigoOTP - Código OTP de 6 dígitos
 * @returns {Promise<void>}
 */
export const sendOTPSMS = async (telefono, codigoOTP) => {
  try {
    // Validar que el teléfono tenga formato internacional
    if (!telefono.startsWith('+')) {
      throw new Error('El teléfono debe incluir código de país (ej: +521234567890)');
    }

    const message = await client.messages.create({
      body: `Tu código de verificación de Miru Franco es: ${codigoOTP}. Expira en 2 minutos.`,
      from: twilioPhone,
      to: telefono
    });

    console.log('SMS enviado exitosamente:', message.sid);
    console.log('Código OTP enviado a:', telefono);
  } catch (error) {
    console.error('Error enviando SMS:', error);
    throw new Error(`No se pudo enviar el SMS: ${error.message}`);
  }
};
```

---

### Paso 4: Modificar el Controlador de Registro

**Archivo:** `controllers/authController.js` (o similar)

**Importar las funciones al inicio:**

```javascript
import { sendOTPEmail } from "../utils/sendEmail.js";
import { sendOTPSMS } from "../utils/sendSMS.js"; // ✅ NUEVO
```

**Modificar la función `registerUser`:**

```javascript
export const registerUser = async (req, res) => {
  const {
    nombre,
    email,
    password,
    telefono,
    metodoVerificacion = 'email', // ✅ NUEVO: Leer método de verificación
    fechaNacimiento,
    // ... otros campos ...
  } = req.body;

  try {
    // Verificar si el usuario ya existe
    const existingUser = await Usuario.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: "Correo ya registrado" 
      });
    }

    // Validar teléfono si se selecciona SMS
    if (metodoVerificacion === 'sms' && !telefono) {
      return res.status(400).json({
        success: false,
        error: "El teléfono es requerido para verificación por SMS"
      });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generar código OTP de 6 dígitos
    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Calcular fecha de expiración (2 minutos desde ahora)
    const otpExpira = new Date(Date.now() + 2 * 60 * 1000);

    // Crear usuario con confirmado: false
    const user = new Usuario({
      nombre,
      email,
      password: hashedPassword,
      telefono,
      // ... otros campos ...
      codigoOTP,
      otpExpira,
      confirmado: false,
    });

    await user.save();
    console.log("Usuario registrado:", email, "OTP:", codigoOTP, "Expira en 2 minutos");

    // ✅ NUEVO: Enviar código según el método seleccionado
    try {
      if (metodoVerificacion === 'sms') {
        await sendOTPSMS(telefono, codigoOTP);
        
        return res.status(201).json({ 
          success: true,
          message: "Ingresa el código enviado a tu teléfono para activar tu cuenta. El código expira en 2 minutos.",
          requiereVerificacion: true,
          metodo: 'sms' // ✅ Indicar al frontend que se usó SMS
        });
      } else {
        // Método por defecto: Email
        await sendOTPEmail(email, codigoOTP);
        
        return res.status(201).json({ 
          success: true,
          message: "Ingresa el código para activar tu cuenta. El código expira en 2 minutos.",
          requiereVerificacion: true,
          metodo: 'email' // ✅ Indicar al frontend que se usó Email
        });
      }
    } catch (err) {
      console.error(`Error al enviar código por ${metodoVerificacion}:`, err);
      // Aún así, el usuario fue creado, pero no se pudo enviar el código
      return res.status(500).json({
        success: false,
        error: `Usuario registrado, pero no se pudo enviar el código de activación por ${metodoVerificacion === 'sms' ? 'SMS' : 'correo'}. Contacta al soporte.`
      });
    }
  } catch (err) {
    console.error("Error al registrar usuario:", err);
    return res.status(500).json({ 
      success: false,
      error: "Error al registrar usuario" 
    });
  }
};
```

---

### Paso 5: Modificar el Endpoint de Reenvío de Código

**Archivo:** `controllers/authController.js`

**Modificar la función `reenviarCodigo`:**

```javascript
export const reenviarCodigo = async (req, res) => {
  const { 
    email, 
    metodoVerificacion = 'email' // ✅ NUEVO: Leer método de verificación
  } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: "Usuario no encontrado." 
      });
    }

    // Generar nuevo código OTP
    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpira = new Date(Date.now() + 2 * 60 * 1000);

    // Actualizar código en la base de datos
    usuario.codigoOTP = codigoOTP;
    usuario.otpExpira = otpExpira;
    await usuario.save();

    // ✅ NUEVO: Enviar código según el método seleccionado
    try {
      if (metodoVerificacion === 'sms') {
        if (!usuario.telefono) {
          return res.status(400).json({
            success: false,
            error: "El usuario no tiene teléfono registrado para envío por SMS"
          });
        }

        await sendOTPSMS(usuario.telefono, codigoOTP);
        
        return res.status(200).json({
          success: true,
          message: "Nuevo código enviado a tu teléfono. Recuerda que el código expira en 2 minutos.",
          metodo: 'sms'
        });
      } else {
        // Método por defecto: Email
        await sendOTPEmail(email, codigoOTP);
        
        return res.status(200).json({
          success: true,
          message: "Nuevo código enviado al correo. Recuerda que el código expira en 2 minutos.",
          metodo: 'email'
        });
      }
    } catch (err) {
      console.error(`Error al reenviar código por ${metodoVerificacion}:`, err);
      return res.status(500).json({
        success: false,
        error: `No se pudo enviar el código por ${metodoVerificacion === 'sms' ? 'SMS' : 'correo'}. Intenta nuevamente.`
      });
    }
  } catch (error) {
    console.error("Error al reenviar código:", error);
    return res.status(500).json({ 
      success: false,
      error: "Error al reenviar código" 
    });
  }
};
```

---

### Paso 6: Validar Formato de Teléfono

**Archivo:** `utils/validatePhone.js` (OPCIONAL, pero recomendado)

```javascript
/**
 * Valida y normaliza el formato de teléfono internacional
 * @param {string} telefono - Número de teléfono
 * @returns {string} - Teléfono normalizado con código de país
 */
export const normalizePhone = (telefono) => {
  // Eliminar espacios, guiones, paréntesis
  let cleaned = telefono.replace(/[\s\-()]/g, '');
  
  // Si no empieza con +, agregar código de país por defecto (México: +52)
  if (!cleaned.startsWith('+')) {
    // Si empieza con 52, agregar +
    if (cleaned.startsWith('52')) {
      cleaned = '+' + cleaned;
    } else {
      // Asumir que es México y agregar +52
      cleaned = '+52' + cleaned;
    }
  }
  
  return cleaned;
};
```

**Usar en el controlador:**

```javascript
import { normalizePhone } from "../utils/validatePhone.js";

// En registerUser, antes de guardar:
const telefonoNormalizado = normalizePhone(telefono);
```

---

## 🧪 Cómo Probar

### 1. Verificar Variables de Entorno

```javascript
// En tu backend, verifica que las variables estén cargadas
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Configurado' : '❌ Faltante');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Configurado' : '❌ Faltante');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || '❌ Faltante');
```

### 2. Probar Envío de SMS Directamente

```javascript
// Crear archivo de prueba: test-sms.js
import { sendOTPSMS } from './utils/sendSMS.js';

(async () => {
  try {
    await sendOTPSMS('+521234567890', '123456');
    console.log('✅ SMS enviado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
```

### 3. Probar Registro con SMS

1. Registra un usuario seleccionando "SMS" como método
2. Verifica que recibas el SMS en tu teléfono
3. Verifica los logs del backend para ver si hay errores

---

## 🔍 Debugging

### Errores Comunes

#### 1. "The number +52... is not a valid phone number"

**Causa:** El formato del teléfono es incorrecto.

**Solución:** Asegúrate de que el teléfono tenga formato internacional:
- ✅ Correcto: `+521234567890`
- ❌ Incorrecto: `1234567890`, `521234567890`

#### 2. "Unable to create record: The From phone number +1... is not a valid, SMS-capable inbound phone number"

**Causa:** El número de Twilio no está configurado para SMS.

**Solución:** 
- Verifica que el número de Twilio esté activo
- Asegúrate de que el número tenga capacidad SMS

#### 3. "Authentication Error"

**Causa:** Las credenciales de Twilio son incorrectas.

**Solución:**
- Verifica `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN`
- Asegúrate de que no tengan espacios extra

#### 4. El código no llega

**Posibles causas:**
- El teléfono no tiene formato internacional
- El número de Twilio no está configurado
- No hay crédito en la cuenta de Twilio
- El teléfono está en la lista de bloqueo de Twilio

---

## 📋 Checklist de Implementación

- [ ] Instalar `twilio` (`npm install twilio`)
- [ ] Configurar variables de entorno (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
- [ ] Crear archivo `utils/sendSMS.js` con función `sendOTPSMS`
- [ ] Modificar `registerUser` para leer `metodoVerificacion` y enviar SMS si es 'sms'
- [ ] Modificar `reenviarCodigo` para leer `metodoVerificacion` y enviar SMS si es 'sms'
- [ ] Agregar validación de teléfono cuando `metodoVerificacion === 'sms'`
- [ ] Probar envío de SMS con un número real
- [ ] Verificar que el frontend recibe `metodo: 'sms'` en la respuesta

---

## ✅ Resumen

1. **Instalar Twilio:** `npm install twilio`
2. **Configurar variables de entorno** con tus credenciales de Twilio
3. **Crear `utils/sendSMS.js`** con la función para enviar SMS
4. **Modificar `registerUser`** para leer `metodoVerificacion` y enviar SMS si es necesario
5. **Modificar `reenviarCodigo`** para leer `metodoVerificacion` y enviar SMS si es necesario
6. **Probar** que el SMS llegue correctamente

Una vez implementado esto, el código debería llegar por SMS cuando el usuario seleccione ese método.

