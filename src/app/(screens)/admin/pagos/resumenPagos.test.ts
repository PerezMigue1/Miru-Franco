import { describe, expect, it } from 'vitest';
import { resumenPagos } from './resumenPagos';

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
