/**
 * Rutas de la clienta que exigen sesión. La sesión es una cookie httpOnly del dominio del API,
 * así que el middleware de Next no la ve: la comprobación es en el cliente
 * (SesionClienteGuard, montado en el layout de (privada)).
 *
 * Todo lo demás bajo /cliente es público: tienda y detalle de producto, servicios y su detalle,
 * carritos de invitado, galería y promociones. Cada entrada cubre también sus subrutas.
 */
export const RUTAS_CON_SESION = [
  '/perfil',
  '/cliente/cotizaciones',
  '/cliente/devoluciones',
  '/cliente/direcciones',
  '/cliente/facturas',
  '/cliente/garantias',
  '/cliente/notificaciones',
  '/cliente/seguimientos',
  '/cliente/tarjetas',
  '/cliente/tienda-online/checkout',
  '/cliente/tienda-online/confirmacion',
  '/cliente/tienda-online/mis-pedidos',
  '/cliente/tienda-online/rastreo-pedidos',
  '/cliente/servicios-citas/calendario',
  '/cliente/servicios-citas/cancelar',
  '/cliente/servicios-citas/confirmacion',
  '/cliente/servicios-citas/crear-cita',
  '/cliente/servicios-citas/mis-citas',
  '/cliente/servicios-citas/reprogramar',
] as const;

export function requiereSesion(pathname: string): boolean {
  return RUTAS_CON_SESION.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));
}

/** Login que vuelve a `destino` (ruta + query) al entrar; redireccionTrasLogin valida el destino. */
export function rutaLogin(destino: string): string {
  return `/login?returnUrl=${encodeURIComponent(destino)}`;
}
