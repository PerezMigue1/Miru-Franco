import { quitarDatosSalud } from './datosSensiblesStorage';
import { normalizarUrlImagenExterna } from './normalizarUrlImagen';

/** Nombre visible: backend español, Google (`name`, `given_name`+`family_name`), etc. */
export function resolverNombreParaMostrar(u: Record<string, unknown>): string {
  const direct = String(
    u.nombre ?? u.name ?? u.displayName ?? u.display_name ?? u.username ?? ''
  ).trim();
  if (direct) return direct;
  const gn = String(u.given_name ?? u.givenName ?? '').trim();
  const fn = String(u.family_name ?? u.familyName ?? '').trim();
  return [gn, fn].filter(Boolean).join(' ').trim();
}

/**
 * Único subconjunto del usuario que se guarda en `localStorage.user`: lo que la UI necesita
 * para el header, los guards y el sidebar. Cualquier script de la página puede leer
 * localStorage, así que teléfono, fecha de nacimiento, alergias y demás datos del perfil no se
 * persisten: las vistas que los muestran los piden a `/api/auth/me`.
 */
const CAMPOS_PERMITIDOS = ['id', 'nombre', 'email', 'rol', 'role', 'foto', 'permisos'] as const;

/**
 * Unifica avatar para `localStorage.user` y la UI:
 * - Si ya hay **foto propia** (`foto`, `avatarUrl`, `avatar`) → se normaliza y se guarda en `foto`.
 * - Si no, usa la de proveedores OAuth (**Google envía `picture`**).
 *
 * Así el header y `/perfil` leen siempre `foto`; la de Google es respaldo hasta que el usuario suba una en Cloudinary.
 * Devuelve solo CAMPOS_PERMITIDOS y, como segunda defensa, sin datos de salud anidados.
 */
export function normalizarUsuarioAlmacenado(user: unknown): Record<string, unknown> {
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    return {};
  }
  const u = { ...(user as Record<string, unknown>) };
  if (u.id == null && u._id != null) u.id = u._id;

  const fotoPropia = normalizarUrlImagenExterna(
    String(u.foto ?? u.avatarUrl ?? u.avatar ?? '')
  );
  const fotoOAuth = normalizarUrlImagenExterna(
    String(u.picture ?? u.photo ?? u.image ?? '')
  );

  if (fotoPropia) {
    u.foto = fotoPropia;
  } else if (fotoOAuth) {
    u.foto = fotoOAuth;
  } else {
    u.foto = '';
  }

  const nom = resolverNombreParaMostrar(u);
  if (nom) u.nombre = nom;

  const seguro: Record<string, unknown> = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (u[campo] !== undefined) seguro[campo] = u[campo];
  }
  return quitarDatosSalud(seguro);
}
