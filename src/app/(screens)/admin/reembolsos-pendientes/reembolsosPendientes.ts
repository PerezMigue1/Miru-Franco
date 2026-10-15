import type { MovimientoReembolso, ReembolsoPendiente } from '../../../services/reembolsosPendientes';

export const MAX_REFERENCIA = 120;
export const MAX_NOTA = 500;

/** Errores del formulario "Marcar como reembolsado manualmente" (mismos límites que el backend). */
export function validarReembolsoManual(referencia: string, nota: string): { referencia?: string; nota?: string } {
  const r = referencia.trim();
  if (!r) return { referencia: 'Escribe la referencia del reembolso (folio de la transferencia o del reembolso).' };
  if (r.length > MAX_REFERENCIA) return { referencia: `La referencia tiene como máximo ${MAX_REFERENCIA} caracteres.` };
  if (nota.trim().length > MAX_NOTA) return { nota: `La nota tiene como máximo ${MAX_NOTA} caracteres.` };
  return {};
}

/** De qué es el pago y dónde verlo. */
export function origenDelPago(p: Pick<ReembolsoPendiente, 'pedidoId' | 'citaId'>): { texto: string; href: string } {
  if (p.pedidoId) return { texto: `Pedido #${p.pedidoId}`, href: '/admin/venta-online' };
  return { texto: `Anticipo de la cita #${p.citaId}`, href: '/operacion/gestion-citas' };
}

export const ETIQUETA_ACCION_HISTORIAL: Record<MovimientoReembolso['accion'], string> = {
  reintento: 'Reembolsado con Mercado Pago',
  reintento_fallido: 'Reintento fallido',
  manual: 'Reembolsado manualmente',
};
