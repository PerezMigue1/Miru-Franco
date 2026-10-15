import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PanelHorasExtra from './PanelHorasExtra';

/** Sin DOM: se pinta el estado inicial (calculando) y lo que solo sale con datos se revisa en el código. */
const fuente = readFileSync(join(__dirname, 'PanelHorasExtra.tsx'), 'utf8');

describe('Horas extra: corrección visual (H11)', () => {
  it('el campo de mes es el del sistema (alto táctil de 44 px, borde y foco)', () => {
    const html = renderToStaticMarkup(createElement(PanelHorasExtra));
    const campo = html.match(/<input[^>]*type="month"[^>]*>/)?.[0] ?? '';
    expect(campo).toContain('aria-label="Mes de las horas extra"');
    expect(campo).toMatch(/class="[^"]*\bmf-campo\b/);
  });

  it('el título lleva mayúscula solo al inicio', () => {
    const html = renderToStaticMarkup(createElement(PanelHorasExtra));
    expect(html).toContain('Horas extra del mes');
    expect(fuente).not.toContain('Horas Extras del Mes');
  });

  it('nombre y monto separados: gap-3 y el monto alineado a la derecha sin encogerse', () => {
    const idx = fuente.indexOf('{r.nombre}');
    const fila = fuente.slice(fuente.lastIndexOf('<div className="flex', idx), fuente.indexOf("'Tarifa no configurada'", idx));
    expect(fila).toMatch(/<div className="flex[^"]*\bgap-3\b/);
    expect(fila).toMatch(/<p className="[^"]*\btext-right\b[^"]*\bshrink-0\b|<p className="[^"]*\bshrink-0\b[^"]*\btext-right\b/);
  });
});
