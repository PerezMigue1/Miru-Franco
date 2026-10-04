/**
 * Qué botones de citas y seguimientos ve cada rol (la regla real la aplica el backend):
 * - 'citas:escritura' (admin, estilista, empleado): atiende cualquier cita;
 * - becario ('citas:asignadas'): solo las citas que tiene asignadas;
 * - crear seguimientos: solo con 'seguimientos:escritura'.
 */
type TienePermiso = (clave: string | undefined | null) => boolean;

export function puedeAtenderCita(tienePermiso: TienePermiso, especialistaId: string | undefined | null, miId: string | undefined): boolean {
  if (tienePermiso('citas:escritura')) return true;
  return !!miId && !!especialistaId && especialistaId === miId;
}

export function puedeCrearSeguimientos(tienePermiso: TienePermiso): boolean {
  return tienePermiso('seguimientos:escritura');
}

/** Id de la persona con sesión (guardado en localStorage al iniciar sesión). */
export function idUsuarioSesion(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as Record<string, unknown>;
    return typeof u.id === 'string' ? u.id : undefined;
  } catch {
    return undefined;
  }
}
