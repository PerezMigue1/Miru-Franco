import { hasSession } from '../../utils/security';

const ADMIN_ROL_VALORES = ['admin', 'administrador'];

/** Pantallas de acceso: regresar a ellas después de entrar haría un ciclo. */
const PANTALLAS_DE_ACCESO = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback'];

/** Donde se guarda el regreso mientras el usuario va y viene de Google (no viaja en la URL de Google). */
const CLAVE_REGRESO_GOOGLE = 'miru:regreso-tras-login';

/**
 * Página interna a la que se vuelve después de iniciar sesión, para cualquier rol: el personal y admin
 * regresan a donde estaban igual que una clienta. Solo rutas del propio sitio (empiezan con una sola
 * "/"), nunca externas (sin open redirect) ni las pantallas de acceso. `null` si no es válida.
 */
export function rutaDeRegreso(returnUrl: string | null | undefined): string | null {
  if (!returnUrl || typeof returnUrl !== 'string') return null;
  const ruta = returnUrl.trim();
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.startsWith('/\\')) return null;
  const camino = ruta.split(/[?#]/)[0];
  if (PANTALLAS_DE_ACCESO.some((p) => camino === p || camino.startsWith(`${p}/`))) return null;
  return ruta;
}

function isAdminRol(rol: string | undefined): boolean {
  if (!rol) return false;
  const r = rol.toLowerCase().trim();
  return ADMIN_ROL_VALORES.some((allowed) => r === allowed || r.includes('admin'));
}

/**
 * Destino después de un login correcto: la página de la que venía (returnUrl válido) para cualquier rol;
 * si no venía de ninguna, /admin para admin y /home para el resto. `null` = no hay sesión guardada.
 */
export function destinoTrasLogin(search: string): string | null {
  if (!hasSession()) return null;
  const returnUrl = rutaDeRegreso(new URLSearchParams(search).get('returnUrl'));
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

/** Antes de ir a Google: guarda el returnUrl de la página de acceso para usarlo al volver. */
export function guardarRegresoParaGoogle(search: string): void {
  try {
    const regreso = rutaDeRegreso(new URLSearchParams(search).get('returnUrl'));
    if (regreso) sessionStorage.setItem(CLAVE_REGRESO_GOOGLE, regreso);
    else sessionStorage.removeItem(CLAVE_REGRESO_GOOGLE);
  } catch {
    // sin sessionStorage: se vuelve a /home
  }
}

/** Al volver de Google: el regreso guardado (y lo borra), o /home. */
export function tomarRegresoDeGoogle(): string {
  try {
    const regreso = rutaDeRegreso(sessionStorage.getItem(CLAVE_REGRESO_GOOGLE));
    sessionStorage.removeItem(CLAVE_REGRESO_GOOGLE);
    return regreso ?? '/home';
  } catch {
    return '/home';
  }
}
