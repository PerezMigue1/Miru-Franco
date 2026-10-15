// Corrección visual de las páginas públicas (revisión a 375 y 1440 px): áreas táctiles de 44 px en la
// navegación, los chips del hero y el contacto; la cifra de "Sobre nosotros" integrada en su sección y
// migas de pan cuyo separador no abre la segunda línea. Sin DOM: renderToStaticMarkup y lectura del CSS.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Servicio, ServiciosResult } from '../services/servicios';

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: () => undefined, back: () => undefined }),
}));
vi.mock('./Header', () => ({ default: () => null }));
vi.mock('./Footer', () => ({ default: () => null }));
const getServicios = vi.fn<() => Promise<ServiciosResult>>();
vi.mock('../services/servicios', () => ({ getServicios: () => getServicios() }));

const { default: MenuHorizontal } = await import('./MenuHorizontal');
const { default: ContactoPage } = await import('../contacto/page');
const { default: SobreNosotrosPage } = await import('../sobre-nosotros/page');
const { default: Breadcrumb } = await import('../components/ui/Breadcrumb');

const clases = (html: string) => (html.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/);

afterEach(() => {
  delete process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  delete process.env.NEXT_PUBLIC_FACEBOOK_URL;
});

describe('B1 navegación principal: píldoras de 44 px en móvil', () => {
  it('cada píldora (Inicio, Tienda, Citas) mide al menos 44 px de alto', () => {
    const html = renderToStaticMarkup(createElement(MenuHorizontal));
    const pildoras = [...html.matchAll(/<a\b[^>]*class="([^"]*\bmf-nav-pildora\b[^"]*)"/g)].map((m) => m[1].split(/\s+/));
    expect(pildoras).toHaveLength(3);
    for (const c of pildoras) expect(c).toContain('min-h-11');
  });

  it('los enlaces de marcas (ocultos hoy) también llevan min-h-11 si se vuelven a mostrar', () => {
    const fuente = readFileSync(join(__dirname, 'MenuHorizontal.tsx'), 'utf8');
    const pildoras = [...fuente.matchAll(/className="(mf-nav-pildora[^"]*)"/g)].map((m) => m[1].split(/\s+/));
    expect(pildoras.length).toBeGreaterThanOrEqual(2);
    for (const c of pildoras) expect(c).toContain('min-h-11');
  });
});

describe('B2 chips de los fluidos del hero: 44 px', () => {
  it('ninguna regla de .mf-fluidos__chip deja la altura mínima por debajo de 44 px', () => {
    const css = readFileSync(join(__dirname, '..', 'styles', 'cliente.css'), 'utf8');
    const reglas = [...css.matchAll(/\.mf-fluidos__chip\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(reglas.length).toBeGreaterThan(0);
    const alturas = reglas.flatMap((r) => [...r.matchAll(/min-height:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])));
    expect(alturas).toContain(44);
    for (const a of alturas) expect(a).toBeGreaterThanOrEqual(44);
  });
});

describe('B3 contacto: teléfono y correo con área táctil de 44 px', () => {
  const pintar = async () => renderToStaticMarkup((await ContactoPage()) as ReactElement);
  const enlace = (html: string, href: RegExp) => {
    const m = html.match(new RegExp(`<a\\b[^>]*href="${href.source}"[^>]*>`));
    if (!m) throw new Error(`No hay enlace a ${href.source}`);
    return clases(m[0]);
  };

  it('el teléfono es inline-flex de 44 px con el texto centrado', async () => {
    expect(enlace(await pintar(), /tel:[^"]+/)).toEqual(expect.arrayContaining(['inline-flex', 'min-h-11', 'items-center']));
  });

  it('el correo es inline-flex de 44 px con el texto centrado', async () => {
    expect(enlace(await pintar(), /mailto:[^"]+/)).toEqual(expect.arrayContaining(['inline-flex', 'min-h-11', 'items-center']));
  });

  it('Instagram y Facebook, cuando se configuran, también miden 44 px', async () => {
    process.env.NEXT_PUBLIC_INSTAGRAM_URL = 'https://www.instagram.com/salon';
    process.env.NEXT_PUBLIC_FACEBOOK_URL = 'https://www.facebook.com/salon';
    const html = await pintar();
    expect(enlace(html, /https:\/\/www\.instagram\.com\/salon/)).toContain('min-h-11');
    expect(enlace(html, /https:\/\/www\.facebook\.com\/salon/)).toContain('min-h-11');
  });
});

describe('B13 "Sobre nosotros": la cifra de servicios no ocupa una banda propia', () => {
  const servicios: Servicio[] = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id, nombre: `S${id}`, activo: true }));
  const secciones = (html: string) => html.split('<section').slice(1);

  it('la cifra vive en la sección de la historia, junto a "Pasión por la belleza natural"', async () => {
    getServicios.mockResolvedValueOnce({ data: servicios, error: null });
    const html = renderToStaticMarkup((await SobreNosotrosPage()) as ReactElement);
    const conCifra = secciones(html).filter((s) => s.includes('Servicios disponibles'));
    expect(conCifra).toHaveLength(1);
    expect(conCifra[0]).toContain('Pasión por la belleza natural');
  });

  it('con o sin cifra, la página tiene las mismas tres secciones: hero, historia y valores', async () => {
    getServicios.mockResolvedValueOnce({ data: servicios, error: null });
    const conCifra = renderToStaticMarkup((await SobreNosotrosPage()) as ReactElement);
    getServicios.mockResolvedValueOnce({ data: [], error: 'caído' });
    const sinCifra = renderToStaticMarkup((await SobreNosotrosPage()) as ReactElement);
    expect(secciones(conCifra)).toHaveLength(3);
    expect(secciones(sinCifra)).toHaveLength(3);
  });
});

describe('B17 migas de pan: el separador no abre la segunda línea', () => {
  const html = renderToStaticMarkup(
    createElement(Breadcrumb, {
      items: [
        { label: 'Inicio', href: '/home' },
        { label: 'Tienda', href: '/cliente/tienda-online' },
        { label: 'Fluido Di Goji de tratamiento intensivo' },
      ],
    }),
  );
  const items = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  const esChevron = /^<svg\b[^>]*lucide-chevron-right/;

  it('ningún ítem empieza con el chevrón', () => {
    expect(items).toHaveLength(3);
    for (const item of items) expect(item).not.toMatch(esChevron);
  });

  it('el chevrón cierra cada ítem salvo el último (queda al final de la línea, pegado a su miga)', () => {
    for (const item of items.slice(0, -1)) expect(item).toMatch(/<svg\b[^>]*lucide-chevron-right[^>]*>[\s\S]*<\/svg>$/);
    expect(items.at(-1)).not.toContain('lucide-chevron-right');
  });

  it('la página actual sigue marcada con aria-current', () => {
    expect(items.at(-1)).toContain('aria-current="page"');
  });
});
