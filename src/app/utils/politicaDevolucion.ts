import type { CausaDevolucion, TipoDevolucion } from '../services/ecommerce';

/**
 * Espejo de la política de cambios y reembolsos de los Términos (sección 5) que valida el backend
 * (src/ecommerce/devoluciones/politica-devolucion.ts). Aquí solo sirve para armar el formulario.
 */
export const DIAS_CAMBIO_PRODUCTO = 7;

const CAUSAS_POR_TIPO: Record<TipoDevolucion, CausaDevolucion[]> = {
  cambio: ['sellado_sin_abrir', 'defecto_fabrica'],
  reembolso: ['defecto_fabrica', 'producto_distinto', 'sin_existencias', 'cancelacion_antes_listo'],
};

const ETIQUETA_CAUSA: Record<CausaDevolucion, string> = {
  sellado_sin_abrir: 'Producto sellado y sin abrir',
  defecto_fabrica: 'Defecto de fábrica',
  producto_distinto: 'Producto distinto al pedido',
  sin_existencias: 'Falta de existencias',
  cancelacion_antes_listo: 'Cancelado antes de estar listo',
};

export const causasDe = (tipo: TipoDevolucion): CausaDevolucion[] => CAUSAS_POR_TIPO[tipo];
export const etiquetaCausa = (causa: CausaDevolucion): string => ETIQUETA_CAUSA[causa];

/** El cambio y los reembolsos por defecto o producto distinto son sobre un artículo entregado. */
export function requiereArticulo(tipo: TipoDevolucion, causa: CausaDevolucion): boolean {
  return tipo === 'cambio' || causa === 'defecto_fabrica' || causa === 'producto_distinto';
}
