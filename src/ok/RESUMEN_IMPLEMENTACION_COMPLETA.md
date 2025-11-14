# Resumen: Implementación Completa de Verificación OTP

Esta guía resume todos los pasos necesarios para implementar completamente la verificación de correo con OTP.

## ✅ Lo que YA está hecho (Frontend)

El frontend ya está completamente implementado y listo:

- ✅ Componente `ActivateAccount` creado
- ✅ Funciones de API (`verifyOTP`, `resendOTPCode`) agregadas
- ✅ Integración en `Register.tsx` y `Login.tsx`
- ✅ Manejo de errores y validaciones
- ✅ UI completa y funcional

**No necesitas hacer nada más en el frontend.**

---

## 🔧 Lo que DEBES hacer (Backend)

### Paso 1: Configurar SendGrid (15-20 minutos)

1. **Crear cuenta en SendGrid:**
   - Ve a [https://sendgrid.com/](https://sendgrid.com/)
   - Regístrate (plan gratuito: 100 emails/día)
   - Verifica tu email

2. **Obtener API Key:**
   - Settings → API Keys → Create API Key
   - Copia y guarda la API Key (solo se muestra una vez)

3. **Configurar variables de entorno:**
   ```env
   SENDGRID_API_KEY=SG.tu_api_key_aqui
   SENDGRID_FROM_EMAIL=noreply@sendgrid.net
   SENDGRID_FROM_NAME=Miru Franco Salón Beauty
   ```

**📖 Guía detallada:** Lee `GUIA_CONFIGURACION_SENDGRID.md`

---

### Paso 2: Modificar el Modelo de Usuario (5 minutos)

Agregar estos campos al esquema de Usuario:

```javascript
codigoOTP: { type: String, default: null },
otpExpira: { type: Date, default: null },
confirmado: { type: Boolean, default: false }
```

**📖 Código completo:** Ver sección 1 de `GUIA_VERIFICACION_OTP_BACKEND.md`

---

### Paso 3: Instalar Dependencia de SendGrid (1 minuto)

```bash
npm install @sendgrid/mail
```

---

### Paso 4: Crear Utilidad para Enviar Emails (10 minutos)

Crear archivo `utils/sendEmail.js` con la función `sendOTPEmail`.

**📖 Código completo:** Ver sección 2 de `GUIA_VERIFICACION_OTP_BACKEND.md`

---

### Paso 5: Modificar Controlador de Registro (15 minutos)

Modificar la función `registerUser` para:
- Generar código OTP de 6 dígitos
- Guardar `codigoOTP` y `otpExpira` en el usuario
- Marcar `confirmado: false`
- Enviar correo con el código
- Responder con `requiereVerificacion: true`

**📖 Código completo:** Ver sección 3 de `GUIA_VERIFICACION_OTP_BACKEND.md`

---

### Paso 6: Crear Endpoint de Verificación OTP (10 minutos)

Crear función `verificarOTP` que:
- Recibe `email` y `codigo`
- Verifica que el código exista y no haya expirado
- Verifica que el código coincida
- Marca `confirmado: true` y limpia el código

**Endpoint:** `POST /api/usuarios/verificar-otp`

**📖 Código completo:** Ver sección 4.1 de `GUIA_VERIFICACION_OTP_BACKEND.md`

---

### Paso 7: Crear Endpoint de Reenvío (10 minutos)

Crear función `reenviarCodigo` que:
- Recibe `email`
- Genera nuevo código OTP
- Actualiza `codigoOTP` y `otpExpira`
- Envía nuevo correo

**Endpoint:** `POST /api/usuarios/reenviar-codigo`

**📖 Código completo:** Ver sección 4.2 de `GUIA_VERIFICACION_OTP_BACKEND.md`

---

### Paso 8: Modificar Login (5 minutos)

Modificar la función `login` para verificar que `confirmado: true` antes de permitir login.

**📖 Código completo:** Ver sección 5 de `GUIA_VERIFICACION_OTP_BACKEND.md`

---

### Paso 9: Agregar Rutas (5 minutos)

Agregar las nuevas rutas en tu archivo de rutas:

```javascript
router.post("/verificar-otp", verificarOTP);
router.post("/reenviar-codigo", reenviarCodigo);
```

**📖 Código completo:** Ver sección 6 de `GUIA_VERIFICACION_OTP_BACKEND.md`

---

### Paso 10: Probar Todo (15 minutos)

1. **Probar registro:**
   - Registra un nuevo usuario
   - Verifica que recibas el correo con el código OTP

2. **Probar verificación:**
   - Ingresa el código OTP
   - Verifica que la cuenta se active

3. **Probar login:**
   - Intenta login sin activar → debe mostrar error
   - Activa la cuenta
   - Intenta login → debe funcionar

4. **Probar reenvío:**
   - Haz clic en "Reenviar código"
   - Verifica que recibas nuevo correo

---

## 📋 Checklist Completo

### Configuración Inicial:
- [ ] Crear cuenta en SendGrid
- [ ] Obtener API Key de SendGrid
- [ ] Configurar variables de entorno (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`)
- [ ] Instalar `@sendgrid/mail` en backend

### Modificaciones al Backend:
- [ ] Agregar campos `codigoOTP`, `otpExpira`, `confirmado` al modelo Usuario
- [ ] Crear archivo `utils/sendEmail.js` con función `sendOTPEmail`
- [ ] Modificar función `registerUser` para generar y enviar OTP
- [ ] Crear función `verificarOTP` (endpoint `/api/usuarios/verificar-otp`)
- [ ] Crear función `reenviarCodigo` (endpoint `/api/usuarios/reenviar-codigo`)
- [ ] Modificar función `login` para verificar `confirmado: true`
- [ ] Agregar rutas en `routes/auth.js`

### Pruebas:
- [ ] Probar registro y recepción de correo
- [ ] Probar verificación de código OTP
- [ ] Probar login con cuenta no activada
- [ ] Probar login con cuenta activada
- [ ] Probar reenvío de código

---

## 🎯 Tiempo Estimado Total

- **Configuración de SendGrid:** 15-20 minutos
- **Implementación del Backend:** 1-2 horas
- **Pruebas:** 15-20 minutos
- **Total:** 2-3 horas

---

## 📚 Documentos de Referencia

1. **`GUIA_CONFIGURACION_SENDGRID.md`**
   - Cómo crear cuenta en SendGrid
   - Cómo obtener API Key
   - Cómo configurar variables de entorno
   - Solución de problemas

2. **`GUIA_VERIFICACION_OTP_BACKEND.md`**
   - Código completo para todos los endpoints
   - Modificaciones al modelo
   - Flujo completo paso a paso

---

## 🆘 Si Tienes Problemas

### El correo no se envía:
1. Verifica que `SENDGRID_API_KEY` esté correcta
2. Verifica que `SENDGRID_FROM_EMAIL` esté verificado
3. Revisa los logs del servidor
4. Revisa el dashboard de SendGrid para ver errores

### El código no se verifica:
1. Verifica que el código no haya expirado (2 minutos)
2. Verifica que el código coincida exactamente
3. Revisa los logs del backend

### El login no funciona después de activar:
1. Verifica que `confirmado: true` se guarde en la base de datos
2. Verifica que el login verifique el campo `confirmado`

---

## ✅ Una vez completado

Cuando termines todos los pasos:
1. El frontend ya está listo y funcionará automáticamente
2. Los usuarios recibirán códigos OTP por correo
3. Los usuarios deberán activar su cuenta antes de poder iniciar sesión
4. Todo el flujo estará completamente funcional

**¡Buena suerte con la implementación!** 🚀

