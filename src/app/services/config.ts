// Configuracion centralizada de la API
// Segun GUIA_ACTUALIZAR_FRONTEND_SIN_ROMPER.md

// Función para obtener la URL base del backend (ejecutada en runtime)
export const getBackendBase = (): string => {
  // Usar variables de entorno (requeridas)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_PRODUCTION_URL
      : process.env.NEXT_PUBLIC_DEVELOPMENT_URL);
  
  // Si no hay URL configurada, lanzar error
  if (!apiUrl) {
    throw new Error(
      'NEXT_PUBLIC_API_URL no está configurada. ' +
      'Por favor configura la variable de entorno NEXT_PUBLIC_API_URL en tu archivo .env.local'
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

