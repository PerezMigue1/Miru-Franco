# ✅ Verificación: APIs usando URL correcta del Backend

## 📋 Estado Actual

Todas las APIs en `src/app/services/auth.ts` están usando `getBackendBaseUrl()` correctamente:

### ✅ APIs Verificadas:

1. **Login** - `/api/usuarios/login`
   - ✅ Usa: `getBackendBaseUrl()`
   - URL: `${BACKEND_BASE}/api/usuarios/login`

2. **Registro** - `/api/usuarios/registrar`
   - ✅ Usa: `getBackendBaseUrl()`
   - URL: `${BACKEND_BASE}/api/usuarios/registrar`

3. **Reset Password** - `/api/usuarios/cambiar-password`
   - ✅ Usa: `getBackendBaseUrl()`
   - URL: `${BACKEND_BASE}/api/usuarios/cambiar-password`

4. **Preguntas de Seguridad (por email)** - `/api/pregunta-seguridad?email=...`
   - ✅ Usa: `getBackendBaseUrl()`
   - URL: `${BACKEND_BASE}/api/pregunta-seguridad?email=...`

5. **Preguntas de Seguridad Disponibles** - `/api/pregunta-seguridad`
   - ✅ Usa: `getBackendBaseUrl()`
   - URL: `${BACKEND_BASE}/api/pregunta-seguridad`

6. **Verificar Respuesta de Seguridad** - `/api/usuarios/verificar-respuesta`
   - ✅ Usa: `getBackendBaseUrl()`
   - URL: `${BACKEND_BASE}/api/usuarios/verificar-respuesta`

7. **Verificar OTP** - `/api/usuarios/verificar-otp`
   - ✅ Usa: `getBackendBaseUrl()`
   - URL: `${BACKEND_BASE}/api/usuarios/verificar-otp`

8. **Reenviar OTP** - `/api/usuarios/reenviar-codigo`
   - ✅ Usa: `getBackendBaseUrl()`
   - URL: `${BACKEND_BASE}/api/usuarios/reenviar-codigo`

9. **Verificar Correo** - `/api/auth/verificar-correo`
   - ✅ Usa: `getBackendBaseUrl()`
   - URL: `${BACKEND_BASE}/api/auth/verificar-correo`

10. **Google OAuth** - `/api/auth/google`
    - ✅ Usa: `getBackendBaseUrl()`
    - URL: `${BACKEND_BASE}/api/auth/google`

## ✅ Configuración Centralizada

Todas las APIs usan la función centralizada:

```typescript
// src/app/services/config.ts
export const getBackendBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://miru-franco.onrender.com';
  // ... limpieza de URL
  return apiUrl;
};
```

## ✅ Cliente API

El `apiClient` acepta un `customBase` opcional que se usa cuando se pasa `BACKEND_BASE`:

```typescript
// Ejemplo de uso:
const BACKEND_BASE = getBackendBaseUrl();
const data = await apiClient.get('/api/pregunta-seguridad', BACKEND_BASE);
// Construye: https://miru-franco.onrender.com/api/pregunta-seguridad
```

## 🔍 Verificación

Todas las llamadas a API están usando:
- ✅ `getBackendBaseUrl()` para obtener la URL base
- ✅ Pasando `BACKEND_BASE` como tercer parámetro a `apiClient.get/post`
- ✅ Construyendo URLs correctas: `${BACKEND_BASE}/api/endpoint`

## 📝 Nota

La variable de entorno `NEXT_PUBLIC_API_URL` debe estar configurada en Vercel como:
```
NEXT_PUBLIC_API_URL=https://miru-franco.onrender.com
```

Si no está configurada, se usa el valor por defecto: `https://miru-franco.onrender.com`

## ✅ Conclusión

**Todas las APIs están correctamente configuradas** para usar la URL del backend desde la variable de entorno o el valor por defecto.

