import { describe, expect, it } from 'vitest';
import type { PagoApi } from '../../../services/ecommerce';
import { elegirPagoPorAprobar, fmtMonedaPedido, nombreClientaPedido } from './pagoPedido';

const pago = (id: number, estado: string, creadoEn: string): PagoApi => ({
  id, estado, creadoEn, intentoNumero: id, monto: 100, moneda: 'MXN', metodo: 'transferencia', pedidoId: 9,
});

describe('Aprobar pago de un pedido online', () => {
  it('elige el pago pendiente más reciente (el backend los manda del más nuevo al más antiguo)', () => {
    const pagos = [
      pago(3, 'pendiente', '2026-10-03T10:00:00Z'),
      pago(2, 'rechazado', '2026-10-02T10:00:00Z'),
      pago(1, 'pendiente', '2026-10-01T10:00:00Z'),
    ];
    expect(elegirPagoPorAprobar(pagos)?.id).toBe(3);
  });

  it('no depende del orden en que lleguen', () => {
    const pagos = [pago(1, 'pendiente', '2026-10-01T10:00:00Z'), pago(4, 'en_revision', '2026-10-04T10:00:00Z')];
    expect(elegirPagoPorAprobar(pagos)?.id).toBe(4);
  });

  it('no aprueba pagos ya aprobados, rechazados o reembolsados', () => {
    const pagos = [pago(2, 'aprobado', '2026-10-02T10:00:00Z'), pago(1, 'rechazado', '2026-10-01T10:00:00Z')];
    expect(elegirPagoPorAprobar(pagos)).toBeNull();
    expect(elegirPagoPorAprobar([])).toBeNull();
  });
});

/** B9: sin el nombre de la clienta, la tabla mostraba su UUID. Mismo texto que en Pagos. */
describe('Nombre de la clienta del pedido', () => {
  const nombres = new Map([['u-1', { nombre: 'Ana López' }], ['u-2', { nombre: '  ' }]]);

  it('usa el nombre registrado', () => {
    expect(nombreClientaPedido(nombres, 'u-1')).toBe('Ana López');
  });

  it('sin nombre, sin usuario o con un usuario que no se cargó dice "Cliente sin nombre", nunca el UUID', () => {
    expect(nombreClientaPedido(nombres, 'u-2')).toBe('Cliente sin nombre');
    expect(nombreClientaPedido(nombres, '6f1c2a90-0d4e-4b7e-9a51-3c2f8e7d1b44')).toBe('Cliente sin nombre');
    expect(nombreClientaPedido(nombres, null)).toBe('Cliente sin nombre');
  });
});

describe('Montos de pedidos online', () => {
  it('se muestran como precio MXN con decimales, no "1,234.5 MXN"', () => {
    expect(fmtMonedaPedido(1234.5)).toBe('$1,234.50');
    expect(fmtMonedaPedido(800)).toBe('$800');
  });
});
