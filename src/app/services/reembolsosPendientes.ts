import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

/** Admin > Reembolsos pendientes (permiso reembolsos:gestionar; por omisión solo admin). */
export interface MovimientoReembolso {
  accion: 'reintento' | 'reintento_fallido' | 'manual';
  referencia: string | null;
  nota: string | null;
  creadoEn: string;
  usuario: string | null;
}
export interface ReembolsoPendiente {
  id: number;
  pedidoId: number | null;
  citaId: number | null;
  monto: number;
  moneda: string;
  metodo: string;
  proveedor: string | null;
  referenciaExterna: string | null;
  pagadoEn: string | null;
  motivo: string;
  clienta: string | null;
  estadoPedido: string | null;
  estadoCita: string | null;
  servicio: string | null;
  puedeReintentar: boolean;
  historial: MovimientoReembolso[];
}

const BASE = () => getBackendBaseUrl();

export async function listarReembolsosPendientes(): Promise<ReembolsoPendiente[]> {
  const r = await apiClient.get<{ data?: ReembolsoPendiente[] }>('/api/reembolsos-pendientes', BASE());
  return Array.isArray(r?.data) ? r.data : [];
}

/** Reintenta el reembolso total en Mercado Pago (misma clave que el primer intento: nunca devuelve dos veces). */
export function reintentarReembolso(pagoId: number): Promise<unknown> {
  return apiClient.post<unknown>(`/api/reembolsos-pendientes/${pagoId}/reintentar`, {}, BASE());
}

/** El salón devolvió el dinero por otro medio: queda con su referencia y nota en el historial. */
export function marcarReembolsoManual(pagoId: number, referencia: string, nota: string): Promise<unknown> {
  const cuerpo: { referencia: string; nota?: string } = { referencia: referencia.trim() };
  if (nota.trim()) cuerpo.nota = nota.trim();
  return apiClient.post<unknown>(`/api/reembolsos-pendientes/${pagoId}/marcar-manual`, cuerpo, BASE());
}
