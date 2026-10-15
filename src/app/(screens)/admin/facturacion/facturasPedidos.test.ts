import { describe, expect, it } from 'vitest';
import { montoFactura, montoTotalFacturas, pedidosReferenciados } from './facturasPedidos';

/**
 * H3: Facturación mostraba "0 documentos" y $0.00 de 10 a 15 s porque esperaba la lista completa de
 * pedidos. Ahora pinta las facturas en cuanto llegan y trae después solo los pedidos de los CFDI.
 */
const nota = (id: number, monto: number) => ({ id, tipo: 'nota' as const, monto, pedidoId: null });
const cfdi = (id: number, pedidoId: number | null) => ({ id, tipo: 'cfdi' as const, monto: null, pedidoId });

describe('pedidosReferenciados', () => {
  it('solo los pedidos de los CFDI, sin repetir y sin nulos', () => {
    expect(pedidosReferenciados([nota(1, 100), cfdi(2, 40), cfdi(3, 40), cfdi(4, null), cfdi(5, 12)])).toEqual([40, 12]);
  });

  it('sin CFDI no hay nada que traer', () => {
    expect(pedidosReferenciados([nota(1, 100)])).toEqual([]);
  });
});

describe('montoFactura', () => {
  const pedidos = new Map([[40, { total: 1250.5 }]]);

  it('la nota trae su propio monto aunque los pedidos sigan cargando', () => {
    expect(montoFactura(nota(1, 300), new Map(), true)).toBe(300);
  });

  it('el CFDI toma el total de su pedido; mientras llega, null (la pantalla pinta skeleton)', () => {
    expect(montoFactura(cfdi(2, 40), pedidos, false)).toBe(1250.5);
    expect(montoFactura(cfdi(2, 99), new Map(), true)).toBeNull();
  });

  it('un CFDI sin pedido, o cuyo pedido ya no existe, vale 0 al terminar de cargar', () => {
    expect(montoFactura(cfdi(4, null), pedidos, true)).toBe(0);
    expect(montoFactura(cfdi(2, 99), pedidos, false)).toBe(0);
  });
});

describe('montoTotalFacturas', () => {
  it('suma todo cuando ya están los pedidos', () => {
    expect(montoTotalFacturas([nota(1, 300), cfdi(2, 40)], new Map([[40, { total: 200 }]]), false)).toBe(500);
  });

  it('mientras falte un pedido es null, nunca un total a medias', () => {
    expect(montoTotalFacturas([nota(1, 300), cfdi(2, 40)], new Map(), true)).toBeNull();
  });
});
