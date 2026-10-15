import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('Footer: páginas legales y Profeco', () => {
  it('enlaza las cuatro páginas legales', () => {
    sinRedes();
    const html = renderToStaticMarkup(createElement(Footer));
    for (const ruta of ['/terminos-y-condiciones', '/aviso-de-privacidad', '/politica-de-cookies', '/politica-de-reembolsos']) {
      expect(html).toContain(`href="${ruta}"`);
    }
  });

  it('muestra el Teléfono del Consumidor de Profeco y su sitio', () => {
    sinRedes();
    const html = renderToStaticMarkup(createElement(Footer));
    expect(html).toContain('55 5568 8722');
    expect(html).toContain('800 468 8722');
    expect(html).toContain('href="https://www.gob.mx/profeco"');
  });
});

describe('Footer: servicios del catálogo real', () => {
  it('no tiene una lista de servicios escrita a mano: la carga del catálogo de servicios activos', () => {
    const fuente = readFileSync(join(__dirname, 'Footer.tsx'), 'utf8');
    expect(fuente).not.toContain("'Coloración Profesional'");
    expect(fuente).toContain('cargarNombresServiciosFooter');
  });

  it('sin catálogo cargado (primer pintado o API caída) no inventa servicios ni rompe', () => {
    sinRedes();
    const html = renderToStaticMarkup(createElement(Footer));
    expect(html).not.toContain('Nanoplastía');
    expect(html).toContain('Mirú');
  });
});

/** El párrafo de Profeco (texto corrido con sus tres enlaces). */
const parrafoProfeco = (html: string) => html.match(/<p[^>]*>Profeco, Teléfono del Consumidor:[\s\S]*?<\/p>/)?.[0] ?? '';

describe('Footer: área táctil de 44 px en los enlaces', () => {
  it('los enlaces de texto tienen min-h-11 (menos los que van dentro del párrafo de Profeco)', () => {
    sinRedes();
    const html = renderToStaticMarkup(createElement(Footer));
    const enProfeco = new Set(enlaces(parrafoProfeco(html)));
    const lista = enlaces(html).filter((a) => !enProfeco.has(a));
    expect(lista.length).toBeGreaterThan(5);
    for (const a of lista) expect(a).toContain('min-h-11');
  });

  it('los enlaces de Profeco dentro del párrafo son enlaces en línea con subrayado, sin min-h-11 ni inline-flex', () => {
    sinRedes();
    const lista = enlaces(parrafoProfeco(renderToStaticMarkup(createElement(Footer))));
    expect(lista).toHaveLength(3);
    for (const a of lista) {
      expect(a).toMatch(/\bunderline\b/);
      expect(a).not.toContain('min-h-11');
      expect(a).not.toContain('inline-flex');
    }
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

describe('Footer: contacto y horario desde Configuración del sitio', () => {
  it('no tiene datos de contacto escritos a mano: los carga de la configuración', () => {
    const fuente = readFileSync(join(__dirname, 'Footer.tsx'), 'utf8');
    expect(fuente).toContain('cargarConfiguracionPublicaCliente');
    expect(fuente).not.toContain('contacto@mirufranco.com');
    expect(fuente).not.toContain('HORARIO_SALON');
    expect(fuente).not.toContain('TELEFONO_SALON');
  });

  it('el primer pintado usa los valores de la configuración (por omisión, los mismos de los documentos legales)', () => {
    sinRedes();
    const html = renderToStaticMarkup(createElement(Footer));
    expect(html).toContain('Segunda Cerrada de Allende No. 15, Col. Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000');
    expect(html).toContain('href="mailto:contacto@mirufranco.com"');
    expect(html).toContain('href="tel:+527712681432"');
    expect(html).toContain('href="https://wa.me/527711867645"');
    expect(html).toContain('Lunes a viernes de 9:30 a 19:30 h.');
    expect(html).toContain('Domingos cerrado.');
    expect(html).toContain('Mirú Franco Salón Beauty. Todos los derechos reservados.');
  });
});
