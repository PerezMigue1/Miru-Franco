import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  accionesDeVenta,
  etiquetaMetodoVenta,
  mensajeErrorAccionVenta,
  presentacionIdDeVenta,
  puedeCancelarVenta,
  textoDevolucionFueraDeCaja,
  textoModalAnular,
  textoTotalDelDia,
  totalDelDia,
  ventasPagadasDelDia,
} from './ventasDia';

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

describe('Venta local: acciones de cada venta (cancelar vs anular cortada)', () => {
  // Para anular una venta cortada el backend exige devoluciones:gestionar y caja:escritura (si falta, 409).
  const conClave = (clave: string) => clave === 'devoluciones:gestionar' || clave === 'caja:escritura';
  const soloDevoluciones = (clave: string) => clave === 'devoluciones:gestionar';
  const sinClaves = () => false;
  const ninguna = { cancelar: false, anularCortada: false, devolverFueraDeCaja: false };

  it('pagada SIN corte: se ofrece cancelar, nunca anular (aunque se tenga la clave)', () => {
    expect(accionesDeVenta('pagada', null, 'efectivo', conClave)).toEqual({ ...ninguna, cancelar: true });
    expect(accionesDeVenta('pagada', undefined, 'efectivo', conClave)).toEqual({ ...ninguna, cancelar: true });
    expect(accionesDeVenta('pagada', null, 'tarjeta', conClave)).toEqual({ ...ninguna, cancelar: true });
  });

  it('pagada en efectivo CON corte y devoluciones:gestionar: solo "Anular venta cortada" (cancelar sigue oculta)', () => {
    expect(accionesDeVenta('pagada', 14, 'efectivo', conClave)).toEqual({ ...ninguna, anularCortada: true });
  });

  it('pagada en efectivo CON corte, con devoluciones:gestionar pero SIN caja:escritura: no se ofrece anular', () => {
    expect(accionesDeVenta('pagada', 14, 'efectivo', soloDevoluciones).anularCortada).toBe(false);
  });

  it('pagada con tarjeta CON corte: no se ofrece anular (el backend solo anula efectivo); se explica la devolución', () => {
    expect(accionesDeVenta('pagada', 14, 'tarjeta', conClave)).toEqual({ ...ninguna, devolverFueraDeCaja: true });
  });

  it('pagada con pago mixto o transferencia CON corte: tampoco se ofrece anular', () => {
    expect(accionesDeVenta('pagada', 14, 'mixto', conClave)).toEqual({ ...ninguna, devolverFueraDeCaja: true });
    expect(accionesDeVenta('pagada', 14, 'transferencia', conClave)).toEqual({ ...ninguna, devolverFueraDeCaja: true });
  });

  it('pagada CON corte sin la clave: ninguna acción ni explicación (el backend respondería 403)', () => {
    expect(accionesDeVenta('pagada', 14, 'efectivo', sinClaves)).toEqual(ninguna);
    expect(accionesDeVenta('pagada', 14, 'tarjeta', sinClaves)).toEqual(ninguna);
  });

  it('cancelada o pendiente: nunca se ofrece anular, con o sin corte', () => {
    expect(accionesDeVenta('cancelada', 14, 'efectivo', conClave)).toEqual(ninguna);
    expect(accionesDeVenta('cancelada', 14, 'tarjeta', conClave)).toEqual(ninguna);
    expect(accionesDeVenta('pendiente', 14, 'efectivo', conClave).anularCortada).toBe(false);
  });

  it('el texto para ventas cortadas que no son en efectivo dice que se devuelven por el método original, fuera de la caja', () => {
    expect(textoDevolucionFueraDeCaja('tarjeta')).toBe(
      'Cobrada con tarjeta: no se anula desde la caja. Si hay que devolverla, se devuelve por el método original, fuera de la caja.',
    );
    expect(textoDevolucionFueraDeCaja('mixto')).toBe(
      'Cobrada con pago mixto: no se anula desde la caja. Si hay que devolverla, se devuelve por el método original, fuera de la caja.',
    );
    expect(textoDevolucionFueraDeCaja('transferencia')).toContain('Cobrada con transferencia:');
  });
});

describe('Venta local: modal de anular una venta cortada', () => {
  const BASE =
    'Esta venta ya entró a un corte de caja. Al anularla se registra una salida de efectivo por su total, que se descuenta en tu siguiente corte, y el stock regresa al inventario.';
  const item = (citaId?: number | null) => ({ cantidad: 1, precioUnitario: 300, citaId });

  it('sin cita: solo explica la salida de efectivo y el stock', () => {
    expect(textoModalAnular({ items: [item(null), item(undefined)] })).toEqual([BASE]);
  });

  it('si la venta cobraba una cita, avisa que esa cita vuelve a quedar por cobrar', () => {
    expect(textoModalAnular({ items: [item(null), item(12)] })).toEqual([
      BASE,
      'Esta venta cobraba la cita #12: al anularla, esa cita vuelve a quedar por cobrar.',
    ]);
  });

  it('con varias citas las nombra todas', () => {
    expect(textoModalAnular({ items: [item(12), item(15), item(12)] })[1]).toBe(
      'Esta venta cobraba las citas #12 y #15: al anularla, esas citas vuelven a quedar por cobrar.',
    );
  });

  it('las dos pantallas usan los mismos textos y la misma regla', () => {
    const raiz = join(__dirname, '..', '..');
    for (const ruta of ['admin/venta-local/page.tsx', '(privada)/operacion/punto-de-venta/page.tsx']) {
      const fuente = readFileSync(join(raiz, ruta), 'utf8');
      expect(fuente, ruta).toMatch(/accionesDeVenta\(\w+(\.raw)?\.estado, \w+(\.raw)?\.corteId, \w+(\.raw)?\.metodoPago, tienePermiso\)/);
      expect(fuente, ruta).toContain('textoDevolucionFueraDeCaja(');
      expect(fuente, ruta).toContain('textoModalAnular(');
      expect(fuente, ruta).toContain('mensajeErrorAccionVenta(');
      expect(fuente, ruta).not.toContain('Al anularla se registra una salida de efectivo');
    }
  });
});

describe('Venta local: errores al cancelar o anular', () => {
  it('muestra el mensaje del backend tal cual (por ejemplo, el 409 de quien no opera la caja)', () => {
    const texto = 'Para anular necesitas operar la caja: pide a quien hace el corte que registre la anulación.';
    expect(mensajeErrorAccionVenta(new Error(texto), 'anular')).toBe(texto);
  });

  it('sin mensaje usa uno genérico según la acción', () => {
    expect(mensajeErrorAccionVenta(new Error(''), 'anular')).toBe('No se pudo anular la venta. Intenta de nuevo.');
    expect(mensajeErrorAccionVenta(null, 'cancelar')).toBe('No se pudo cancelar la venta. Intenta de nuevo.');
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
