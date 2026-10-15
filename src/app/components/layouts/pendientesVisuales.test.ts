import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: unknown }) => createElement('a', { href, ...resto }, children as never),
}));

const { default: Breadcrumb } = await import('../ui/Breadcrumb');

/**
 * Pendientes de la revisión visual (375 y 1440 px, claro y oscuro): marca completa en el encabezado del panel, una
 * sola campana, contraste de la tarjeta café de al menos 4.5:1 (con margen), migas que no se parten en móvil, iconos
 * únicos en el menú, chips del inicio con la misma altura y el diálogo de documentos con los tokens de texto.
 */
const APP = join(__dirname, '..', '..');
const leer = (ruta: string) => readFileSync(join(APP, ruta), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

const luminancia = (hex: string) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** Valores hex de los tokens en :root (claro) y en el bloque del tema oscuro de globals.css. */
function tokens() {
  const css = leer('styles/globals.css');
  const raiz = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  const marcaOscuro = css.indexOf('--tarjetas-paneles: #2a2a2a;');
  const oscuro = css.slice(css.lastIndexOf('{', marcaOscuro), css.indexOf('}', marcaOscuro));
  const valor = (bloque: string, nombre: string) => (bloque.match(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`)) ?? [])[1];
  return { claro: (n: string) => valor(raiz, n), oscuro: (n: string) => valor(oscuro, n) ?? valor(raiz, n) };
}

describe('Contraste de la tarjeta café (texto, mínimo 4.5:1)', () => {
  const t = tokens();

  it.each(['encabezados-alterno', 'menu-texto-principal', 'oro-texto', 'danger-texto', 'texto-enlace-sobre-calido', 'success-texto'])(
    'claro: --%s sobre --tarjetas-paneles pasa de 5.5:1 (margen para la letra chica)',
    (nombre) => {
      const texto = t.claro(nombre);
      expect(texto, nombre).toBeDefined();
      expect(contraste(texto!, t.claro('tarjetas-paneles')!)).toBeGreaterThanOrEqual(5.5);
    },
  );

  it('oscuro: el café de texto (--encabezados-alterno) sobre la tarjeta pasa de 5.5:1', () => {
    expect(t.oscuro('tarjetas-paneles')).toBe('#2a2a2a');
    expect(contraste(t.oscuro('encabezados-alterno')!, '#2a2a2a')).toBeGreaterThanOrEqual(5.5);
  });

  it('el estado vacío de Reembolsos pendientes ya no usa el dorado ilegible sobre la tarjeta', () => {
    expect(leer('(screens)/admin/reembolsos-pendientes/page.tsx')).not.toMatch(/HandCoins[^>]*logo-branding/);
  });
});

describe('Encabezado del panel', () => {
  const panel = leer('components/layouts/PanelShell.tsx');
  it('la marca nunca sale cortada: completa desde 360 px y, más angosto, solo el monograma (con nombre accesible)', () => {
    const marca = panel.match(/<span\s+className="([^"]*)"[^>]*>\s*Mirú Franco\s*<\/span>/)?.[1] ?? '';
    expect(marca).toContain('whitespace-nowrap');
    expect(marca).toContain('max-[359px]:sr-only');
    expect(marca).not.toContain('truncate');
  });
  it('una sola campana (activar los avisos del navegador vive dentro de su menú)', () => {
    expect(panel.match(/<CampanaPanel\b/g) ?? []).toHaveLength(1);
    expect(panel).not.toMatch(/<AvisosNavegador\b/);
  });
});

describe('Migas en móvil', () => {
  const items = [
    { label: 'Inicio', href: '/home' },
    { label: 'Panel de administración', href: '/admin' },
    { label: 'Configuración del sitio' },
  ];
  it('con tres niveles: en móvil solo el regreso al nivel anterior; el rastro completo desde sm', () => {
    const html = renderToStaticMarkup(createElement(Breadcrumb, { items }));
    expect(html).toMatch(/<a href="\/admin" class="[^"]*sm:hidden[^"]*"[^>]*>.*Panel de administración<\/a>/);
    expect(html).toMatch(/<ol class="hidden sm:flex/);
  });
  it('con dos niveles no hace falta: el rastro se ve siempre', () => {
    const html = renderToStaticMarkup(createElement(Breadcrumb, { items: items.slice(1) }));
    expect(html).not.toContain('sm:hidden');
    expect(html).toMatch(/<ol class="flex /);
  });
});

describe('Menús del panel con iconos únicos', () => {
  it.each(['components/layouts/AdminLayout.tsx', 'components/layouts/OperacionLayout.tsx'])('%s: ningún icono se repite', (ruta) => {
    const iconos = [...leer(ruta).matchAll(/label: '[^']+', href: '[^']+', icon: (\w+)/g)].map((m) => m[1]);
    expect(iconos.length).toBeGreaterThan(5);
    const repetidos = iconos.filter((x, i) => iconos.indexOf(x) !== i);
    expect(repetidos).toEqual([]);
  });
});

describe('Chips de los fluidos en el inicio', () => {
  it('en pantallas chicas todas las filas miden lo mismo y cada chip llena su celda', () => {
    const css = leer('styles/cliente.css');
    const bloque = css.slice(css.indexOf('@media (max-width: 479.98px) {\n  .mf-fluidos__leyenda'), css.indexOf('.mf-fluidos__chip-nombre {', css.indexOf('@media (max-width: 479.98px) {\n  .mf-fluidos__leyenda')));
    expect(bloque).toContain('grid-auto-rows: 1fr;');
    expect(bloque).toMatch(/\.mf-fluidos__leyenda > li \{\s*display: flex;/);
    expect(bloque).toMatch(/\.mf-fluidos__chip \{\s*flex: 1 1 auto;/);
  });
});

describe('Diálogo de documentos con los tokens existentes', () => {
  it('el texto de las casillas usa --texto-cuerpo; el vino queda solo para los enlaces', () => {
    const css = leer('styles/sistema.css');
    const etiqueta = css.slice(css.indexOf('.mf-consentimiento label {'), css.indexOf('}', css.indexOf('.mf-consentimiento label {')));
    expect(etiqueta).toContain('color: var(--texto-cuerpo);');
    const enlace = css.slice(css.indexOf('.mf-consentimiento a {'), css.indexOf('}', css.indexOf('.mf-consentimiento a {')));
    expect(enlace).toContain('color: var(--menu-texto-principal);');
  });
});
