import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DatosRecogerEnSalon from './DatosRecogerEnSalon';

/** Dónde recoger: nombre, domicilio, mapa, teléfono y horario de Configuración del sitio. */
describe('"Recoger en el salón" con la configuración', () => {
  it('no usa los datos escritos a mano', () => {
    const fuente = readFileSync(join(__dirname, 'DatosRecogerEnSalon.tsx'), 'utf8');
    expect(fuente).toContain('useConfiguracionPublica');
    expect(fuente).not.toContain('contactoSalon');
  });

  it('muestra nombre, domicilio completo, "Cómo llegar" y horario (por omisión, los de hoy)', () => {
    const html = renderToStaticMarkup(createElement(DatosRecogerEnSalon));
    expect(html).toContain('Mirú Franco Salón Beauty');
    expect(html).toContain('Segunda Cerrada de Allende No. 15, Col. Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000');
    expect(html).toMatch(/href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[^"]+"/);
    expect(html).toContain('Lunes a viernes de 9:30 a 19:30 h.');
  });
});
