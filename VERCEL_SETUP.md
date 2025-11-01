# Configuración de Vercel - Pasos Inmediatos

## Variables de Entorno en Vercel

Ve a tu proyecto en Vercel y configura estas variables de entorno:

### 1. Ir a la configuración del proyecto
- Ve a tu dashboard en Vercel: https://vercel.com/dashboard
- Selecciona tu proyecto "miru-franco-web" o como se llame
- Ve a **Settings** → **Environment Variables**

### 2. Agregar las siguientes variables:

| Variable | Valor |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://miru:mildred30@mirufranco.rsucbbc.mongodb.net/mirufranco?retryWrites=true&w=majority&appName=MiruFranco` |
| `MONGODB_DB_NAME` | `mirufranco` |
| `JWT_SECRET` | **[Genera uno nuevo]** (usa el comando abajo) |
| `JWT_EXPIRES_IN` | `7d` |
| `NEXT_PUBLIC_APP_URL` | `https://tu-proyecto.vercel.app` (reemplaza con tu URL real) |

### 3. Generar JWT_SECRET

Ejecuta este comando en tu terminal local:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O usa este generador online: https://generate-secret.vercel.app/32

### 4. Configurar MongoDB Atlas Network Access

1. Ve a MongoDB Atlas: https://cloud.mongodb.com
2. Selecciona tu cluster
3. Ve a **Network Access**
4. Haz clic en **Add IP Address**
5. Selecciona **Allow Access from Anywhere** (0.0.0.0/0) - O agrega las IPs de Vercel específicamente
6. Guarda

### 5. Redesplegar en Vercel

Después de agregar las variables:
1. Ve a **Deployments**
2. Haz clic en los tres puntos (...) del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine

### 6. Verificar que funcione

1. Visita tu URL de Vercel
2. Prueba registrarte con un nuevo usuario
3. Verifica que puedas iniciar sesión
4. Revisa los logs en Vercel si hay errores

