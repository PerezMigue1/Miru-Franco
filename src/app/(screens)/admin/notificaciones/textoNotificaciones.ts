/**
 * Encabezado del listado de notificaciones del admin. GET /api/notificaciones devuelve solo las de
 * la propia cuenta, así que el texto lo dice (antes: "en el sistema").
 */
export function textoTotalNotificaciones(n: number): string {
  return n === 1 ? '1 notificación tuya' : `${n} notificaciones tuyas`;
}
