import { describe, expect, it } from 'vitest';
import { TAMANO_PAGINA_TABLA, paginar } from './paginacion';

/** H4: Clientes CRM (1016 filas) y Usuarios (986) pintaban todo de golpe; ahora van de 50 en 50. */
describe('paginar', () => {
  const mil = Array.from({ length: 1016 }, (_, i) => i + 1);

  it('de 50 en 50', () => {
    expect(TAMANO_PAGINA_TABLA).toBe(50);
    const p = paginar(mil, 1);
    expect(p.filas).toHaveLength(50);
    expect(p.filas[0]).toBe(1);
    expect(p.totalPaginas).toBe(21);
  });

  it('la última página trae lo que sobra', () => {
    const p = paginar(mil, 21);
    expect(p.filas).toEqual([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016]);
  });

  it('una página fuera de rango se ajusta (al filtrar, la lista se acorta)', () => {
    expect(paginar(mil.slice(0, 60), 21)).toMatchObject({ pagina: 2, totalPaginas: 2 });
    expect(paginar(mil, 0).pagina).toBe(1);
    expect(paginar(mil, Number.NaN).pagina).toBe(1);
  });

  it('sin filas hay una página vacía', () => {
    expect(paginar([], 3)).toEqual({ filas: [], pagina: 1, totalPaginas: 1 });
  });
});
