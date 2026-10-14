import type { VentaLocalApi } from '../../../services/pos';
import type { Producto } from '../../../services/productos';
import { etiquetaMetodoPagoPedido } from '../../../services/ecommerce';

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
