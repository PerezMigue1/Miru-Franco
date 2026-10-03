import { esPagoEnSalon, METODO_PAGO_MERCADOPAGO, type EstadoPedidoUi } from '../services/ecommerce';

/**
 * Las mismas reglas que valida el backend (backend-miru/src/ecommerce/pedidos/flujo-pedido.ts):
 * todo pedido se recoge en el salón.
 * - Pago en línea:   pendiente_pago → pagado → preparando → listo_recoger → entregado
 * - Pago al recoger: pendiente_pago (apartado) → preparando → listo_recoger → entregado (se cobra al entregar)
 * - cancelado en cualquier punto antes de entregar; 'enviado' solo existe en pedidos anteriores.
 */
const SIGUIENTES: Record<EstadoPedidoUi, EstadoPedidoUi[]> = {
  borrador: ['pendiente_pago', 'cancelado'],
  pendiente_pago: ['pagado', 'cancelado'],
  pagado: ['preparando', 'cancelado'],
  preparando: ['listo_recoger', 'cancelado'],
  listo_recoger: ['entregado', 'cancelado'],
  enviado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

/** Estados a los que el personal puede mover el pedido desde el actual. */
export function siguientesEstados(estado: EstadoPedidoUi, metodoPago: string | null | undefined): EstadoPedidoUi[] {
  if (estado === 'pendiente_pago' && esPagoEnSalon(metodoPago)) return ['preparando', 'cancelado'];
  return SIGUIENTES[estado] ?? [];
}

/**
 * Para los selectores de estado: los siguientes pasos sin los que implican cobrar ('pagado', y en el
 * pago al recoger 'entregado'). Esos van por los botones de cobro, que registran el Pago; así el
 * corte de caja no pierde dinero cobrado.
 */
export function siguientesEstadosSinCobro(estado: EstadoPedidoUi, metodoPago: string | null | undefined): EstadoPedidoUi[] {
  const enSalon = esPagoEnSalon(metodoPago);
  return siguientesEstados(estado, metodoPago).filter((e) => e !== 'pagado' && !(enSalon && e === 'entregado'));
}

export type AccionPedido = 'cobrar' | 'preparar' | 'listo' | 'entregar' | 'cobrarEntregar' | 'cancelar';

/** Botones rápidos para el personal: el siguiente paso del flujo y cancelar. */
export function accionesPedido(estado: EstadoPedidoUi, metodoPago: string | null | undefined): AccionPedido[] {
  const enSalon = esPagoEnSalon(metodoPago);
  // Un pago en línea lo confirma Mercado Pago (webhook); cobrarlo en caja lo cobraría dos veces.
  const enLinea = (metodoPago ?? '').trim().toLowerCase() === METODO_PAGO_MERCADOPAGO;
  const acciones: AccionPedido[] = [];
  for (const siguiente of siguientesEstados(estado, metodoPago)) {
    if (siguiente === 'pagado') {
      if (!enLinea) acciones.push('cobrar');
    } else if (siguiente === 'preparando') acciones.push('preparar');
    else if (siguiente === 'listo_recoger') acciones.push('listo');
    else if (siguiente === 'entregado') acciones.push(enSalon && estado === 'listo_recoger' ? 'cobrarEntregar' : 'entregar');
    else if (siguiente === 'cancelado') acciones.push('cancelar');
  }
  return acciones;
}

/** Permiso que exige el servidor para cada botón: marcar listo y entregar son de entregas; lo demás, de caja. */
export function permisoDeAccion(accion: AccionPedido): 'pedidos:entregar' | 'caja:escritura' {
  return accion === 'listo' || accion === 'entregar' || accion === 'cobrarEntregar' ? 'pedidos:entregar' : 'caja:escritura';
}

/** Lo mismo para un estado elegido en el selector del detalle. */
export function permisoDeEstado(estado: EstadoPedidoUi): 'pedidos:entregar' | 'caja:escritura' {
  return estado === 'listo_recoger' || estado === 'entregado' ? 'pedidos:entregar' : 'caja:escritura';
}
