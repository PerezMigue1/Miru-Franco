/** Texto de /403: con sesión ya no tiene sentido pedir iniciar sesión, la cuenta no tiene permiso. */
export function mensaje403(haySesion: boolean): string {
  return haySesion
    ? 'Tu cuenta no tiene acceso a esta sección. Vuelve al inicio para seguir navegando.'
    : 'No tienes permiso para ver esta página. Inicia sesión con una cuenta autorizada o vuelve al inicio.';
}
