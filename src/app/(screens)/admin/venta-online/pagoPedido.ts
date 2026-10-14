import type { PagoApi } from '../../../services/ecommerce';
import { formatearPrecioMXN } from '../../../utils/formatoPrecio';

/** Estados de pago que todavía se pueden aprobar desde el panel. */
const ESTADOS_POR_APROBAR = new Set(['pendiente', 'en_revision']);

/**
 * Pago que se aprueba con "Aprobar pago + marcar pagado": el pendiente más reciente.
 * No depende del orden del backend (llegan del más nuevo al más antiguo). null si no hay ninguno.
 */
export function elegirPagoPorAprobar(pagos: PagoApi[]): PagoApi | null {
  const pendientes = pagos.filter((p) => ESTADOS_POR_APROBAR.has(p.estado));
  if (!pendientes.length) return null;
  return pendientes.reduce((masReciente, p) =>
    (p.creadoEn ?? '') > (masReciente.creadoEn ?? '') || ((p.creadoEn ?? '') === (masReciente.creadoEn ?? '') && p.id > masReciente.id)
      ? p
      : masReciente
  );
}

/** Monto de un pedido para la tabla y el detalle ("$1,234.50"); otra moneda se indica al final. */
export function fmtMonedaPedido(n: number, moneda = 'MXN'): string {
  const precio = formatearPrecioMXN(n);
  return moneda && moneda !== 'MXN' ? `${precio} ${moneda}` : precio;
}
