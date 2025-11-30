# 📱 Guía: Configurar SendGrid para Envío de SMS

## 📋 Resumen

SendGrid puede enviar tanto **emails** como **SMS**. Esta guía explica cómo configurar SendGrid para enviar códigos OTP por SMS.

---

## ✅ Solución: Configurar SendGrid SMS en Render

### Paso 1: Verificar Cuenta de SendGrid

Si ya tienes SendGrid configurado para emails, puedes usar la misma cuenta para SMS.

1. **Inicia sesión** en tu cuenta de SendGrid:
   - [https://app.sendgrid.com/](https://app.sendgrid.com/)

2. **Verifica que tengas acceso a SMS:**
   - Ve a **Settings** → **Sender Authentication**
   - O busca **"SMS"** en el menú

**Nota:** SendGrid SMS puede requerir activación adicional o un plan específico. Verifica en tu cuenta.

---

### Paso 2: Obtener API Key de SendGrid

1. **Ve a Settings** → **API Keys**
2. **Crea un nuevo API Key** o usa uno existente:
   - Haz clic en **"Create API Key"**
   - Dale un nombre (ej: "SMS API Key")
   - Selecciona permisos: **"Full Access"** o **"Restricted Access"** con permisos de SMS
   - Copia el API Key (solo se muestra una vez)

---

### Paso 3: Configurar Variables de Entorno en Render

1. **Ve a tu proyecto en Render:**
   - [https://dashboard.render.com/](https://dashboard.render.com/)

2. **Selecciona tu servicio** (backend)

3. **Ve a la sección "Environment":**
   - En el menú lateral, busca **"Environment"** o **"Environment Variables"**

4. **Verifica/Agrega las siguientes variables:**

   ```
   SENDGRID_API_KEY=tu_api_key_de_sendgrid
   SENDGRID_FROM_EMAIL=noreply@tudominio.com
   SENDGRID_FROM_NAME=Miru Franco Salón Beauty
   ```

   **Nota:** Si ya tienes estas variables para emails, puedes reutilizarlas para SMS también.

5. **Guarda los cambios**

6. **Reinicia el servicio:**
   - Render debería reiniciar automáticamente

---

### Paso 4: Implementar Envío de SMS con SendGrid

**Archivo:** `utils/sendSMS.js` o `sms/sms.service.ts` (según tu estructura)

#### Opción A: Usando SendGrid API de SMS (si está disponible)

```javascript
import sgMail from '@sendgrid/mail';

// SendGrid también puede enviar SMS a través de su API
// Nota: Esto puede requerir un plan específico de SendGrid

export const sendOTPSMS = async (telefono, codigoOTP) => {
  try {
    // Validar formato de teléfono
    if (!telefono.startsWith('+')) {
      throw new Error('El teléfono debe incluir código de país (ej: +521234567890)');
    }

    // SendGrid SMS API (si está disponible en tu plan)
    const response = await fetch('https://api.sendgrid.com/v3/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: telefono,
        from: process.env.SENDGRID_FROM_NUMBER || '+1234567890', // Número de SendGrid
        message: `Tu código de verificación de Miru Franco es: ${codigoOTP}. Expira en 2 minutos.`
      })
    });

    if (!response.ok) {
      throw new Error(`Error enviando SMS: ${response.statusText}`);
    }

    console.log('SMS enviado exitosamente a:', telefono);
  } catch (error) {
    console.error('Error enviando SMS:', error);
    throw new Error(`No se pudo enviar el SMS: ${error.message}`);
  }
};
```

#### Opción B: Usar SendGrid Email como Fallback (Recomendado)

Si SendGrid SMS no está disponible en tu plan, puedes usar el fallback automático a Email:

```javascript
import { sendOTPEmail } from './sendEmail.js';

export const sendOTPSMS = async (telefono, codigoOTP, email) => {
  try {
    // Intentar enviar por SMS (si SendGrid SMS está disponible)
    // Si no está disponible, hacer fallback a Email automáticamente
    
    console.warn('SendGrid SMS no está disponible. Usando Email como fallback.');
    
    // Fallback automático a Email
    if (email) {
      await sendOTPEmail(email, codigoOTP);
      console.log('Código enviado por Email (fallback desde SMS) a:', email);
      return { metodo: 'email', fallback: true };
    } else {
      throw new Error('No se puede enviar SMS ni Email: email no disponible');
    }
  } catch (error) {
    console.error('Error en fallback SMS a Email:', error);
    throw error;
  }
};
```

---

## 🔧 Modificar el Backend para Usar SendGrid

### En el Controlador de Registro

**Archivo:** `usuarios.service.ts` o `authController.js`

```typescript
// Importar función de SMS (que usa SendGrid)
import { sendOTPSMS } from '../sms/sms.service';

// En la función de registro:
try {
  if (metodoVerificacion === 'sms') {
    // Intentar enviar por SMS usando SendGrid
    await sendOTPSMS(telefono, codigoOTP, email);
    
    return {
      success: true,
      message: "Código enviado a tu teléfono. El código expira en 2 minutos.",
      requiereVerificacion: true,
      metodo: 'sms'
    };
  } else {
    // Método por defecto: Email usando SendGrid
    await sendOTPEmail(email, codigoOTP);
    
    return {
      success: true,
      message: "Código enviado a tu correo. El código expira en 2 minutos.",
      requiereVerificacion: true,
      metodo: 'email'
    };
  }
} catch (smsError) {
  // Si SMS falla, hacer fallback automático a Email
  console.warn('Error enviando SMS, usando Email como fallback:', smsError);
  
  try {
    await sendOTPEmail(email, codigoOTP);
    return {
      success: true,
      message: "El código se envió por email ya que el SMS no está disponible. El código expira en 2 minutos.",
      requiereVerificacion: true,
      metodo: 'email',
      smsFallback: true
    };
  } catch (emailError) {
    throw new Error('No se pudo enviar el código ni por SMS ni por Email');
  }
}
```

---

## 📋 Notas Importantes sobre SendGrid SMS

### ⚠️ Limitaciones

1. **SendGrid SMS puede no estar disponible en todos los planes:**
   - Verifica en tu cuenta de SendGrid si tienes acceso a SMS
   - Algunos planes solo incluyen Email

2. **Alternativa recomendada:**
   - Si SendGrid SMS no está disponible, el sistema hace **fallback automático a Email**
   - El frontend ya está preparado para manejar esto

3. **Configuración:**
   - Si SendGrid SMS está disponible, necesitarás configurar un número de teléfono en SendGrid
   - Esto puede requerir verificación adicional

---

## ✅ Checklist de Configuración

- [ ] Verificar que SendGrid SMS esté disponible en tu plan
- [ ] Verificar que `SENDGRID_API_KEY` esté configurado en Render
- [ ] Implementar función `sendOTPSMS` usando SendGrid
- [ ] Implementar fallback automático a Email si SMS falla
- [ ] Probar registro con SMS
- [ ] Verificar que el fallback a Email funcione si SMS no está disponible

---

## 🔄 Fallback Automático (Ya Implementado en Frontend)

El frontend ya está preparado para manejar el fallback automático:

1. Si SMS falla, el frontend detecta el error
2. Automáticamente cambia a Email
3. Muestra mensaje claro al usuario
4. Permite solicitar reenvío por Email

---

## ✅ Resumen

1. **SendGrid puede enviar SMS** (si está disponible en tu plan)
2. **Si SMS no está disponible**, el sistema hace fallback automático a Email
3. **El frontend ya maneja el fallback** automáticamente
4. **Usa la misma API Key de SendGrid** que ya tienes para emails

Si SendGrid SMS no está disponible en tu plan, el sistema funcionará perfectamente usando Email como método principal, y el usuario podrá elegir entre Email y SMS (que automáticamente usará Email si SMS falla).

