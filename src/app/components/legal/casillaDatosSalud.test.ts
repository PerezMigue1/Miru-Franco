import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CasillaDatosSalud from './CasillaDatosSalud';

const sinEtiquetas = (html: string) => html.replace(/<[^>]+>/g, '');

describe('Casilla de datos de salud', () => {
  it('para el personal: la persona aceptó que registremos sus datos de salud, sin premarcar', () => {
    const html = renderToStaticMarkup(createElement(CasillaDatosSalud, { quien: 'personal', id: 'salud' }));
    expect(sinEtiquetas(html)).toBe('La persona aceptó que registremos sus datos de salud para cuidar sus servicios');
    expect(html).toMatch(/<input type="checkbox" id="salud"/);
    expect(html).not.toMatch(/\bchecked\b/);
  });

  it('para la titular: autoriza el uso de sus datos de salud conforme al Aviso (la misma del registro)', () => {
    const html = renderToStaticMarkup(createElement(CasillaDatosSalud, { id: 'salud' }));
    expect(sinEtiquetas(html)).toContain('Autorizo el uso de mis datos de salud');
    expect(html).toContain('href="/aviso-de-privacidad"');
  });
});
