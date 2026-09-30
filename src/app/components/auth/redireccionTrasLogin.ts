import { hasSession } from '../../utils/security';

/** Rutas permitidas para redirigir después del login (evita open redirect). */
const REDIRECT_ALLOWED_PREFIXES = ['/admin', '/perfil', '/cliente'];

const ADMIN_ROL_VALORES = ['admin', 'administrador'];

function safeReturnUrl(returnUrl: string | null): string | null {
  if (!returnUrl || typeof returnUrl !== 'string') return null;
  const path = returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`;
  const allowed = REDIRECT_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
  return allowed ? path : null;
}

function isAdminRol(rol: string | undefined): boolean {
  if (!rol) return false;
  const r = rol.toLowerCase().trim();
  return ADMIN_ROL_VALORES.some((allowed) => r === allowed || r.includes('admin'));
}

/**
 * Destino después de un login correcto. Misma lógica que tenía la página /login (movida aquí
 * sin cambios para que también aplique cuando el formulario de acceso se abre desde /register o
 * /forgot-password con el panel deslizante): returnUrl permitido, si no /admin para admin y
 * /home para el resto. `null` = no hay sesión guardada.
 */
export function destinoTrasLogin(search: string): string | null {
  if (!hasSession()) return null;
  const returnUrl = safeReturnUrl(new URLSearchParams(search).get('returnUrl'));
  if (returnUrl) return returnUrl;
  const userJson = localStorage.getItem('user');
  let destino = '/home';
  if (userJson) {
    try {
      const user = JSON.parse(userJson) as { rol?: string; role?: string };
      const rol = user.rol ?? user.role;
      if (isAdminRol(rol)) destino = '/admin';
    } catch {
      // ignorar
    }
  }
  return destino;
}
