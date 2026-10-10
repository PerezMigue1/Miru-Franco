import { describe, expect, it } from 'vitest';
import {
  anioEnMexico,
  diaEnMexico,
  diasHastaFechaSoloDia,
  formatearFechaSoloDia,
  hoyEnMexico,
  mesActualEnMexico,
  mismoDiaHaceAnios,
} from './fechaSoloDia';

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

describe('hoy en México', () => {
  it('"hoy" a las 19:00 y a las 23:59 hora de México sigue siendo el mismo día', () => {
    expect(hoyEnMexico(new Date('2026-10-04T01:00:00Z'))).toBe('2026-10-03'); // 19:00 del 3
    expect(hoyEnMexico(new Date('2026-10-04T05:59:00Z'))).toBe('2026-10-03'); // 23:59 del 3
    expect(hoyEnMexico(new Date('2026-10-04T06:00:00Z'))).toBe('2026-10-04'); // 00:00 del 4
  });

  it('el mes actual no salta al siguiente la noche del último día', () => {
    expect(mesActualEnMexico(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10'); // 31 oct 21:00
  });

  it('diaEnMexico da el día de México de una marca de tiempo', () => {
    expect(diaEnMexico('2026-10-04T01:30:00.000Z')).toBe('2026-10-03'); // queja a las 19:30 del 3
    expect(diaEnMexico(null)).toBeNull();
    expect(diaEnMexico('x')).toBeNull();
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

describe('mismoDiaHaceAnios (mayoría de edad en el registro)', () => {
  it('a las 23:00 del 3 de octubre en México, el límite de 18 años es el 3 de octubre de 2008', () => {
    const hoy = hoyEnMexico(new Date('2026-10-04T05:00:00Z')); // en UTC ya es el 4
    expect(hoy).toBe('2026-10-03');
    expect(mismoDiaHaceAnios(hoy, 18)).toBe('2008-10-03');
    expect('2008-10-04' <= mismoDiaHaceAnios(hoy, 18)).toBe(false); // cumple 18 mañana
    expect('2008-10-03' <= mismoDiaHaceAnios(hoy, 18)).toBe(true);
  });

  it('un 29 de febrero en un año no bisiesto queda en el 28', () => {
    expect(mismoDiaHaceAnios('2028-02-29', 18)).toBe('2010-02-28');
    expect(mismoDiaHaceAnios('2028-02-29', 20)).toBe('2008-02-29');
  });
});

describe('anioEnMexico', () => {
  it('da el año de México aunque en UTC ya sea el siguiente (servidor y navegador coinciden)', () => {
    // 31 de diciembre a las 20:00 en México = 1 de enero 02:00 UTC.
    expect(anioEnMexico(new Date('2027-01-01T02:00:00Z'))).toBe(2026);
    expect(anioEnMexico(new Date('2027-01-01T07:00:00Z'))).toBe(2027);
  });
});
