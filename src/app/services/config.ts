// Configuracion centralizada de la API
// Segun GUIA_ACTUALIZAR_FRONTEND_SIN_ROMPER.md

// Función para obtener la URL base del backend (ejecutada en runtime)
// Según GUIA_FRONTEND_HTTPS_CONTRASENAS.md - Usar solo variables de entorno
export const getBackendBase = (): string => {
  // Usar variable de entorno (requerida)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Si no hay URL configurada:
  // - En build/SSR (server) no debemos romper el build (GitHub Actions / Vercel) → devolver vacío.
  // - En el navegador sí es un error de configuración → lanzar error para que se vea rápido.
  if (!apiUrl) {
    if (typeof window === 'undefined') return '';
    throw new Error(
      'NEXT_PUBLIC_API_URL no está configurada. ' +
        'Por favor configura la variable de entorno NEXT_PUBLIC_API_URL en tu archivo .env.local. ' +
        'Ejemplo: NEXT_PUBLIC_API_URL=https://tu-backend.com'
    );
  }
  
  // Verificar que use HTTPS en producción
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && apiUrl.startsWith('http://')) {
    console.warn(
      '[API Config] ADVERTENCIA: El frontend está en HTTPS pero la URL del API usa HTTP. ' +
      'Esto causará errores de Mixed Content. Usa HTTPS para la URL del API.'
    );
  }
  
  // Si la URL incluye /api/auth, removerlo
  if (apiUrl.includes('/api/auth')) {
    return apiUrl.replace('/api/auth', '').replace(/\/$/, '');
  }
  
  // Si incluye cualquier /api/, removerlo
  if (apiUrl.includes('/api/')) {
    return apiUrl.replace(/\/api\/.*$/, '').replace(/\/$/, '');
  }
  
  // Si termina con /, removerlo
  return apiUrl.replace(/\/$/, '');
};

// Exportar API_URL simple para compatibilidad con la guia
// Uso: import API_URL from '../services/config';
export const API_URL = getBackendBase();
export default API_URL;

// Funciones que se ejecutan en runtime (no en build time)
// Esto asegura que las variables de entorno se lean correctamente en Vercel
export const getBackendBaseUrl = () => getBackendBase();

/**
 * Base URL para rutas REST bajo `/api` (pedidos, carrito, `payments/*`, etc.).
 * `NEXT_PUBLIC_API_URL` puede ser `https://host` o `https://host/api`; `getBackendBase()` normaliza al host sin `/api`.
 */
export const getRestApiBaseUrl = (): string => {
  const b = getBackendBaseUrl().replace(/\/$/, '');
  if (!b) return '';
  return `${b}/api`;
};

export const getApiBaseUrl = () => `${getBackendBase()}/api/auth`;

// Para compatibilidad con código existente, exportar como funciones
// pero mantener las constantes para uso inmediato
export const BACKEND_BASE = getBackendBase();
export const API_BASE = `${BACKEND_BASE}/api/auth`;

// Log para debugging (en desarrollo y producción para verificar)
if (typeof window !== 'undefined') {
  console.log('[API Config] BACKEND_BASE:', BACKEND_BASE);
  console.log('[API Config] API_BASE:', API_BASE);
  console.log('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('[API Config] URLs construidas correctamente');
}

