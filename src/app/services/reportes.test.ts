import { describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./client', () => ({ apiClient: { get } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { filasIngresos, obtenerReporteVentas } from './reportes';

const resumen = { totalVentas: 2, totalMonto: '1450', totalUnidadesVendidas: 0, porMetodo: { efectivo: '950', tarjeta: '500', transferencia: '0', mixto: '0' } };

describe('Reporte de ventas: ingresos por fuente', () => {
  it('normaliza los ingresos (Decimal llega como texto) y los muestra por fuente, con revisión y reembolsos aparte', async () => {
    get.mockResolvedValueOnce({
      data: {
        resumen,
        ventas: [],
        ingresos: {
          total: '1600', ventasPos: '1250', cobrosPedidosSalon: '0', anticipos: '350', anticiposEnLinea: '150',
          anticiposEnSalon: '200', anticiposEnRevision: '100', anticiposReembolsados: '150',
        },
      },
    });
    const r = await obtenerReporteVentas('2026-10-02', '2026-10-03');
    expect(r.ingresos.total).toBe(1600);
    expect(filasIngresos(r.ingresos)).toEqual([
      { label: 'Ventas en el punto de venta', valor: '$1,250.00' },
      { label: 'Cobros de pedidos en el salón', valor: '$0.00' },
      { label: 'Anticipos de citas en línea', valor: '$150.00' },
      { label: 'Anticipos de citas en el salón', valor: '$200.00' },
      { label: 'Ingresos totales', valor: '$1,600.00' },
      { label: 'Anticipos en revisión (no suman)', valor: '$100.00' },
      { label: 'Anticipos reembolsados (no suman)', valor: '$150.00' },
    ]);
  });

  it('si el backend aún no manda ingresos, el total es el monto del resumen', async () => {
    get.mockResolvedValueOnce({ data: { resumen, ventas: [] } });
    const r = await obtenerReporteVentas();
    expect(r.ingresos.total).toBe(1450);
    expect(r.ingresos.ventasPos).toBe(1450);
  });
});
