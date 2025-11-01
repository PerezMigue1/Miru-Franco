// Configuracion centralizada de la API

export const getBackendBase = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-miru-franco.vercel.app/api/auth';
  
  if (apiUrl.includes('/api/auth')) {
    return apiUrl.replace('/api/auth', '');
  } else if (apiUrl.includes('/api/')) {
    return apiUrl.replace(/\/api\/.*$/, '');
  } else {
    return apiUrl.replace(/\/$/, '');
  }
};

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-miru-franco.vercel.app/api/auth';
export const BACKEND_BASE = getBackendBase();

