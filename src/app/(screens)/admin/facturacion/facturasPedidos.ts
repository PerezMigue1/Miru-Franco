import type { FacturaApi, PedidoApi } from '../../../services/ecommerce';

type FacturaMonto = Pick<FacturaApi, 'tipo' | 'monto' | 'pedidoId'>;
type PedidosPorId = ReadonlyMap<number, Pick<PedidoApi, 'total'>>;

/**
 * Pedidos que la pantalla necesita para el cliente y el monto de los CFDI, sin repetir. Se traen uno
 * por uno después de pintar las facturas (antes se esperaba la lista completa de pedidos: 10 a 15 s).
 */
export function pedidosReferenciados(facturas: Pick<FacturaApi, 'tipo' | 'pedidoId'>[]): number[] {
  const ids = facturas.filter((f) => f.tipo === 'cfdi' && f.pedidoId != null).map((f) => f.pedidoId as number);
  return [...new Set(ids)];
}

/**
 * Monto de un documento: la nota trae el suyo; el CFDI, el total de su pedido. null mientras ese
 * pedido sigue cargando (la pantalla pinta skeleton, no $0.00).
 */
export function montoFactura(f: FacturaMonto, pedidos: PedidosPorId, cargandoPedidos: boolean): number | null {
  if (f.tipo === 'nota') return f.monto ?? 0;
  if (f.pedidoId == null) return 0;
  const pedido = pedidos.get(f.pedidoId);
  if (pedido) return pedido.total;
  return cargandoPedidos ? null : 0;
}

/** Suma de los montos; null mientras falte algún pedido, para no mostrar un total a medias. */
export function montoTotalFacturas(facturas: FacturaMonto[], pedidos: PedidosPorId, cargandoPedidos: boolean): number | null {
  let total = 0;
  for (const f of facturas) {
    const m = montoFactura(f, pedidos, cargandoPedidos);
    if (m === null) return null;
    total += m;
  }
  return total;
}
