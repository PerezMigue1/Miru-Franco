import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sistema = readFileSync(join(__dirname, 'sistema.css'), 'utf8');
const regla = (selector: string) => {
  const m = sistema.match(new RegExp(`(?:^|\\n)${selector.replace(/[.:]/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`Sin regla ${selector}`);
  return m[1];
};

/**
 * H11: el error de una casilla legal quedaba más cerca de la casilla siguiente que de la suya y, en
 * claro, del mismo color que la etiqueta (#600011): no se distinguía.
 */
describe('Error de las casillas legales (.mf-consentimiento__error)', () => {
  it('se pega a su casilla, se separa de la siguiente y se alinea con el texto de la etiqueta', () => {
    const css = regla('.mf-consentimiento__error');
    expect(css).toMatch(/margin-top:\s*-0\.25rem/);
    expect(css).toMatch(/margin-bottom:\s*0\.5rem/);
    expect(css).toMatch(/padding-left:\s*1\.75rem/);
  });

  it('lleva un ícono de alerta dibujado con el color del texto (sin colores fijos)', () => {
    const icono = regla('.mf-consentimiento__error::before');
    expect(icono).toMatch(/background-color:\s*currentColor/);
    expect(icono).toMatch(/mask:\s*url\(/);
    expect(icono).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});
