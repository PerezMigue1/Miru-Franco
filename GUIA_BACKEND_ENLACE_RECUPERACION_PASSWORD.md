# 🔐 Guía Backend: Sistema de Enlace de Recuperación de Contraseña

Esta guía detalla los cambios necesarios en el backend para implementar el sistema de recuperación de contraseña mediante enlace por email, que reemplaza el flujo anterior de OTP para este método.

## 📋 Resumen de Cambios

El frontend ahora:
1. Solicita el enlace de recuperación directamente (sin código OTP)
2. Muestra una pantalla de éxito cuando se envía el enlace
3. El usuario hace clic en el enlace del correo
4. Se valida el token y se permite cambiar la contraseña
5. Después de cambiar la contraseña, se redirige al login

## 🔌 Endpoints Requeridos

### 1. Solicitar Enlace de Recuperación

**Endpoint:** `POST /api/usuarios/solicitar-enlace-recuperacion`

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Response Exitosa (200):**
```json
{
  "success": true,
  "message": "Si el email existe, se ha enviado un enlace de recuperación"
}
```

**Response Error (400/404):**
```json
{
  "success": false,
  "error": "Email no encontrado" // o mensaje genérico de seguridad
}
```

**Lógica del Endpoint:**
1. Validar que el email existe en la base de datos
2. Generar un token único y seguro (UUID o similar)
3. Guardar el token en la base de datos con:
   - Email del usuario
   - Fecha de expiración (10 minutos desde ahora)
   - Estado: "pendiente"
   - Fecha de creación
4. Enviar email con el enlace: `https://tudominio.com/reset-password?token={token}&email={email}`
5. **IMPORTANTE:** No revelar si el email existe o no (por seguridad, siempre devolver éxito)

**Ejemplo de Implementación (Node.js/Express):**
```javascript
app.post('/api/usuarios/solicitar-enlace-recuperacion', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validar formato de email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }
    
    // Buscar usuario
    const usuario = await Usuario.findOne({ where: { email } });
    
    // Por seguridad, siempre devolver éxito (no revelar si el email existe)
    if (!usuario) {
      return res.json({
        success: true,
        message: 'Si el email existe, se ha enviado un enlace de recuperación'
      });
    }
    
    // Generar token único
    const token = crypto.randomUUID(); // o usar otra librería de generación de tokens
    
    // Calcular fecha de expiración (10 minutos)
    const fechaExpiracion = new Date();
    fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 10);
    
    // Guardar token en base de datos
    await TokenRecuperacion.create({
      email: usuario.email,
      token: token,
      expiraEn: fechaExpiracion,
      estado: 'pendiente',
      createdAt: new Date()
    });
    
    // Enviar email con el enlace
    const enlace = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    await enviarEmail({
      to: email,
      subject: 'Recuperación de Contraseña',
      html: `
        <h2>Recuperación de Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
        <a href="${enlace}">Restablecer Contraseña</a>
        <p>Este enlace expirará en 10 minutos.</p>
        <p>Si no solicitaste este cambio, ignora este email.</p>
      `
    });
    
    res.json({
      success: true,
      message: 'Si el email existe, se ha enviado un enlace de recuperación'
    });
    
  } catch (error) {
    console.error('Error solicitando enlace:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud'
    });
  }
});
```

---

### 2. Validar Token de Recuperación

**Endpoint:** `POST /api/usuarios/validar-token-recuperacion`

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "token": "token-generado-anteriormente"
}
```

**Response Exitosa (200):**
```json
{
  "success": true,
  "valid": true,
  "message": "Token válido",
  "nombre": "Nombre del Usuario" // Opcional, para mostrar en el frontend
}
```

**Response Error - Token Inválido (400):**
```json
{
  "success": false,
  "valid": false,
  "error": "Token inválido, expirado o ya utilizado"
}
```

**Lógica del Endpoint:**
1. Buscar el token en la base de datos
2. Verificar que:
   - El token existe
   - El email coincide
   - El token no ha expirado (fecha actual < fecha de expiración)
   - El token está en estado "pendiente" (no usado)
3. Si es válido, devolver éxito con información del usuario (opcional)
4. Si no es válido, devolver error

**Ejemplo de Implementación:**
```javascript
app.post('/api/usuarios/validar-token-recuperacion', async (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Email y token son requeridos'
      });
    }
    
    // Buscar token en base de datos
    const tokenRecuperacion = await TokenRecuperacion.findOne({
      where: {
        email: email,
        token: token,
        estado: 'pendiente'
      }
    });
    
    if (!tokenRecuperacion) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Token inválido, expirado o ya utilizado'
      });
    }
    
    // Verificar que no haya expirado
    const ahora = new Date();
    if (ahora > new Date(tokenRecuperacion.expiraEn)) {
      // Marcar como expirado
      await tokenRecuperacion.update({ estado: 'expirado' });
      
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Token inválido, expirado o ya utilizado'
      });
    }
    
    // Obtener información del usuario (opcional)
    const usuario = await Usuario.findOne({ where: { email } });
    
    res.json({
      success: true,
      valid: true,
      message: 'Token válido',
      nombre: usuario?.nombre || null
    });
    
  } catch (error) {
    console.error('Error validando token:', error);
    res.status(500).json({
      success: false,
      valid: false,
      error: 'Error al validar el token'
    });
  }
});
```

---

### 3. Cambiar Contraseña con Token

**Endpoint:** `POST /api/usuarios/cambiar-password`

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "token": "token-generado",
  "nuevaPassword": "NuevaContraseña123!"
}
```

**Response Exitosa (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

**Response Error - Token Inválido (400):**
```json
{
  "success": false,
  "error": "Token inválido, expirado o ya utilizado"
}
```

**Response Error - Contraseña Igual (400):**
```json
{
  "success": false,
  "error": "La nueva contraseña debe ser diferente a la contraseña anterior"
}
```

**Response Error - Validación de Contraseña (400):**
```json
{
  "success": false,
  "error": "La contraseña no cumple con los requisitos de seguridad"
}
```

**Lógica del Endpoint:**
1. Validar que el token existe y es válido (misma lógica que el endpoint anterior)
2. Validar la nueva contraseña según los requisitos:
   - Mínimo 8 caracteres
   - Al menos una mayúscula
   - Al menos una minúscula
   - Al menos un número
   - Al menos un carácter especial
   - No debe contener información personal (nombre, email, teléfono, etc.)
   - No debe ser una secuencia simple (123456, abcdef, etc.)
   - No debe ser una contraseña común
3. **IMPORTANTE:** Verificar que la nueva contraseña NO sea igual a la contraseña actual
4. Si todo es válido:
   - Hashear la nueva contraseña
   - Actualizar la contraseña del usuario
   - Marcar el token como "usado"
   - Invalidar todos los tokens de sesión del usuario (por seguridad)

**Ejemplo de Implementación:**
```javascript
const bcrypt = require('bcrypt');

app.post('/api/usuarios/cambiar-password', async (req, res) => {
  try {
    const { email, token, nuevaPassword } = req.body;
    
    if (!email || !token || !nuevaPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, token y nueva contraseña son requeridos'
      });
    }
    
    // 1. Validar token
    const tokenRecuperacion = await TokenRecuperacion.findOne({
      where: {
        email: email,
        token: token,
        estado: 'pendiente'
      }
    });
    
    if (!tokenRecuperacion) {
      return res.status(400).json({
        success: false,
        error: 'Token inválido, expirado o ya utilizado'
      });
    }
    
    // Verificar expiración
    const ahora = new Date();
    if (ahora > new Date(tokenRecuperacion.expiraEn)) {
      await tokenRecuperacion.update({ estado: 'expirado' });
      return res.status(400).json({
        success: false,
        error: 'Token inválido, expirado o ya utilizado'
      });
    }
    
    // 2. Obtener usuario
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    // 3. Verificar que la nueva contraseña NO sea igual a la anterior
    const contraseñaCoincide = await bcrypt.compare(nuevaPassword, usuario.password);
    if (contraseñaCoincide) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe ser diferente a la contraseña anterior'
      });
    }
    
    // 4. Validar requisitos de la contraseña
    const validacion = validarContraseña(nuevaPassword, {
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      fechaNacimiento: usuario.fechaNacimiento
    });
    
    if (!validacion.valida) {
      return res.status(400).json({
        success: false,
        error: validacion.mensaje || 'La contraseña no cumple con los requisitos de seguridad'
      });
    }
    
    // 5. Hashear nueva contraseña
    const saltRounds = 10;
    const hashNuevaPassword = await bcrypt.hash(nuevaPassword, saltRounds);
    
    // 6. Actualizar contraseña
    await usuario.update({ password: hashNuevaPassword });
    
    // 7. Marcar token como usado
    await tokenRecuperacion.update({ estado: 'usado' });
    
    // 8. Invalidar todos los tokens de sesión del usuario (opcional pero recomendado)
    await TokenSesion.destroy({ where: { usuarioId: usuario.id } });
    
    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
    
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la contraseña'
    });
  }
});

// Función de validación de contraseña
function validarContraseña(password, datosUsuario = {}) {
  // Mínimo 8 caracteres
  if (password.length < 8) {
    return { valida: false, mensaje: 'La contraseña debe tener al menos 8 caracteres' };
  }
  
  // Al menos una mayúscula
  if (!/[A-Z]/.test(password)) {
    return { valida: false, mensaje: 'La contraseña debe contener al menos una letra mayúscula' };
  }
  
  // Al menos una minúscula
  if (!/[a-z]/.test(password)) {
    return { valida: false, mensaje: 'La contraseña debe contener al menos una letra minúscula' };
  }
  
  // Al menos un número
  if (!/[0-9]/.test(password)) {
    return { valida: false, mensaje: 'La contraseña debe contener al menos un número' };
  }
  
  // Al menos un carácter especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valida: false, mensaje: 'La contraseña debe contener al menos un carácter especial' };
  }
  
  // No debe contener información personal
  const lowerPassword = password.toLowerCase();
  if (datosUsuario.nombre && lowerPassword.includes(datosUsuario.nombre.toLowerCase())) {
    return { valida: false, mensaje: 'La contraseña no debe contener tu nombre' };
  }
  
  if (datosUsuario.email) {
    const emailLocal = datosUsuario.email.split('@')[0].toLowerCase();
    if (lowerPassword.includes(emailLocal)) {
      return { valida: false, mensaje: 'La contraseña no debe contener tu email' };
    }
  }
  
  if (datosUsuario.telefono && lowerPassword.includes(datosUsuario.telefono)) {
    return { valida: false, mensaje: 'La contraseña no debe contener tu teléfono' };
  }
  
  // No debe ser una secuencia simple
  const secuencias = ['123456', 'abcdef', 'qwerty', 'password'];
  for (const secuencia of secuencias) {
    if (lowerPassword.includes(secuencia)) {
      return { valida: false, mensaje: 'La contraseña no debe contener secuencias simples' };
    }
  }
  
  return { valida: true };
}
```

---

## 🗄️ Estructura de Base de Datos

### Tabla: `tokens_recuperacion` (o similar)

```sql
CREATE TABLE tokens_recuperacion (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expira_en DATETIME NOT NULL,
  estado ENUM('pendiente', 'usado', 'expirado') DEFAULT 'pendiente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_token (token),
  INDEX idx_estado (estado)
);
```

**Campos:**
- `id`: Identificador único
- `email`: Email del usuario que solicita la recuperación
- `token`: Token único generado
- `expira_en`: Fecha y hora de expiración (10 minutos después de la creación)
- `estado`: Estado del token (pendiente, usado, expirado)
- `created_at`: Fecha de creación

**Índices recomendados:**
- Índice en `email` para búsquedas rápidas
- Índice en `token` para validaciones
- Índice en `estado` para limpieza de tokens expirados

---

## ⏰ Expiración del Token

**Tiempo de expiración:** 10 minutos

**Cálculo:**
```javascript
const fechaExpiracion = new Date();
fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 10);
```

**Limpieza de tokens expirados (opcional):**
Puedes crear un job/cron que limpie tokens expirados periódicamente:

```javascript
// Ejecutar cada hora
setInterval(async () => {
  await TokenRecuperacion.update(
    { estado: 'expirado' },
    { 
      where: { 
        estado: 'pendiente',
        expira_en: { [Op.lt]: new Date() }
      }
    }
  );
}, 60 * 60 * 1000); // Cada hora
```

---

## 🔒 Validaciones Importantes

### 1. Validación de Contraseña

La nueva contraseña debe:
- ✅ Tener mínimo 8 caracteres
- ✅ Contener al menos una mayúscula
- ✅ Contener al menos una minúscula
- ✅ Contener al menos un número
- ✅ Contener al menos un carácter especial
- ✅ NO contener información personal (nombre, email, teléfono)
- ✅ NO ser una secuencia simple (123456, abcdef, etc.)
- ✅ NO ser igual a la contraseña anterior

### 2. Seguridad del Token

- ✅ Generar tokens únicos y seguros (UUID, crypto.randomBytes, etc.)
- ✅ No reutilizar tokens
- ✅ Marcar tokens como "usado" después de cambiar la contraseña
- ✅ Verificar expiración en cada validación
- ✅ Invalidar tokens de sesión después de cambiar contraseña

### 3. Seguridad de la Respuesta

- ✅ No revelar si un email existe o no (siempre devolver éxito)
- ✅ No exponer información sensible en errores
- ✅ Usar mensajes genéricos de error

---

## 📧 Template de Email

**Asunto:** Recuperación de Contraseña

**Contenido HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recuperación de Contraseña</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #710014;">Recuperación de Contraseña</h2>
    
    <p>Hola,</p>
    
    <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{ENLACE}" 
         style="background-color: #710014; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 5px; display: inline-block;">
        Restablecer Contraseña
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      <strong>Importante:</strong> Este enlace expirará en 10 minutos.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      Si no solicitaste este cambio, puedes ignorar este email de forma segura.
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
      <span style="word-break: break-all;">{ENLACE}</span>
    </p>
  </div>
</body>
</html>
```

---

## 🔄 Flujo Completo

1. **Usuario solicita enlace:**
   - Frontend: `POST /api/usuarios/solicitar-enlace-recuperacion`
   - Backend: Genera token, guarda en BD, envía email
   - Frontend: Muestra pantalla de éxito

2. **Usuario hace clic en enlace:**
   - Frontend: Abre `/reset-password?token=XXX&email=YYY`
   - Frontend: `POST /api/usuarios/validar-token-recuperacion`
   - Backend: Valida token y devuelve si es válido

3. **Usuario cambia contraseña:**
   - Frontend: `POST /api/usuarios/cambiar-password`
   - Backend: Valida token, verifica nueva contraseña, actualiza
   - Frontend: Redirige al login

---

## ✅ Checklist de Implementación

- [ ] Crear endpoint `POST /api/usuarios/solicitar-enlace-recuperacion`
- [ ] Crear endpoint `POST /api/usuarios/validar-token-recuperacion`
- [ ] Actualizar endpoint `POST /api/usuarios/cambiar-password` para validar token
- [ ] Crear tabla `tokens_recuperacion` en base de datos
- [ ] Implementar generación de tokens seguros
- [ ] Implementar expiración de 10 minutos
- [ ] Implementar validación de contraseña (no igual a la anterior)
- [ ] Implementar validación completa de requisitos de contraseña
- [ ] Configurar envío de emails con enlace
- [ ] Invalidar tokens de sesión después de cambiar contraseña
- [ ] Implementar limpieza de tokens expirados (opcional)
- [ ] Probar flujo completo end-to-end

---

## 🧪 Casos de Prueba

### 1. Solicitar Enlace
- ✅ Email válido existente → Envía email
- ✅ Email válido no existente → Devuelve éxito (por seguridad)
- ✅ Email inválido → Error 400

### 2. Validar Token
- ✅ Token válido y no expirado → Válido
- ✅ Token expirado → Inválido
- ✅ Token usado → Inválido
- ✅ Token no existe → Inválido

### 3. Cambiar Contraseña
- ✅ Token válido + contraseña válida + diferente a anterior → Éxito
- ✅ Token inválido → Error
- ✅ Contraseña igual a anterior → Error
- ✅ Contraseña no cumple requisitos → Error
- ✅ Token expirado → Error

---

## 📝 Notas Adicionales

1. **Seguridad:** Siempre usar HTTPS en producción
2. **Rate Limiting:** Considerar limitar solicitudes de enlace por IP/email
3. **Logs:** Registrar intentos de recuperación para auditoría
4. **Notificaciones:** Considerar notificar al usuario cuando se cambie la contraseña
5. **Tokens Múltiples:** Permitir múltiples tokens pendientes o invalidar los anteriores

---

## 🔗 Referencias

- Frontend: Ver `src/app/services/auth.ts` para ver cómo se consumen estos endpoints
- Frontend: Ver `src/app/components/auth/ForgotPassword.tsx` para el flujo completo
- Frontend: Ver `src/app/reset-password/page.tsx` para la página de reset

---

**Última actualización:** Diciembre 2024

