import type { VentaLocalApi } from '../../../services/pos';
import type { Producto } from '../../../services/productos';
import { etiquetaMetodoPagoPedido } from '../../../services/ecommerce';
import { mensajeUsuarioDesdeErrorApi } from '../../../utils/apiErrorMessage';

/** "Total del día" de la venta local: solo ventas pagadas (canceladas y pendientes no son dinero cobrado). */
export function totalDelDia(ventas: Pick<VentaLocalApi, 'estado' | 'total'>[]): number {
  const centavos = ventas
    .filter((v) => v.estado === 'pagada')
    .reduce((acc, v) => acc + Math.round((v.total ?? 0) * 100), 0);
  return centavos / 100;
}

/** KPI "Ventas de hoy": solo las pagadas, igual que el total (las canceladas no son venta). */
export function ventasPagadasDelDia(ventas: Pick<VentaLocalApi, 'estado'>[]): number {
  return ventas.filter((v) => v.estado === 'pagada').length;
}

/** Texto del KPI "Total del día" en MXN con dos decimales. */
export function textoTotalDelDia(total: number): string {
  return `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ETIQUETA_METODO_VENTA: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  mixto: 'Mixto',
};

/** Método de pago de una venta local en palabras (el backend guarda la clave). */
export function etiquetaMetodoVenta(metodo: string | null | undefined): string {
  const clave = (metodo ?? '').trim().toLowerCase();
  if (!clave) return '-';
  return ETIQUETA_METODO_VENTA[clave] ?? etiquetaMetodoPagoPedido(clave);
}

/**
 * La venta solo se puede cancelar si no está cancelada ya ni entró a un corte de caja: el backend
 * rechaza cancelar una venta cortada porque su efectivo ya se contó.
 */
export function puedeCancelarVenta(estado: VentaLocalApi['estado'], corteId?: number | null): boolean {
  return estado !== 'cancelada' && corteId == null;
}

/**
 * Acciones de una fila de venta. "Cancelar" solo pagadas sin corte (puedeCancelarVenta); "Anular
 * venta cortada" solo pagadas EN EFECTIVO que YA entraron a un corte y solo para quien tiene
 * devoluciones:gestionar y caja:escritura (el backend exige las dos en PATCH /pos/ventas/:id/anular, con 409
 * si falta la de caja, y solo anula efectivo, porque la salida de caja es de efectivo). Una cortada con tarjeta, transferencia o mixto no
 * se anula desde la caja: `devolverFueraDeCaja` pide explicar que se devuelve por el método original.
 * Nunca se ofrecen cancelar y anular a la vez: la cancelación normal sigue oculta en ventas cortadas.
 */
export function accionesDeVenta(
  estado: VentaLocalApi['estado'],
  corteId: number | null | undefined,
  metodoPago: string | null | undefined,
  tienePermiso: (clave: string) => boolean,
): { cancelar: boolean; anularCortada: boolean; devolverFueraDeCaja: boolean } {
  const cortadaConClave = estado === 'pagada' && corteId != null && tienePermiso('devoluciones:gestionar');
  const enEfectivo = (metodoPago ?? '').trim().toLowerCase() === 'efectivo';
  return {
    cancelar: puedeCancelarVenta(estado, corteId),
    anularCortada: cortadaConClave && enEfectivo && tienePermiso('caja:escritura'),
    devolverFueraDeCaja: cortadaConClave && !enEfectivo,
  };
}

const METODO_EN_TEXTO: Record<string, string> = {
  tarjeta: 'tarjeta',
  transferencia: 'transferencia',
  mixto: 'pago mixto',
};

/** Venta cortada que no fue en efectivo: no se anula desde la caja, se devuelve por el método original. */
export function textoDevolucionFueraDeCaja(metodoPago: string | null | undefined): string {
  const clave = (metodoPago ?? '').trim().toLowerCase();
  const metodo = METODO_EN_TEXTO[clave] ?? etiquetaMetodoVenta(clave).toLowerCase();
  return `Cobrada con ${metodo}: no se anula desde la caja. Si hay que devolverla, se devuelve por el método original, fuera de la caja.`;
}

/** Citas que cobraba la venta (sin repetir), en el orden de sus líneas. */
function citasDeVenta(venta: Pick<VentaLocalApi, 'items'>): number[] {
  const ids = venta.items.map((i) => i.citaId).filter((id): id is number => typeof id === 'number');
  return [...new Set(ids)];
}

/**
 * Párrafos del modal de "Anular venta cortada". Si la venta cobraba una cita, el backend la libera al
 * anularla (pos.service.ts: citaId de sus líneas a null): esa cita vuelve a quedar por cobrar.
 */
export function textoModalAnular(venta: Pick<VentaLocalApi, 'items'>): string[] {
  const base =
    'Esta venta ya entró a un corte de caja. Al anularla se registra una salida de efectivo por su total, que se descuenta en tu siguiente corte, y el stock regresa al inventario.';
  const citas = citasDeVenta(venta).map((id) => `#${id}`);
  if (citas.length === 0) return [base];
  if (citas.length === 1) {
    return [base, `Esta venta cobraba la cita ${citas[0]}: al anularla, esa cita vuelve a quedar por cobrar.`];
  }
  const lista = `${citas.slice(0, -1).join(', ')} y ${citas[citas.length - 1]}`;
  return [base, `Esta venta cobraba las citas ${lista}: al anularla, esas citas vuelven a quedar por cobrar.`];
}

/**
 * Error de cancelar o anular para el modal: el mensaje del backend tal cual (por ejemplo, el 409 "Para anular
 * necesitas operar la caja...", que el cliente HTTP entrega como Error con ese texto); si no hay, uno genérico.
 */
export function mensajeErrorAccionVenta(error: unknown, accion: 'cancelar' | 'anular'): string {
  if (error instanceof Error && error.message.trim()) return mensajeUsuarioDesdeErrorApi(error);
  return `No se pudo ${accion} la venta. Intenta de nuevo.`;
}

/**
 * presentacionId que se manda al cobrar el producto elegido: la elegida (si hay varias) o la única.
 * null si el producto no tiene presentaciones o falta elegir: nunca se usa el id del producto.
 */
export function presentacionIdDeVenta(
  producto: Pick<Producto, 'id' | 'presentaciones'> | undefined,
  productoId: string,
  presentacionElegida: string,
): number | null {
  const presentaciones = (producto?.presentaciones ?? []).filter((p) => p.id != null);
  if (!producto || String(producto.id) !== productoId || presentaciones.length === 0) return null;
  if (presentaciones.length === 1) return presentaciones[0].id ?? null;
  const elegida = presentaciones.find((p) => String(p.id) === presentacionElegida);
  return elegida?.id ?? null;
}
