# Miru Franco Web - Frontend

Aplicación frontend con autenticación completa usando Next.js, diseñada para comunicarse con un backend de Node.js/Express.

## 🚀 Características

- ✅ Login y Registro
- ✅ Recuperación de contraseña por Email
- ✅ Recuperación de contraseña por SMS
- ✅ Recuperación de contraseña por Preguntas de Seguridad
- ✅ Restablecimiento de contraseña
- ✅ Autenticación con JWT
- ✅ Diseño responsive con modo oscuro

## 📋 Requisitos Previos

- Node.js 18+
- Backend API corriendo (Node.js/Express)
- Cuenta en Vercel (para despliegue)

## 🔧 Configuración Local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local`:

```env
# URL de tu backend API
NEXT_PUBLIC_API_URL=http://localhost:3001/api/auth

# URL de la aplicación (para enlaces de reset password)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Nota:** En producción, `NEXT_PUBLIC_API_URL` debe apuntar a tu backend desplegado.

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🔌 Endpoints del Backend Requeridos

Tu backend debe implementar estos endpoints:

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/forgot-password` - Solicitar recuperación de contraseña
- `POST /api/auth/reset-password` - Restablecer contraseña
- `PUT /api/auth/verify-sms` - Enviar código SMS
- `POST /api/auth/verify-sms` - Verificar código SMS
- `GET /api/auth/verify-security-questions?email=...` - Obtener preguntas de seguridad
- `POST /api/auth/verify-security-questions` - Verificar respuestas

### Formato de Respuestas Esperadas

**Login/Register exitoso:**
```json
{
  "success": true,
  "user": {
    "_id": "userId",
    "email": "user@email.com",
    "name": "Nombre Usuario"
  },
  "token": "jwt-token-here"
}
```

**Errores:**
```json
{
  "error": "Mensaje de error"
}
```

## 🚀 Desplegar en Vercel

### 1. Preparar el repositorio

Asegúrate de que tu código esté en GitHub, GitLab o Bitbucket.

### 2. Conectar con Vercel

1. Ve a [Vercel](https://vercel.com)
2. Haz clic en "Import Project"
3. Selecciona tu repositorio
4. Configura las variables de entorno:

   - `NEXT_PUBLIC_API_URL`: URL de tu backend API (ej: `https://api.tudominio.com/api/auth`)
   - `NEXT_PUBLIC_APP_URL`: URL de tu aplicación en Vercel (ej: `https://miru-franco.vercel.app`)

### 3. Desplegar

Vercel detectará automáticamente Next.js y desplegará tu aplicación.

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── components/
│   │   ├── AuthContainer.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── ForgotPasswordSMS.tsx
│   │   ├── ForgotPasswordSecurityQuestions.tsx
│   │   └── ResetPassword.tsx
│   ├── layout.tsx
│   └── page.tsx
└── lib/
    └── api.ts          # Cliente API para comunicarse con el backend
```

## 🛠️ Tecnologías

- **Next.js 16** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **React 19** - Biblioteca UI

## 📝 Notas Importantes

- Este es un proyecto **solo frontend**
- Todas las llamadas API se hacen a un backend externo
- Las variables con `NEXT_PUBLIC_` están disponibles en el cliente
- El token JWT se guarda en `localStorage`

## 🔒 Seguridad

- Los tokens JWT se almacenan en `localStorage`
- Considera implementar HttpOnly cookies en el backend para mayor seguridad
- Las contraseñas nunca se envían en texto plano (se hashean en el backend)

## 📄 Licencia

Este proyecto es privado.
