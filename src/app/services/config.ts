// Configuracion centralizada de la API

// Función para obtener la URL base del backend (ejecutada en runtime)
export const getBackendBase = (): string => {
  // En el cliente (navegador), usar process.env.NEXT_PUBLIC_API_URL
  // En el servidor, también usar process.env.NEXT_PUBLIC_API_URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://miru-franco.onrender.com';
  
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

