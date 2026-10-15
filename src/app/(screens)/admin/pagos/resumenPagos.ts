import type { PagoApi } from '../../../services/ecommerce';
import { fechaCortaEnMexico } from '../../../utils/fechaSoloDia';

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

/** Fecha de un pago en dd/mm/aaaa (día de México), como el resto del panel; antes salía "3/10/2026". */
export function fechaPago(iso?: string | null): string {
  return fechaCortaEnMexico(iso) ?? '-';
}
