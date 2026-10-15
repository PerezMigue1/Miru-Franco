import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Modal from './Modal';

const sistema = readFileSync(join(__dirname, '..', '..', 'styles', 'sistema.css'), 'utf8');

/** z-index declarado en el primer bloque del selector dentro de sistema.css. */
function zIndexDe(selector: string): number {
  const bloque = sistema.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`));
  const z = bloque?.[1].match(/z-index:\s*(\d+)/);
  if (!z) throw new Error(`Sin z-index para ${selector}`);
  return Number(z[1]);
}

const props: Omit<ComponentProps<typeof Modal>, 'children'> = {
  isOpen: true,
  onClose: () => {},
  title: 'Registrar CFDI timbrado',
  footer: createElement('button', null, 'Guardar'),
};
const html = renderToStaticMarkup(createElement(Modal, props as ComponentProps<typeof Modal>, createElement('p', null, 'Contenido')));
const clases = (patron: RegExp) => html.match(patron)?.[1].split(/\s+/) ?? [];

describe('Modal sobre el cascarón de los paneles', () => {
  it('el velo queda por encima de la barra y del menú lateral (antes z-50, debajo de ambos)', () => {
    const velo = clases(/<div class="(mf-velo[^"]*)"/);
    const z = velo.map((c) => c.match(/^z-\[?(\d+)\]?$/)).find(Boolean);
    expect(z, 'el velo declara su z-index').toBeTruthy();
    const zVelo = Number(z![1]);
    expect(zVelo).toBeGreaterThan(zIndexDe('.mf-panel-barra'));
    expect(zVelo).toBeGreaterThan(zIndexDe('.mf-panel-lateral'));
    // Y por debajo de la re-aceptación de documentos (z-[70]) y de "Saltar al contenido" (.mf-saltar).
    expect(zVelo).toBeLessThan(70);
    expect(zVelo).toBeLessThan(zIndexDe('.mf-saltar'));
  });

  it('el diálogo cabe en el alto visible y desplaza su contenido por dentro', () => {
    const dialogo = clases(/role="dialog"[^>]*class="([^"]*)"/);
    expect(dialogo.some((c) => /^max-h-\[\d+dvh\]$/.test(c))).toBe(true);
    expect(dialogo).toContain('flex-col');
    const cuerpo = clases(/<div class="([^"]*overflow-y-auto[^"]*)"/);
    expect(cuerpo).toEqual(expect.arrayContaining(['overflow-y-auto', 'min-h-0']));
  });

  it('en móvil los botones del pie se apilan a todo lo ancho (B18)', () => {
    const pie = clases(/<div class="([^"]*border-t[^"]*)"/);
    expect(pie).toEqual(expect.arrayContaining(['flex-col-reverse', 'items-stretch', 'sm:flex-row', 'sm:justify-end']));
  });
});
