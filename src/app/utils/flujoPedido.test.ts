import { describe, expect, it } from 'vitest';
import { accionesPedido, permisoDeAccion, siguientesEstados, siguientesEstadosSinCobro } from './flujoPedido';

describe('Flujo del pedido para recoger en el salón', () => {
  it('pago en línea: se cobra, se prepara, queda listo y se entrega', () => {
    expect(accionesPedido('pendiente_pago', 'tarjeta_credito')).toEqual(['cobrar', 'cancelar']);
    expect(accionesPedido('pagado', 'tarjeta_credito')).toEqual(['preparar', 'cancelar']);
    expect(accionesPedido('preparando', 'tarjeta_credito')).toEqual(['listo', 'cancelar']);
    expect(accionesPedido('listo_recoger', 'tarjeta_credito')).toEqual(['entregar', 'cancelar']);
  });

  it('pago en línea con Mercado Pago pendiente: el personal no lo cobra en caja (lo confirma Mercado Pago)', () => {
    expect(accionesPedido('pendiente_pago', 'mercado_pago')).toEqual(['cancelar']);
    expect(accionesPedido('pagado', 'mercado_pago')).toEqual(['preparar', 'cancelar']);
  });

  it('pago al recoger: el apartado se prepara sin cobrar y se cobra al entregar', () => {
    expect(accionesPedido('pendiente_pago', 'pago_en_salon')).toEqual(['preparar', 'cancelar']);
    expect(accionesPedido('preparando', 'pago_en_salon')).toEqual(['listo', 'cancelar']);
    expect(accionesPedido('listo_recoger', 'pago_en_salon')).toEqual(['cobrarEntregar', 'cancelar']);
  });

  it('nadie pasa a enviado; los pedidos anteriores enviados solo se cierran', () => {
    for (const estado of ['borrador', 'pendiente_pago', 'pagado', 'preparando', 'listo_recoger', 'enviado'] as const) {
      expect(siguientesEstados(estado, 'tarjeta_debito')).not.toContain('enviado');
      expect(siguientesEstados(estado, 'pago_en_salon')).not.toContain('enviado');
    }
    expect(accionesPedido('enviado', 'efectivo')).toEqual(['entregar', 'cancelar']);
  });

  it('los selectores no ofrecen pasos que implican cobrar (van por el botón que registra el pago)', () => {
    expect(siguientesEstadosSinCobro('pendiente_pago', 'tarjeta_credito')).toEqual(['cancelado']);
    expect(siguientesEstadosSinCobro('listo_recoger', 'pago_en_salon')).toEqual(['cancelado']);
    expect(siguientesEstadosSinCobro('listo_recoger', 'tarjeta_debito')).toEqual(['entregado', 'cancelado']);
  });

  it('cada botón pide el permiso que exige el servidor: entregas o caja', () => {
    expect(['listo', 'entregar', 'cobrarEntregar'].map((a) => permisoDeAccion(a as never))).toEqual(['pedidos:entregar', 'pedidos:entregar', 'pedidos:entregar']);
    expect(['cobrar', 'preparar', 'cancelar'].map((a) => permisoDeAccion(a as never))).toEqual(['caja:escritura', 'caja:escritura', 'caja:escritura']);
  });

  it('entregado y cancelado no tienen siguiente paso', () => {
    expect(accionesPedido('entregado', 'pago_en_salon')).toEqual([]);
    expect(accionesPedido('cancelado', 'tarjeta_credito')).toEqual([]);
  });
});
