# 📱 Guía: Configurar SMS en Render

## ✅ Estado Actual

Según `GUIA_CONFIGURAR_SMS.md` del backend:

- ✅ **Backend YA implementado** - SMS funciona igual que Email
- ✅ **Usa SendGrid** - Mismo patrón que Email
- ✅ **Solo falta configurar variables** en Render
- ✅ **Fallback automático** - Si SMS no está configurado, usa Email

---

## 🔧 Configurar Variables de Entorno en Render

### Paso 1: Ir a Render Dashboard

1. Ve a [https://dashboard.render.com/](https://dashboard.render.com/)
2. Selecciona tu servicio (backend)
3. Ve a **"Environment"** o **"Environment Variables"**

### Paso 2: Agregar Variables de SMS

Según la guía del backend, agrega las siguientes variables de entorno:

```env
SMS_API_KEY=tu_api_key_sms_aqui
SMS_FROM_NUMBER=+1234567890
SMS_PROVIDER=sendgrid
```

**Importante:**
- `SMS_API_KEY`: Puedes usar la misma API Key de SendGrid que ya tienes para emails
- `SMS_FROM_NUMBER`: Número de teléfono con código de país (ej: `+521234567890` para México)
- `SMS_PROVIDER`: Debe ser `sendgrid` (según la guía del backend)

### Paso 3: Reutilizar SendGrid API Key (Opcional)

Si ya tienes `SENDGRID_API_KEY` configurado para emails, puedes usar el mismo valor:

- Copia el valor de `SENDGRID_API_KEY`
- Pégalo en `SMS_API_KEY`

**Nota:** Según la guía del backend, SMS se maneja igual que Email, así que puedes usar la misma API Key.

### Paso 4: Guardar y Reiniciar

1. **Guarda los cambios** en Render
2. **Reinicia el servicio** (Render debería hacerlo automáticamente)
3. **Verifica los logs** para confirmar que SMS está configurado

---

## 📋 Variables Completas Necesarias

Tu archivo de variables de entorno en Render debería tener:

```env
# Email (SendGrid) - Ya configurado
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@tudominio.com
SENDGRID_FROM_NAME=Miru Franco Salón Beauty

# SMS (SendGrid) - Agregar estas
SMS_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Mismo que SENDGRID_API_KEY
SMS_FROM_NUMBER=+521234567890  # Tu número de SendGrid con código de país
SMS_PROVIDER=sendgrid
```

---

## 🧪 Verificar Configuración

### 1. Revisar Logs de Render

Después de configurar, revisa los logs. Deberías ver:

```
✅ SMS configurado correctamente
✅ Provider: sendgrid
✅ From Number: +521234567890
```

O si no está configurado:

```
⚠️ SMS no configurado. Los SMS no se enviarán.
```

### 2. Probar Registro con SMS

1. Ve a tu aplicación de registro
2. Completa el formulario
3. Selecciona **"SMS"** como método de verificación
4. Ingresa un número de teléfono válido (formato: `+521234567890`)
5. Completa el registro
6. Deberías recibir un SMS con el código OTP

---

## 🔄 Fallback Automático (Ya Implementado)

Si SMS **NO está configurado**:

1. El backend detecta que SMS no está disponible
2. **Automáticamente hace fallback a Email** (usando SendGrid)
3. El frontend muestra mensaje claro al usuario
4. El usuario recibe el código por Email

**No necesitas hacer nada adicional** - el fallback ya está implementado.

---

## ⚠️ Modo Desarrollo vs Producción

Según la guía del backend (`GUIA_CONFIGURAR_SMS.md`):

### En Desarrollo (Local)

Si SMS **NO está configurado**:
- El sistema **simula** el envío de SMS
- Muestra el código en la consola:
  ```
  📱 [SIMULADO] SMS enviado a +521234567890: Tu código de verificación Miru Franco es: 123456. Expira en 2 minutos.
  ```

### En Producción (Render)

Si SMS **NO está configurado**:
- El sistema **lanza un error** si se intenta usar SMS sin configuración
- **Pero el frontend ya maneja esto** con fallback automático a Email
- El usuario recibe el código por Email automáticamente

---

## 📝 Formato del Número de Teléfono

El número debe incluir código de país:

- ✅ **Correcto:** `+521234567890` (México)
- ✅ **Correcto:** `+1234567890` (USA/Canadá)
- ❌ **Incorrecto:** `1234567890` (sin código de país)

El sistema automáticamente formatea números mexicanos de 10 dígitos agregando `+52`.

---

## 🔍 Troubleshooting

### Error: "SMS no configurado"

**Causa:** Las variables de entorno no están configuradas.

**Solución:**
1. Verifica que `SMS_API_KEY`, `SMS_FROM_NUMBER`, y `SMS_PROVIDER` estén en Render
2. Asegúrate de que los valores sean correctos
3. Reinicia el servicio

### Error: "No se pudo enviar el SMS"

**Causa:** SendGrid SMS puede no estar disponible en tu plan.

**Solución:**
- El sistema automáticamente hace fallback a Email
- El usuario recibirá el código por Email
- No es necesario hacer nada adicional

### El SMS no llega

**Posibles causas:**
1. El número no tiene formato internacional (`+52...`)
2. SendGrid SMS no está disponible en tu plan
3. El número está bloqueado

**Solución:**
- Verifica el formato del número
- El sistema hará fallback automático a Email si SMS falla

---

## ✅ Checklist de Configuración

- [ ] Ir a Render Dashboard
- [ ] Agregar `SMS_API_KEY` (usar mismo valor que `SENDGRID_API_KEY`)
- [ ] Agregar `SMS_FROM_NUMBER` (con formato `+521234567890`)
- [ ] Agregar `SMS_PROVIDER=sendgrid`
- [ ] Guardar cambios
- [ ] Reiniciar servicio
- [ ] Verificar en logs que SMS esté configurado
- [ ] Probar registro con SMS
- [ ] Verificar que el código llegue por SMS

---

## ✅ Resumen

Según `GUIA_CONFIGURAR_SMS.md` del backend:

1. ✅ **Backend ya implementado** - SMS funciona igual que Email
2. ✅ **Solo configurar variables** en Render:
   - `SMS_API_KEY` (puede ser el mismo que `SENDGRID_API_KEY`)
   - `SMS_FROM_NUMBER` (número con código de país, ej: `+521234567890`)
   - `SMS_PROVIDER=sendgrid`
3. ✅ **Fallback automático** - Frontend maneja el fallback a Email si SMS falla
4. ✅ **Mismo patrón que Email** - Se maneja igual que SendGrid para emails

**Nota importante:** Según la guía del backend, en producción lanza error si SMS no está configurado, pero el frontend ya está preparado para manejar esto con fallback automático a Email.

¡Una vez configuradas las variables en Render, SMS funcionará automáticamente!

