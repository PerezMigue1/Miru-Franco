import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHART_COLORS_MARCA } from '../utils/chartColors';

const globals = readFileSync(join(__dirname, 'globals.css'), 'utf8');

/** Contenido del primer bloque `selector { … }` de globals.css. */
function bloque(selector: string): string {
  const inicio = globals.search(new RegExp(`^${selector.replace('.', '\\.')}\\s*\\{`, 'm'));
  if (inicio < 0) throw new Error(`Sin bloque ${selector}`);
  const abre = globals.indexOf('{', inicio);
  return globals.slice(abre + 1, globals.indexOf('\n}', abre));
}

const valor = (css: string, prop: string) => css.match(new RegExp(`${prop}\\s*:\\s*([^;]+);`))?.[1].trim();

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/**
 * H7: en oscuro la serie principal de las gráficas del inicio (var(--danger), #710014) quedaba en
 * 1.15:1 sobre las tarjetas #2a2a2a; WCAG 1.4.11 pide 3:1 para las marcas de una gráfica.
 */
describe('Serie principal de las gráficas', () => {
  it('las gráficas la toman de su propio token, no de --danger', () => {
    expect(CHART_COLORS_MARCA[0]).toBe('var(--grafica-principal)');
  });

  it('en claro sigue siendo el vino de la marca', () => {
    expect(valor(bloque(':root'), '--grafica-principal')).toBe('var(--danger)');
  });

  it('en oscuro llega a 3:1 sobre la tarjeta (#2a2a2a) y sobre el fondo (#161616)', () => {
    const oscuro = valor(bloque('.dark'), '--grafica-principal') ?? '';
    expect(oscuro).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contraste(oscuro, '#2a2a2a')).toBeGreaterThanOrEqual(3);
    expect(contraste(oscuro, '#161616')).toBeGreaterThanOrEqual(3);
  });
});

/** B12: en oscuro los íconos nativos de fecha, hora y mes casi no se veían. */
describe('color-scheme según el tema', () => {
  it(':root declara light y .dark declara dark', () => {
    expect(valor(bloque(':root'), 'color-scheme')).toBe('light');
    expect(valor(bloque('.dark'), 'color-scheme')).toBe('dark');
  });
});

/** Valor de un token en oscuro: el de `.dark` si lo redefine, si no el de `:root`; sigue los var(--x). */
function resolverOscuro(token: string, profundidad = 0): string | undefined {
  const crudo = valor(bloque('.dark'), token) ?? valor(bloque(':root'), token);
  const ref = crudo?.match(/^var\((--[\w-]+)\)$/)?.[1];
  return ref && profundidad < 5 ? resolverOscuro(ref, profundidad + 1) : crudo;
}

describe('Todas las series de las gráficas de marca en oscuro', () => {
  it.each(CHART_COLORS_MARCA.map((c, i) => [i + 1, c] as const))('la serie %i (%s) llega a 3:1 sobre la tarjeta oscura', (_n, color) => {
    const token = color.match(/^var\((--[\w-]+)\)$/)?.[1] ?? '';
    const hex = resolverOscuro(token) ?? '';
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contraste(hex, '#2a2a2a')).toBeGreaterThanOrEqual(3);
  });
});

/** Valor de un token en claro (`:root`), siguiendo los var(--x). */
function resolverClaro(token: string, profundidad = 0): string | undefined {
  const crudo = valor(bloque(':root'), token);
  const ref = crudo?.match(/^var\((--[\w-]+)\)$/)?.[1];
  return ref && profundidad < 5 ? resolverClaro(ref, profundidad + 1) : crudo;
}

/**
 * Revisión visual final (H9): en claro las gráficas van sobre la tarjeta terracota (--tarjetas-paneles) y las
 * series ámbar, verde, oro y --hover quedaban entre 1.1 y 1.8:1. WCAG 1.4.11 pide 3:1.
 */
describe('Series de las gráficas en claro sobre la tarjeta terracota', () => {
  const tarjeta = resolverClaro('--tarjetas-paneles') ?? '';

  it('la tarjeta es un color concreto', () => {
    expect(tarjeta).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(CHART_COLORS_MARCA.map((c, i) => [i + 1, c] as const))('la serie de marca %i (%s) llega a 3:1', (_n, color) => {
    const hex = resolverClaro(color.match(/^var\((--[\w-]+)\)$/)?.[1] ?? '') ?? '';
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contraste(hex, tarjeta)).toBeGreaterThanOrEqual(3);
  });

  const segmentacion = readFileSync(join(__dirname, '..', 'components', 'clientes', 'PanelSegmentacionClientes.tsx'), 'utf8');
  const mapa = segmentacion.slice(segmentacion.indexOf('const COLOR_SEGMENTO'), segmentacion.indexOf('};', segmentacion.indexOf('const COLOR_SEGMENTO')));
  const tokensSegmento = [...mapa.matchAll(/'var\((--[\w-]+)\)'/g)].map((m) => m[1]);

  it('la segmentación tiene sus 4 colores', () => {
    expect(tokensSegmento).toHaveLength(4);
  });

  it.each(tokensSegmento.map((t) => [t]))('el color de segmentación %s llega a 3:1 en claro y en oscuro', (token) => {
    const claro = resolverClaro(token) ?? '';
    expect(claro).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contraste(claro, tarjeta)).toBeGreaterThanOrEqual(3);
    const oscuro = resolverOscuro(token) ?? '';
    expect(oscuro).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contraste(oscuro, '#2a2a2a')).toBeGreaterThanOrEqual(3);
  });
});
