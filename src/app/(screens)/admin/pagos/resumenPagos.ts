import type { PagoApi } from '../../../services/ecommerce';

/** KPIs de la pantalla de pagos. */
export function resumenPagos(pagos: Pick<PagoApi, 'monto' | 'estado'>[]) {
  return {
    totalPagos: pagos.length,
    // Solo dinero cobrado: pendientes, rechazados, cancelados y reembolsados no cuentan.
    montoAprobado: pagos.filter((p) => p.estado === 'aprobado').reduce((acc, p) => acc + p.monto, 0),
    pendientes: pagos.filter((p) => p.estado === 'pendiente').length,
    rechazados: pagos.filter((p) => p.estado === 'rechazado' || p.estado === 'cancelado').length,
  };
}
