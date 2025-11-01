# Miru Franco Web

Aplicación web con autenticación completa usando Next.js, MongoDB Atlas y Vercel.

## 🚀 Características

- ✅ Login y Registro
- ✅ Recuperación de contraseña por Email
- ✅ Recuperación de contraseña por SMS
- ✅ Recuperación de contraseña por Preguntas de Seguridad
- ✅ Restablecimiento de contraseña
- ✅ Autenticación con JWT
- ✅ Contraseñas hasheadas con bcrypt

## 📋 Requisitos Previos

- Node.js 18+ 
- MongoDB Atlas (cuenta gratuita)
- Cuenta en Vercel (para despliegue)

## 🔧 Configuración Local

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.local.example` a `.env.local`:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales:

```env
MONGODB_URI=mongodb+srv://tu-usuario:tu-password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=miru-franco
JWT_SECRET=tu-clave-secreta-super-segura
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Obtener MongoDB Atlas Connection String

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un cluster gratuito
3. Ve a "Database Access" y crea un usuario
4. Ve a "Network Access" y permite acceso desde todas las IPs (0.0.0.0/0) para desarrollo
5. Ve a "Database" → "Connect" → "Connect your application"
6. Copia la connection string y reemplaza `<password>` con tu contraseña

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🚀 Desplegar en Vercel

### 1. Preparar el repositorio

Asegúrate de que tu código esté en GitHub, GitLab o Bitbucket.

### 2. Conectar con Vercel

1. Ve a [Vercel](https://vercel.com)
2. Haz clic en "Import Project"
3. Selecciona tu repositorio
4. Configura las variables de entorno:

   - `MONGODB_URI`: Tu connection string de MongoDB Atlas
   - `MONGODB_DB_NAME`: Nombre de tu base de datos
   - `JWT_SECRET`: Una clave secreta segura (usa un generador de secretos)
   - `JWT_EXPIRES_IN`: `7d` (o el valor que prefieras)
   - `NEXT_PUBLIC_APP_URL`: La URL de tu aplicación en Vercel (ej: `https://tu-app.vercel.app`)

### 3. Desplegar

Vercel detectará automáticamente Next.js y desplegará tu aplicación.

### 4. Configurar Network Access en MongoDB Atlas

En MongoDB Atlas, asegúrate de permitir el acceso desde la IP de Vercel. Para producción, puedes:

- Agregar las IPs de Vercel específicamente, o
- Usar `0.0.0.0/0` (menos seguro pero funcional para desarrollo)

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts
│   │       ├── register/route.ts
│   │       ├── forgot-password/route.ts
│   │       ├── reset-password/route.ts
│   │       ├── verify-sms/route.ts
│   │       └── verify-security-questions/route.ts
│   ├── components/
│   │   ├── AuthContainer.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── ForgotPasswordSMS.tsx
│   │   ├── ForgotPasswordSecurityQuestions.tsx
│   │   └── ResetPassword.tsx
│   ├── lib/
│   │   ├── mongodb.ts
│   │   ├── auth.ts
│   │   └── models/
│   │       └── User.ts
│   ├── layout.tsx
│   └── page.tsx
```

## 🔐 API Endpoints

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/forgot-password` - Solicitar recuperación de contraseña
- `POST /api/auth/reset-password` - Restablecer contraseña
- `PUT /api/auth/verify-sms` - Enviar código SMS
- `POST /api/auth/verify-sms` - Verificar código SMS
- `GET /api/auth/verify-security-questions?email=...` - Obtener preguntas de seguridad
- `POST /api/auth/verify-security-questions` - Verificar respuestas

## 🛠️ Tecnologías

- **Next.js 16** - Framework React
- **MongoDB Atlas** - Base de datos
- **Vercel** - Hosting y despliegue
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **bcryptjs** - Hash de contraseñas
- **jsonwebtoken** - Autenticación JWT

## 📝 Notas

- Las contraseñas se hashean con bcrypt antes de guardarse
- Los tokens JWT se usan para autenticación
- Los tokens de reset expiran en 1 hora
- Los códigos SMS expiran en 5 minutos
- Las respuestas de seguridad se hashean antes de guardarse

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens JWT seguros
- ✅ Validación de entrada
- ✅ Protección contra inyecciones
- ✅ Tokens con expiración

## 📄 Licencia

Este proyecto es privado.
