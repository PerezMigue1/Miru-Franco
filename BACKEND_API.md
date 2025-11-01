# Especificación de API Backend - Miru Franco

Esta documentación describe los endpoints que el backend debe implementar para que el frontend funcione correctamente.

## Base URL

```
http://localhost:3001/api/auth  (desarrollo)
https://tu-api.com/api/auth     (producción)
```

## Autenticación

Los tokens JWT deben enviarse en el header `Authorization`:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. POST /api/auth/register

Registra un nuevo usuario.

**Request Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@email.com",
  "password": "Password123",
  "phone": "+1234567890"  // opcional
}
```

**Response 201 (Success):**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "juan@email.com",
    "name": "Juan Pérez",
    "phone": "+1234567890"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 409 (Conflict):**
```json
{
  "error": "El correo electrónico ya está registrado"
}
```

**Response 400 (Bad Request):**
```json
{
  "error": "Email, nombre y contraseña son requeridos"
}
```

---

### 2. POST /api/auth/login

Inicia sesión con un usuario existente.

**Request Body:**
```json
{
  "email": "juan@email.com",
  "password": "Password123"
}
```

**Response 200 (Success):**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "juan@email.com",
    "name": "Juan Pérez"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 401 (Unauthorized):**
```json
{
  "error": "Credenciales inválidas"
}
```

---

### 3. POST /api/auth/forgot-password

Solicita recuperación de contraseña por email.

**Request Body:**
```json
{
  "email": "juan@email.com",
  "method": "email"  // "email", "sms", o "security-questions"
}
```

**Response 200 (Success):**
```json
{
  "success": true,
  "message": "Se ha enviado un enlace de recuperación a tu correo electrónico"
}
```

**Nota:** Por seguridad, siempre retorna éxito incluso si el email no existe.

---

### 4. POST /api/auth/reset-password

Restablece la contraseña del usuario.

**Request Body:**
```json
{
  "token": "reset-token-from-email",  // opcional si viene de email
  "email": "juan@email.com",           // opcional si viene de SMS o security questions
  "password": "NewPassword123"
}
```

**Response 200 (Success):**
```json
{
  "success": true,
  "message": "Contraseña restablecida exitosamente"
}
```

**Response 400 (Bad Request):**
```json
{
  "error": "Token inválido o expirado"
}
```

---

### 5. PUT /api/auth/verify-sms

Envía un código de verificación por SMS.

**Request Body:**
```json
{
  "phone": "+1234567890"
}
```

**Response 200 (Success):**
```json
{
  "success": true,
  "message": "Código enviado por SMS"
}
```

**Response 400 (Bad Request):**
```json
{
  "error": "El número de teléfono es requerido"
}
```

---

### 6. POST /api/auth/verify-sms

Verifica el código SMS y retorna el email del usuario.

**Request Body:**
```json
{
  "phone": "+1234567890",
  "code": "123456"
}
```

**Response 200 (Success):**
```json
{
  "success": true,
  "email": "juan@email.com",
  "message": "Código verificado correctamente"
}
```

**Response 400 (Bad Request):**
```json
{
  "error": "Código inválido"
}
```

**Response 404 (Not Found):**
```json
{
  "error": "Usuario no encontrado"
}
```

---

### 7. GET /api/auth/verify-security-questions

Obtiene las preguntas de seguridad de un usuario.

**Query Parameters:**
```
?email=juan@email.com
```

**Response 200 (Success):**
```json
{
  "success": true,
  "questions": [
    {
      "question": "¿Cuál era el nombre de tu primera mascota?"
    },
    {
      "question": "¿En qué ciudad naciste?"
    },
    {
      "question": "¿Cuál era el nombre de tu mejor amigo/a de la infancia?"
    }
  ]
}
```

**Response 404 (Not Found):**
```json
{
  "error": "Usuario no encontrado o no tiene preguntas de seguridad configuradas"
}
```

---

### 8. POST /api/auth/verify-security-questions

Verifica las respuestas a las preguntas de seguridad.

**Request Body:**
```json
{
  "email": "juan@email.com",
  "answers": {
    "¿Cuál era el nombre de tu primera mascota?": "Max",
    "¿En qué ciudad naciste?": "Madrid",
    "¿Cuál era el nombre de tu mejor amigo/a de la infancia?": "María"
  }
}
```

**Response 200 (Success):**
```json
{
  "success": true,
  "message": "Respuestas verificadas correctamente"
}
```

**Response 400 (Bad Request):**
```json
{
  "error": "Una o más respuestas son incorrectas"
}
```

---

## Validaciones Requeridas

### Registro/Login
- Email debe ser válido (formato email)
- Contraseña mínimo 8 caracteres
- Contraseña debe contener mayúsculas, minúsculas y números

### Reset Password
- Contraseña debe cumplir los mismos requisitos que en registro
- Token debe ser válido y no expirado (si viene de email)

## Códigos de Estado HTTP

- `200` - OK (éxito)
- `201` - Created (registro exitoso)
- `400` - Bad Request (datos inválidos)
- `401` - Unauthorized (credenciales inválidas)
- `404` - Not Found (recurso no encontrado)
- `409` - Conflict (email ya registrado)
- `500` - Internal Server Error (error del servidor)

## Modelo de Usuario

```javascript
{
  _id: ObjectId,
  email: String (único, requerido),
  name: String (requerido),
  password: String (hasheado con bcrypt, requerido),
  phone: String (opcional),
  securityQuestions: [
    {
      question: String,
      answer: String (hasheado con bcrypt)
    }
  ],
  resetPasswordToken: String (opcional),
  resetPasswordExpires: Date (opcional),
  createdAt: Date,
  updatedAt: Date
}
```

## Seguridad

1. **Contraseñas:** Hashear con bcrypt (10 rounds mínimo)
2. **JWT:** Usar secret seguro, expiración recomendada: 7 días
3. **Tokens de reset:** Expirar en 1 hora
4. **Códigos SMS:** Expirar en 5 minutos
5. **Validación:** Validar todos los inputs en el backend
6. **Rate limiting:** Implementar límite de intentos para prevenir ataques

