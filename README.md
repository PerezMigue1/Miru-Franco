# Miru Franco Web - Frontend

Aplicación web frontend desarrollada con Next.js para el salón de belleza Miru Franco. Sistema completo de autenticación, gestión de usuarios y reservas con interfaz moderna y responsive.

## Descripción

Miru Franco Web es una aplicación frontend construida con Next.js 16 y TypeScript que proporciona una experiencia de usuario completa para el salón de belleza Miru Franco. Incluye sistema de autenticación robusto, gestión de perfil de usuario, reservas y catálogo de servicios y productos.

## Características Principales

- **Autenticación Completa**: Login, registro con verificación de correo electrónico mediante OTP
- **Recuperación de Contraseña**: Múltiples métodos (email, SMS, preguntas de seguridad)
- **Validación en Tiempo Real**: Verificación de correo electrónico durante el registro
- **Actividad de Cuenta**: Verificación automática de correo con código OTP de 6 dígitos
- **Diseño Responsive**: Interfaz adaptable a dispositivos móviles y desktop
- **Modo Oscuro**: Soporte para temas claro y oscuro
- **Gestión de Perfil**: Configuración de perfil capilar, alergias y tratamientos previos
- **Sistema de Reservas**: Gestión de citas y servicios

## Tecnologías Utilizadas

### Core
- **Next.js 16.0.1** - Framework React para producción
- **React 19.2.0** - Biblioteca de interfaz de usuario
- **TypeScript 5** - Tipado estático para JavaScript
- **Tailwind CSS 4** - Framework de estilos utilitarios

### Autenticación y Seguridad
- **JWT (jsonwebtoken)** - Tokens de autenticación
- **bcryptjs** - Hashing de contraseñas
- **OTP** - Códigos de verificación de un solo uso

### Comunicación
- **Fetch API** - Cliente HTTP para comunicación con backend
- **REST API** - Integración con backend Node.js/Express

## Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- Backend API corriendo (Node.js/Express)
- Cuenta de email configurada (SendGrid o Mailgun) para verificación OTP

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/PerezMigue1/Miru-Franco.git
cd miru-franco-web
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env.local` en la raíz del proyecto:

```env
# URL del backend API
NEXT_PUBLIC_API_URL=https://backend-miru-franco.vercel.app

# URL de la aplicación (para enlaces de reset password)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Configuración de Google OAuth (opcional)
GOOGLE_CLIENT_ID=tu_google_client_id
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Estructura del Proyecto

```
miru-franco-web/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── ActivateAccount.tsx      # Verificación de cuenta con OTP
│   │   │   │   ├── AuthContainer.tsx        # Contenedor de autenticación
│   │   │   │   ├── Login.tsx                # Inicio de sesión
│   │   │   │   ├── Register.tsx             # Registro de usuario
│   │   │   │   ├── ForgotPassword.tsx       # Recuperación de contraseña
│   │   │   │   ├── ForgotPasswordSMS.tsx    # Recuperación por SMS
│   │   │   │   ├── ForgotPasswordSecurityQuestions.tsx  # Preguntas de seguridad
│   │   │   │   └── ResetPassword.tsx        # Restablecer contraseña
│   │   │   └── ui/
│   │   │       └── Carousel.tsx             # Componente de carrusel
│   │   ├── layouts/
│   │   │   ├── Header.tsx                   # Encabezado de la aplicación
│   │   │   ├── Footer.tsx                   # Pie de página
│   │   │   ├── MenuHamburguesa.tsx          # Menú móvil
│   │   │   └── MenuHorizontal.tsx           # Menú horizontal
│   │   ├── services/
│   │   │   ├── auth.ts                      # Servicio de autenticación
│   │   │   ├── client.ts                    # Cliente API HTTP
│   │   │   ├── config.ts                    # Configuración de API
│   │   │   └── index.ts                     # Exportaciones de servicios
│   │   ├── utils/
│   │   │   └── colors.ts                    # Paleta de colores
│   │   ├── styles/
│   │   │   └── globals.css                  # Estilos globales
│   │   ├── home/
│   │   │   └── page.tsx                     # Página de inicio
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx                 # Callback de OAuth
│   │   ├── terminos/
│   │   │   └── page.tsx                     # Términos y condiciones
│   │   ├── layout.tsx                       # Layout principal
│   │   └── page.tsx                         # Página principal
├── public/                                  # Archivos estáticos
├── package.json                             # Dependencias del proyecto
├── tsconfig.json                            # Configuración de TypeScript
├── next.config.ts                           # Configuración de Next.js
└── README.md                                # Este archivo
```

## API y Endpoints

### Endpoints de Autenticación

El frontend se comunica con el backend mediante los siguientes endpoints:

#### Registro y Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/verificar-correo` - Verificar si un correo existe (validación en tiempo real)
- `POST /api/auth/verificar-otp` - Verificar código OTP
- `POST /api/auth/reenviar-codigo` - Reenviar código OTP
- `POST /api/auth/google-register` - Registro con Google OAuth

#### Recuperación de Contraseña
- `POST /api/auth/recuperar-contrasenia` - Solicitar recuperación de contraseña
- `POST /api/auth/verificar-codigo-recuperacion` - Verificar código de recuperación
- `POST /api/auth/actualizar-contrasena` - Actualizar contraseña
- `POST /api/auth/obtener-pregunta-secreta` - Obtener pregunta secreta
- `POST /api/auth/verificar-respuesta` - Verificar respuesta a pregunta secreta

### Formato de Respuestas

#### Respuesta Exitosa de Login
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

#### Respuesta de Error
```json
{
  "success": false,
  "error": "Mensaje de error",
  "requiereVerificacion": true
}
```

#### Respuesta de Verificación de Correo
```json
{
  "existe": true,
  "message": "Este correo ya está registrado"
}
```

## Funcionalidades Implementadas

### Sistema de Registro
- Registro en 3 pasos (Información básica, Dirección, Perfil capilar)
- Validación en tiempo real de correo electrónico
- Verificación de cuenta mediante código OTP enviado por email
- Envío automático de código al mostrar pantalla de verificación
- Opción de saltar a login si no se verifica inmediatamente

### Sistema de Login
- Login con email y contraseña
- Detección automática de cuenta no verificada
- Redirección automática a pantalla de verificación
- Reintento automático de login después de verificar cuenta
- Soporte para Google OAuth (opcional)

### Recuperación de Contraseña
- Recuperación por email con código OTP
- Recuperación por preguntas de seguridad
- Recuperación por SMS (preparado para implementación)
- Restablecimiento seguro de contraseña

### Validaciones
- Validación en tiempo real de correo durante registro
- Validación de formato de email
- Validación de contraseña (mínimo 8 caracteres, mayúsculas, minúsculas, números)
- Validación de código OTP (6 dígitos numéricos)
- Validación de edad (mayor de 18 años)

## Configuración de Desarrollo

### Variables de Entorno

Las siguientes variables deben configurarse en `.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=https://backend-miru-franco.vercel.app

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=tu_google_client_id
```

### Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo en http://localhost:3000

# Producción
npm run build        # Construye la aplicación para producción
npm run start        # Inicia servidor de producción

# Linting
npm run lint         # Ejecuta ESLint para verificar código
```

## Despliegue

### Despliegue en Vercel

1. **Preparar el repositorio**
   - Asegúrate de que el código esté en GitHub, GitLab o Bitbucket
   - Verifica que todas las variables de entorno estén documentadas

2. **Conectar con Vercel**
   - Ve a [Vercel](https://vercel.com)
   - Haz clic en "Import Project"
   - Selecciona tu repositorio
   - Configura las variables de entorno:
     - `NEXT_PUBLIC_API_URL`: URL de tu backend API
     - `NEXT_PUBLIC_APP_URL`: URL de tu aplicación en Vercel
     - `GOOGLE_CLIENT_ID`: ID de cliente de Google OAuth (opcional)

3. **Desplegar**
   - Vercel detectará automáticamente Next.js
   - La aplicación se desplegará automáticamente en cada push a la rama principal

### Despliegue en Otros Servicios

El proyecto puede desplegarse en cualquier servicio que soporte Next.js:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## Seguridad

### Implementaciones de Seguridad
- Tokens JWT almacenados en localStorage
- Validación de entrada en cliente y servidor
- Hasheo de contraseñas en el backend
- Códigos OTP con expiración de 2 minutos
- Validación de correo electrónico en tiempo real
- Protección contra CSRF mediante tokens

### Recomendaciones
- Considera implementar HttpOnly cookies en el backend para mayor seguridad
- Implementa rate limiting en el backend para prevenir ataques de fuerza bruta
- Usa HTTPS en producción
- Valida y sanitiza todas las entradas del usuario

## Flujo de Usuario

### Registro de Nuevo Usuario
1. Usuario completa formulario de registro (3 pasos)
2. Sistema valida correo en tiempo real
3. Usuario envía formulario
4. Sistema envía código OTP al correo
5. Usuario ingresa código OTP en pantalla de verificación
6. Sistema verifica código y activa cuenta
7. Usuario puede iniciar sesión

### Login de Usuario Existente
1. Usuario ingresa email y contraseña
2. Si cuenta no está verificada, sistema muestra pantalla de verificación
3. Sistema envía código OTP automáticamente
4. Usuario verifica código
5. Sistema intenta login automáticamente
6. Usuario accede a la aplicación

### Recuperación de Contraseña
1. Usuario solicita recuperación de contraseña
2. Usuario selecciona método (email, SMS, preguntas de seguridad)
3. Sistema envía código OTP o muestra pregunta secreta
4. Usuario verifica código o responde pregunta
5. Usuario establece nueva contraseña
6. Usuario puede iniciar sesión con nueva contraseña

## Contribución

Este es un proyecto privado. Para contribuir, contacta al equipo de desarrollo.

## Licencia

Este proyecto es privado y está protegido por derechos de autor.

## Contacto

Para más información, contacta al equipo de desarrollo de Miru Franco.

## Changelog

### Versión 0.1.0
- Implementación inicial del sistema de autenticación
- Validación en tiempo real de correo electrónico
- Verificación de cuenta mediante OTP
- Recuperación de contraseña por múltiples métodos
- Diseño responsive y modo oscuro
- Integración con backend API

## Referencias

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
