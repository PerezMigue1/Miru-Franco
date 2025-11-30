# 📊 Guía: Cambios en Base de Datos para Verificación SMS

## ✅ Respuesta Corta

**Probablemente NO necesitas cambios en la base de datos** si tu backend ya está implementado según la guía `GUIA_ACTUALIZAR_FRONTEND_SMS.md`.

Sin embargo, aquí te explico qué verificar:

---

## 🔍 Verificación de Campos Existentes

### Campos que YA deberías tener (para OTP):

Si ya implementaste la verificación OTP por email, tu tabla/modelo `Usuario` debería tener:

```javascript
// Campos necesarios para OTP (ya deberían existir)
codigoOTP: {
  type: String,
  default: null
},
otpExpira: {
  type: Date,
  default: null
},
confirmado: {
  type: Boolean,
  default: false
},
telefono: {
  type: String,
  required: true // ✅ Este campo es necesario para SMS
}
```

### ✅ Campo `telefono` es CRÍTICO

El campo `telefono` **DEBE existir** en tu base de datos porque:
- El frontend lo envía en el registro
- El backend lo necesita para enviar SMS
- Si no existe, el SMS no funcionará

---

## 🔧 Cambios Opcionales (Recomendados)

### Opción 1: Guardar Preferencia del Usuario (Opcional)

Si quieres recordar la preferencia del usuario para futuros reenvíos, puedes agregar:

```javascript
// Campo OPCIONAL - Solo si quieres guardar la preferencia
metodoVerificacionPreferido: {
  type: String,
  enum: ['email', 'sms'],
  default: 'email'
}
```

**Ventajas:**
- El usuario no tiene que elegir cada vez
- Puedes usar la preferencia guardada en futuros reenvíos

**Desventajas:**
- Requiere migración de base de datos
- No es estrictamente necesario (el frontend puede recordarlo en localStorage)

### Opción 2: NO Guardar Preferencia (Recomendado)

El campo `metodoVerificacion` se envía en cada petición desde el frontend, por lo que **NO necesitas guardarlo en la base de datos**.

**Ventajas:**
- No requiere cambios en la base de datos
- El usuario puede cambiar de método en cada registro/reenvío
- Más flexible

---

## 📋 Checklist de Verificación

### ✅ Verifica que tu modelo Usuario tenga:

- [ ] Campo `telefono` (String) - **OBLIGATORIO para SMS**
- [ ] Campo `codigoOTP` (String, nullable) - Para guardar el código
- [ ] Campo `otpExpira` (Date, nullable) - Para expiración del código
- [ ] Campo `confirmado` (Boolean, default: false) - Estado de verificación
- [ ] Campo `email` (String) - Para verificación por email

### ❌ NO necesitas agregar:

- [ ] Campo `metodoVerificacion` en la base de datos (se envía en cada petición)
- [ ] Campos adicionales para SMS (el teléfono ya está en `telefono`)

---

## 🔄 Migración de Base de Datos (Si falta algo)

### Si usas MongoDB/Mongoose:

```javascript
// Ejemplo de migración (si falta el campo telefono)
db.usuarios.updateMany(
  { telefono: { $exists: false } },
  { $set: { telefono: "" } }
);
```

### Si usas SQL (PostgreSQL/MySQL):

```sql
-- Agregar campo telefono si no existe
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

-- Agregar campos OTP si no existen
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS codigo_otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expira TIMESTAMP,
ADD COLUMN IF NOT EXISTS confirmado BOOLEAN DEFAULT false;
```

---

## 🎯 Resumen

### ✅ Lo que SÍ necesitas:

1. **Campo `telefono`** en la tabla `usuarios` (obligatorio)
2. **Campos OTP existentes** (`codigoOTP`, `otpExpira`, `confirmado`)

### ❌ Lo que NO necesitas:

1. Campo `metodoVerificacion` en la base de datos
2. Campos adicionales específicos para SMS

### 💡 Recomendación:

**Si tu backend ya está implementado según la guía**, probablemente ya tienes todos los campos necesarios. Solo verifica que:

1. El campo `telefono` existe y está siendo guardado correctamente
2. El backend puede leer el campo `telefono` para enviar SMS
3. El servicio de SMS (Twilio u otro) está configurado en el backend

---

## 🧪 Cómo Verificar

### 1. Verifica tu modelo/schema:

```javascript
// En tu backend, revisa el modelo Usuario
console.log(Usuario.schema.paths); // Mongoose
// o
console.log(Usuario.rawAttributes); // Sequelize
```

### 2. Verifica que el teléfono se guarda:

```javascript
// Después de un registro, verifica en la base de datos
const usuario = await Usuario.findOne({ email: 'test@example.com' });
console.log('Teléfono guardado:', usuario.telefono);
```

### 3. Prueba el flujo completo:

1. Registra un usuario con método SMS
2. Verifica que el teléfono se guarda en la base de datos
3. Verifica que el código OTP se genera y guarda
4. Verifica que el SMS se envía correctamente

---

## ✅ Conclusión

**En la mayoría de los casos, NO necesitas cambios en la base de datos** si:
- Ya tienes el campo `telefono`
- Ya tienes los campos OTP (`codigoOTP`, `otpExpira`, `confirmado`)
- Tu backend ya está configurado para recibir `metodoVerificacion` en las peticiones

El campo `metodoVerificacion` es solo un parámetro que se envía en cada petición HTTP, no necesita guardarse en la base de datos.

