// Lógica compartida de verificación de rol para el panel /admin.
// La usan tanto AdminLayout (visual) como el guard (screens)/admin/layout.tsx,
// para que la decisión de acceso y de destino de redirección viva en UN solo lugar.

/** Roles que SÍ pueden entrar a /admin (match exacto, sin includes). */
export const ADMIN_ROL_VALORES = ['admin', 'administrador'];

/** Roles de personal/staff (el "becado" se guarda como 'becario' en BD; se cubren ambos). */
export const STAFF_ROLES = ['estilista', 'empleado', 'becario', 'becado'];

/** True solo si el rol es admin exacto (admin | administrador). */
export function isAdminRol(rol: string | undefined): boolean {
  if (!rol || typeof rol !== 'string') return false;
  const r = rol.toLowerCase().trim();
  return ADMIN_ROL_VALORES.includes(r);
}

/** Extrae el rol de un objeto usuario almacenado (rol | role | tipo | rolNombre). */
export function getRolFromUser(
  user: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!user || typeof user !== 'object') return undefined;
  const rol = user.rol ?? user.role ?? user.tipo ?? user.rolNombre;
  return typeof rol === 'string' ? rol : undefined;
}

/**
 * Destino de redirección para un usuario NO-admin que intenta entrar a /admin.
 * - staff (estilista/empleado/becario/becado) → /operacion
 * - cliente y cualquier otro rol conocido no-staff → /403
 *
 * OJO: el caso "sin rol / sin sesión" NO se resuelve aquí — el llamador debe
 * mandar a /login ANTES de invocar esta función. Si llegara un rol vacío/desconocido,
 * devuelve /403 (nunca /operacion) para no filtrar a un cliente al panel de personal.
 */
export function rutaPorRol(rol: string | undefined): string {
  const r = (rol ?? '').toLowerCase().trim();
  if (STAFF_ROLES.includes(r)) return '/operacion';
  return '/403';
}
