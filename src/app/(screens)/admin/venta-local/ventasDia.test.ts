import { describe, expect, it } from 'vitest';
import { etiquetaMetodoVenta, presentacionIdDeVenta, puedeCancelarVenta, textoTotalDelDia, totalDelDia, ventasPagadasDelDia } from './ventasDia';

const presentacion = (id: number, tamaño: string) => ({ id, tamaño, precio: '$100', stock: 3, disponible: true });

describe('Venta local: total del día', () => {
  it('"Ventas de hoy" cuenta solo las pagadas, igual que el total', () => {
    expect(ventasPagadasDelDia([{ estado: 'pagada' }, { estado: 'cancelada' }, { estado: 'pagada' }])).toBe(2);
  });

  it('suma solo las ventas pagadas (las canceladas y pendientes no son dinero cobrado)', () => {
    expect(
      totalDelDia([
        { estado: 'pagada', total: 350.5 },
        { estado: 'cancelada', total: 1000 },
        { estado: 'pagada', total: 99.25 },
        { estado: 'pendiente', total: 40 },
      ]),
    ).toBe(449.75);
  });

  it('se muestra con formato MXN y dos decimales', () => {
    expect(textoTotalDelDia(1449.5)).toBe('$1,449.50');
    expect(textoTotalDelDia(0)).toBe('$0.00');
  });
});

describe('Venta local: tabla de ventas', () => {
  it('el método de pago se muestra con etiqueta', () => {
    expect(etiquetaMetodoVenta('efectivo')).toBe('Efectivo');
    expect(etiquetaMetodoVenta('tarjeta')).toBe('Tarjeta');
    expect(etiquetaMetodoVenta('transferencia')).toBe('Transferencia');
    expect(etiquetaMetodoVenta('mixto')).toBe('Mixto');
  });

  it('una venta cancelada ya no ofrece "Cancelar"', () => {
    expect(puedeCancelarVenta('cancelada')).toBe(false);
    expect(puedeCancelarVenta('pagada')).toBe(true);
  });

  it('una venta que ya entró a un corte de caja no se ofrece para cancelar (el backend la rechaza)', () => {
    expect(puedeCancelarVenta('pagada', 14)).toBe(false);
    expect(puedeCancelarVenta('pagada', null)).toBe(true);
  });
});

describe('Venta local: presentación que se cobra', () => {
  it('sin presentaciones no manda el id del producto como presentacionId', () => {
    expect(presentacionIdDeVenta({ id: 55, presentaciones: [] }, '55', '')).toBeNull();
    expect(presentacionIdDeVenta(undefined, '55', '')).toBeNull();
  });

  it('con varias presentaciones usa la elegida', () => {
    const producto = { id: 55, presentaciones: [presentacion(70, '500ml'), presentacion(71, '1L')] };
    expect(presentacionIdDeVenta(producto, '55', '71')).toBe(71);
  });

  it('con una sola presentación la usa sin pedir elegir', () => {
    expect(presentacionIdDeVenta({ id: 55, presentaciones: [presentacion(70, '500ml')] }, '55', '')).toBe(70);
  });
});
