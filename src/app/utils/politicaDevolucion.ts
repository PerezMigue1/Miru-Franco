import type { CausaDevolucion, TipoDevolucion } from '../services/ecommerce';

/**
 * Espejo de la política de cambios y reembolsos que valida SIEMPRE el backend
 * (src/ecommerce/devoluciones/politica-devolucion.ts). Aquí solo sirve para armar los formularios:
 * cambio de producto sellado (o con defecto) dentro de 7 días; reembolso por defecto, error del
 * salón, falta de existencias o cancelación de un pedido pagado en línea antes de estar listo.
 */
export const DIAS_CAMBIO_PRODUCTO = 7;

const CAUSAS_POR_TIPO: Record<TipoDevolucion, CausaDevolucion[]> = {
  cambio: ['sellado_sin_abrir', 'defecto_fabrica'],
  reembolso: ['defecto_fabrica', 'producto_distinto', 'sin_existencias', 'cancelacion_antes_listo'],
};

const ETIQUETA_CAUSA: Record<CausaDevolucion, string> = {
  sellado_sin_abrir: 'Producto sellado y sin abrir',
  defecto_fabrica: 'Defecto de fábrica',
  producto_distinto: 'Error del salón: producto distinto al pedido',
  sin_existencias: 'Falta de existencias',
  cancelacion_antes_listo: 'Cancelado antes de estar listo',
};

export const causasDe = (tipo: TipoDevolucion): CausaDevolucion[] => CAUSAS_POR_TIPO[tipo];
export const etiquetaCausa = (causa: CausaDevolucion): string => ETIQUETA_CAUSA[causa] ?? causa;

/** El cambio y los reembolsos por defecto o producto distinto son sobre un artículo entregado. */
export function requiereArticulo(tipo: TipoDevolucion, causa: CausaDevolucion): boolean {
  return tipo === 'cambio' || causa === 'defecto_fabrica' || causa === 'producto_distinto';
}

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada por la clienta',
};

/** Estados del backend (pendiente, aprobada, rechazada, cancelada); uno antiguo se muestra tal cual. */
export const etiquetaEstadoDevolucion = (estado: string): string => ETIQUETA_ESTADO[estado] ?? estado;

/**
 * Texto libre de la clienta. El backend guarda el motivo con el prefijo "[Tipo · Causa]" (compatibilidad);
 * si la fila ya trae tipo en su columna, la pantalla lo muestra aparte y aquí se quita para no repetirlo.
 */
export function detalleMotivoDevolucion(d: { tipo?: string | null; motivo?: string | null }): string {
  const motivo = (d.motivo ?? '').trim();
  return d.tipo ? motivo.replace(/^\[[^\]]*\]\s*/, '') : motivo;
}
