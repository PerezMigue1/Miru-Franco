import { describe, expect, it } from 'vitest';
import type { PagoApi } from '../../../services/ecommerce';
import { elegirPagoPorAprobar, fmtMonedaPedido } from './pagoPedido';

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

describe('Montos de pedidos online', () => {
  it('se muestran como precio MXN con decimales, no "1,234.5 MXN"', () => {
    expect(fmtMonedaPedido(1234.5)).toBe('$1,234.50');
    expect(fmtMonedaPedido(800)).toBe('$800');
  });
});
