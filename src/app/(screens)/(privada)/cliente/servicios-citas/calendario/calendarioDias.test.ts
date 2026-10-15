import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

/**
 * Días del calendario: a 375 px medían 35 x 48 (siete columnas con gap-2 dentro de una tarjeta p-6). Con la
 * tarjeta en p-4 y sin espacio horizontal entre columnas en móvil, cada día ocupa 1/7 de 311 px: 44 x 48.
 */
describe('Calendario de citas: días de 44 px en móvil', () => {
  it('la tarjeta del calendario usa p-4 en móvil y p-6 desde 640 px', () => {
    expect(pagina).toMatch(/<Card padding="sm" className="sm:p-6">\s*<div className="flex items-center justify-between mb-6">/);
  });

  it('las dos rejillas (nombres de los días y días) van sin espacio horizontal en móvil', () => {
    const rejillas = pagina.match(/<div className="grid grid-cols-7[^"]*"/g) ?? [];
    expect(rejillas).toHaveLength(2);
    for (const r of rejillas) {
      expect(r).toMatch(/\bgap-x-0\b/);
      expect(r).toMatch(/\bsm:gap-2\b/);
    }
  });

  it('cada día llena su columna y mide al menos 44 px de ancho y 48 de alto', () => {
    const dia = pagina.match(/className=\{`mf-btn mf-cifras [^`]*`\}/)?.[0] ?? '';
    expect(dia).toMatch(/\bw-full\b/);
    expect(dia).toMatch(/\bmin-w-11\b/);
    expect(dia).toMatch(/\bh-12\b/);
  });
});
