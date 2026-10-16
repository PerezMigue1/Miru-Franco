import { ORIGEN_REVOCACION, type DevolucionApi, type PedidoApi } from '../../../../../../services/ecommerce';
import { formatearPrecioMXN } from '../../../../../../utils/formatoPrecio';
import { etiquetaEstadoDevolucion } from '../../../../../../utils/politicaDevolucion';
import { puedeVerBotonRevocar } from './revocacion';
import { REGLAS_PUBLICAS_POR_OMISION } from '../../../../../../utils/reglasNegocio';
import { textoSitio, TEXTOS_POR_OMISION } from '../../../../../../utils/textosSitio';

type Textos = Record<string, string>;

/** La clienta puede cancelar mientras el salón no empezó a preparar su pedido. */
const ESTADOS_CANCELABLES = new Set(['pendiente_pago', 'pagado']);

/** El botón "Cancelar pedido" se ve mientras el salón no empezó a preparar el pedido. */
export function puedeVerBotonCancelar(pedido: Pick<PedidoApi, 'estado'>): boolean {
  return ESTADOS_CANCELABLES.has(pedido.estado);
}

/**
 * Línea breve cuando se ven a la vez "Cancelar pedido" y "Revocar compra" (pedido pagado sin preparar):
 * las dos cancelan y reembolsan, pero la revocación es el derecho legal y sigue disponible después.
 */
export function explicacionCancelarORevocar(
  pedido: Pick<PedidoApi, 'estado' | 'puedeRevocar' | 'revocableHasta'> & { reglas?: unknown },
  ahora: Date = new Date(),
  textos: Textos = TEXTOS_POR_OMISION,
): string | null {
  if (!puedeVerBotonCancelar(pedido) || !puedeVerBotonRevocar(pedido, ahora)) return null;
  // El plazo de revocación es el guardado en el pedido al crearlo (sin él, el de hoy).
  const guardado = (pedido.reglas as { diasHabilesRevocacion?: unknown } | null | undefined)?.diasHabilesRevocacion;
  const dias = typeof guardado === 'number' && Number.isFinite(guardado) ? guardado : REGLAS_PUBLICAS_POR_OMISION.revocacion.diasHabiles;
  return textoSitio(textos, 'pedidos.cancelarORevocar', { diasRevocacion: dias });
}

type VarianteInsignia = 'default' | 'success' | 'warning' | 'danger';

/** Insignia de una devolución: etiqueta legible y color según su estado. */
export function insigniaDevolucion(estado: string): { texto: string; variante: VarianteInsignia } {
  const variante: VarianteInsignia =
    estado === 'aprobada' ? 'success' : estado === 'rechazada' ? 'danger' : estado === 'pendiente' ? 'warning' : 'default';
  return { texto: etiquetaEstadoDevolucion(estado), variante };
}

/**
 * Encabezado de un pedido que la clienta recogió y después revocó (sigue "entregado" mientras devuelve el
 * producto): dice que la compra se revocó y en qué va el reembolso. null si no aplica.
 */
export function textoRevocacionEntregado(
  pedido: Pick<PedidoApi, 'estado'>,
  devoluciones: Pick<DevolucionApi, 'estado' | 'origen' | 'monto'>[],
  textos: Textos = TEXTOS_POR_OMISION,
): string | null {
  if (pedido.estado !== 'entregado') return null;
  const revocacion = devoluciones.find((d) => d.origen === ORIGEN_REVOCACION && d.estado !== 'cancelada');
  if (!revocacion) return null;
  const monto = revocacion.monto != null ? ` ${formatearPrecioMXN(revocacion.monto)}` : '';
  switch (revocacion.estado) {
    case 'pendiente':
      return textoSitio(textos, 'pedidos.revocacion.pendiente', { monto });
    case 'aprobada':
      return textoSitio(textos, 'pedidos.revocacion.aprobada', { monto });
    case 'rechazada':
      return textoSitio(textos, 'pedidos.revocacion.rechazada');
    default:
      return null;
  }
}

/** Nota de recoger en el salón que guardaron algunos pedidos en el campo de dirección: no es una dirección. */
const NOTA_RECOGER = /^\s*recoge(r)?\s+en\s+el\s+sal[oó]n/i;

/**
 * Dirección de entrega de un pedido anterior (historial). Hoy todo se recoge en el salón: la nota "Recoge en el
 * salón..." no se muestra como "Entrega registrada", porque contradice un pedido ya entregado.
 */
export function direccionEntregaRegistrada(texto: string | null | undefined): string | null {
  const limpio = (texto ?? '').trim();
  if (!limpio || NOTA_RECOGER.test(limpio)) return null;
  return limpio;
}
