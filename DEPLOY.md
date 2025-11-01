# Guía de Despliegue - MongoDB Atlas + Vercel

Esta guía te ayudará a desplegar tu aplicación en Vercel con MongoDB Atlas.

## 📋 Pasos Previos

### 1. Crear cuenta en MongoDB Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Crea una cuenta gratuita
3. Completa el proceso de registro

### 2. Crear Cluster en MongoDB Atlas

1. Una vez dentro del dashboard, crea un nuevo cluster (opción gratuita M0)
2. Selecciona una región cercana a ti
3. El cluster tardará unos minutos en crearse

### 3. Configurar Base de Datos

#### 3.1 Crear Usuario de Base de Datos

1. Ve a **Database Access** en el menú lateral
2. Haz clic en **Add New Database User**
3. Elige **Password** como método de autenticación
4. Crea un nombre de usuario y contraseña (guarda estas credenciales)
5. Selecciona **Read and write to any database**
6. Haz clic en **Add User**

#### 3.2 Configurar Network Access

1. Ve a **Network Access** en el menú lateral
2. Haz clic en **Add IP Address**
3. Para desarrollo local, puedes usar `0.0.0.0/0` (permite acceso desde cualquier IP)
4. Para producción, agrega las IPs específicas de Vercel o usa `0.0.0.0/0` temporalmente
5. Haz clic en **Confirm**

#### 3.3 Obtener Connection String

1. Ve a **Database** → **Connect**
2. Selecciona **Connect your application**
3. Selecciona **Node.js** y la versión más reciente
4. Copia la connection string que se ve así:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Reemplaza `<username>` y `<password>` con tus credenciales
6. Agrega el nombre de tu base de datos después de `.net/`:
   ```
   mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/miru-franco?retryWrites=true&w=majority
   ```

## 🚀 Desplegar en Vercel

### Opción 1: Desde el Dashboard de Vercel (Recomendado)

1. **Preparar el repositorio**
   - Asegúrate de que tu código esté en GitHub, GitLab o Bitbucket
   - Haz commit y push de todos los cambios

2. **Importar proyecto en Vercel**
   - Ve a [Vercel](https://vercel.com)
   - Inicia sesión o crea una cuenta
   - Haz clic en **Add New Project** o **Import Project**
   - Conecta tu repositorio de Git

3. **Configurar el proyecto**
   - Vercel detectará automáticamente Next.js
   - No cambies la configuración de Framework Preset (debe ser Next.js)

4. **Configurar Variables de Entorno**
   
   Haz clic en **Environment Variables** y agrega:

   | Variable | Valor | Descripción |
   |----------|-------|-------------|
   | `MONGODB_URI` | Tu connection string completo | La URI de MongoDB Atlas con usuario, contraseña y nombre de DB |
   | `MONGODB_DB_NAME` | `miru-franco` | Nombre de tu base de datos |
   | `JWT_SECRET` | Una clave secreta segura | Genera una clave aleatoria segura (usa un generador de secretos) |
   | `JWT_EXPIRES_IN` | `7d` | Tiempo de expiración del token JWT |
   | `NEXT_PUBLIC_APP_URL` | `https://tu-app.vercel.app` | La URL de tu aplicación (se actualizará después del primer deploy) |

   **Generar JWT_SECRET:**
   ```bash
   # Opción 1: Usando Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Opción 2: Usando OpenSSL
   openssl rand -hex 32
   
   # Opción 3: Usar un generador online
   # https://generate-secret.vercel.app/32
   ```

5. **Desplegar**
   - Haz clic en **Deploy**
   - Espera a que termine el proceso (2-3 minutos)
   - Una vez desplegado, verás la URL de tu aplicación

6. **Actualizar NEXT_PUBLIC_APP_URL**
   - Después del primer despliegue, actualiza `NEXT_PUBLIC_APP_URL` en las variables de entorno con la URL real
   - Haz un nuevo despliegue para aplicar los cambios

### Opción 2: Usando Vercel CLI

1. **Instalar Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Iniciar sesión**
   ```bash
   vercel login
   ```

3. **Desplegar**
   ```bash
   vercel
   ```

4. **Configurar variables de entorno**
   ```bash
   vercel env add MONGODB_URI
   vercel env add MONGODB_DB_NAME
   vercel env add JWT_SECRET
   vercel env add JWT_EXPIRES_IN
   vercel env add NEXT_PUBLIC_APP_URL
   ```

5. **Desplegar a producción**
   ```bash
   vercel --prod
   ```

## ✅ Verificar el Despliegue

1. **Probar la aplicación**
   - Visita tu URL de Vercel
   - Prueba registrarte con un nuevo usuario
   - Verifica que puedas iniciar sesión
   - Prueba la recuperación de contraseña

2. **Verificar en MongoDB Atlas**
   - Ve a tu cluster en MongoDB Atlas
   - Haz clic en **Browse Collections**
   - Deberías ver una colección `users` con los usuarios registrados

3. **Revisar logs en Vercel**
   - En el dashboard de Vercel, ve a tu proyecto
   - Haz clic en **Functions** o **Logs** para ver los logs del servidor

## 🔒 Seguridad en Producción

1. **JWT Secret**: Usa una clave secreta fuerte y única
2. **MongoDB**: No compartas tu connection string públicamente
3. **Network Access**: Limita las IPs permitidas en MongoDB Atlas cuando sea posible
4. **Variables de Entorno**: Nunca subas `.env.local` al repositorio

## 🐛 Solución de Problemas

### Error: "Cannot connect to MongoDB"

- Verifica que la connection string esté correcta
- Asegúrate de que Network Access permita las IPs de Vercel
- Verifica que el usuario de la base de datos tenga los permisos correctos

### Error: "JWT_SECRET is required"

- Asegúrate de que todas las variables de entorno estén configuradas en Vercel
- Verifica que las variables estén disponibles en el entorno de producción

### Error: "Module not found"

- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que `npm install` se ejecute correctamente durante el build

### Las variables de entorno no funcionan

- Las variables con `NEXT_PUBLIC_` deben estar disponibles en el cliente
- Las demás solo están disponibles en el servidor
- Reinicia el despliegue después de agregar nuevas variables

## 📝 Próximos Pasos

- [ ] Configurar dominio personalizado
- [ ] Implementar envío de emails reales con Nodemailer o SendGrid
- [ ] Implementar SMS real con Twilio o AWS SNS
- [ ] Agregar autenticación de dos factores (2FA)
- [ ] Configurar CI/CD para despliegues automáticos

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel
2. Revisa los logs en MongoDB Atlas
3. Verifica que todas las variables de entorno estén configuradas
4. Asegúrate de que el código compile sin errores localmente

