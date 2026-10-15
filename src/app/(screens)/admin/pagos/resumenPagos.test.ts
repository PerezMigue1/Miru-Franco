import { describe, expect, it } from 'vitest';
import { fechaPago, resumenPagos } from './resumenPagos';

/** B16: Pagos mostraba "3/10/2026"; el resto del panel usa dd/mm/aaaa (día de México). */
describe('Fecha de un pago', () => {
  it('dd/mm/aaaa con el día de México', () => {
    expect(fechaPago('2026-10-03T18:00:00Z')).toBe('03/10/2026');
    // 01:30 UTC del 4 de octubre todavía es 3 de octubre en México.
    expect(fechaPago('2026-10-04T01:30:00Z')).toBe('03/10/2026');
  });

  it('sin fecha o con una fecha inválida, un guion', () => {
    expect(fechaPago(null)).toBe('-');
    expect(fechaPago('no-es-fecha')).toBe('-');
  });
});

describe('KPIs de pagos', () => {
  it('el monto suma solo pagos aprobados (no pendientes, rechazados ni reembolsados)', () => {
    const r = resumenPagos([
      { monto: 500, estado: 'aprobado' },
      { monto: 250.5, estado: 'aprobado' },
      { monto: 900, estado: 'pendiente' },
      { monto: 300, estado: 'rechazado' },
      { monto: 120, estado: 'reembolsado' },
      { monto: 80, estado: 'cancelado' },
    ]);
    expect(r.montoAprobado).toBe(750.5);
    expect(r.totalPagos).toBe(6);
    expect(r.pendientes).toBe(1);
    expect(r.rechazados).toBe(2);
  });
});
