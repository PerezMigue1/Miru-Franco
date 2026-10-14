import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Footer from './Footer';

afterEach(() => {
  vi.unstubAllEnvs();
});

function sinRedes() {
  vi.stubEnv('NEXT_PUBLIC_INSTAGRAM_URL', '');
  vi.stubEnv('NEXT_PUBLIC_FACEBOOK_URL', '');
  vi.stubEnv('NEXT_PUBLIC_TWITTER_URL', '');
}

/** Etiquetas de apertura de todos los enlaces del pie. */
const enlaces = (html: string) => html.match(/<a\b[^>]*>/g) ?? [];

describe('Footer: redes sociales', () => {
  it('sin URLs de Instagram ni Facebook no muestra "Redes sociales próximamente."', () => {
    sinRedes();
    expect(renderToStaticMarkup(createElement(Footer))).not.toContain('próximamente');
  });

  it('con la URL de Instagram muestra su enlace', () => {
    sinRedes();
    vi.stubEnv('NEXT_PUBLIC_INSTAGRAM_URL', 'https://instagram.com/mirufranco');
    expect(renderToStaticMarkup(createElement(Footer))).toContain('aria-label="Instagram"');
  });
});

describe('Footer: área táctil de 44 px en los enlaces', () => {
  it('los enlaces de texto tienen min-h-11', () => {
    sinRedes();
    const lista = enlaces(renderToStaticMarkup(createElement(Footer)));
    expect(lista.length).toBeGreaterThan(5);
    for (const a of lista) expect(a).toContain('min-h-11');
  });

  it('los íconos de redes miden 44 px (p-3 alrededor del ícono de 20 px)', () => {
    vi.stubEnv('NEXT_PUBLIC_INSTAGRAM_URL', 'https://instagram.com/mirufranco');
    vi.stubEnv('NEXT_PUBLIC_FACEBOOK_URL', 'https://facebook.com/mirufranco');
    const html = renderToStaticMarkup(createElement(Footer));
    for (const red of ['Instagram', 'Facebook']) {
      const a = html.match(new RegExp(`<a\\b[^>]*aria-label="${red}"[^>]*>`))![0];
      expect(a).toContain('p-3');
    }
  });
});
