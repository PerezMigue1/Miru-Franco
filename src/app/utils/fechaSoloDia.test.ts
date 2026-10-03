import { describe, expect, it } from 'vitest';
import { diasHastaFechaSoloDia, formatearFechaSoloDia } from './fechaSoloDia';

describe('formatearFechaSoloDia', () => {
  it('una fecha guardada como 2026-10-04T00:00:00Z se muestra como 4/10/2026 (no 3/10)', () => {
    expect(formatearFechaSoloDia('2026-10-04T00:00:00Z')).toBe('4/10/2026');
    expect(formatearFechaSoloDia(new Date('2026-10-04T00:00:00.000Z'))).toBe('4/10/2026');
  });

  it("un 'YYYY-MM-DD' de un input date muestra ese mismo día", () => {
    expect(formatearFechaSoloDia('2026-10-01')).toBe('1/10/2026');
    expect(formatearFechaSoloDia('2026-10-31')).toBe('31/10/2026');
  });

  it('respeta las opciones de formato de cada pantalla', () => {
    expect(formatearFechaSoloDia('2026-10-04T00:00:00Z', { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe(
      '04/10/2026',
    );
  });

  it('sin fecha o con una inválida devuelve null', () => {
    expect(formatearFechaSoloDia(null)).toBeNull();
    expect(formatearFechaSoloDia('')).toBeNull();
    expect(formatearFechaSoloDia('no es fecha')).toBeNull();
  });
});

describe('diasHastaFechaSoloDia', () => {
  // 4 de octubre de 2026, mediodía en México (UTC-6).
  const mediodiaMexico = new Date('2026-10-04T18:00:00Z');

  it('caducidad hoy, mañana y ayer dan 0, 1 y -1', () => {
    expect(diasHastaFechaSoloDia('2026-10-04T00:00:00.000Z', mediodiaMexico)).toBe(0);
    expect(diasHastaFechaSoloDia('2026-10-05T00:00:00.000Z', mediodiaMexico)).toBe(1);
    expect(diasHastaFechaSoloDia('2026-10-03T00:00:00.000Z', mediodiaMexico)).toBe(-1);
  });

  it('usa el día de hoy en México aunque en UTC ya sea el día siguiente', () => {
    // 3 de octubre a las 23:30 en México = 4 de octubre 05:30 UTC: la caducidad del 4 es mañana.
    const nocheMexico = new Date('2026-10-04T05:30:00Z');
    expect(diasHastaFechaSoloDia('2026-10-04T00:00:00.000Z', nocheMexico)).toBe(1);
    expect(diasHastaFechaSoloDia('2026-10-03T00:00:00.000Z', nocheMexico)).toBe(0);
  });

  it('no depende de la hora: a las 00:01 y a las 23:59 de México da lo mismo', () => {
    expect(diasHastaFechaSoloDia('2026-10-10', new Date('2026-10-04T06:01:00Z'))).toBe(6);
    expect(diasHastaFechaSoloDia('2026-10-10', new Date('2026-10-05T05:59:00Z'))).toBe(6);
  });

  it('sin fecha o con una inválida devuelve null', () => {
    expect(diasHastaFechaSoloDia(undefined)).toBeNull();
    expect(diasHastaFechaSoloDia('x')).toBeNull();
  });
});
