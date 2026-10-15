import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Bar, BarChart } from 'recharts';
import { describe, expect, it, vi } from 'vitest';
import {
  ContenedorGrafica,
  EtiquetaPorcentajeDona,
  TAMANO_PAGINA_SEGMENTACION,
  etiquetaGrupo,
  paginarLista,
} from './PanelSegmentacionClientes';

/** Sin DOM en vitest: se revisa el código del panel (lo usan admin y operación). */
const panel = readFileSync(join(__dirname, 'PanelSegmentacionClientes.tsx'), 'utf8');

describe('Segmentación de clientes: filtros con nombre accesible', () => {
  it('el buscador y el filtro de segmento llevan aria-label', () => {
    expect(panel).toContain('aria-label="Buscar cliente por nombre o correo"');
    expect(panel).toContain('aria-label="Filtrar por segmento"');
  });
});

describe('H2 tabla de clientes: paginada y con la ficha en la primera columna', () => {
  const clientes = Array.from({ length: 1016 }, (_, i) => i + 1);

  it('25 por página, como las demás tablas largas', () => {
    expect(TAMANO_PAGINA_SEGMENTACION).toBe(25);
    const primera = paginarLista(clientes, 1, TAMANO_PAGINA_SEGMENTACION);
    expect(primera.items).toEqual(clientes.slice(0, 25));
    expect(primera).toMatchObject({ pagina: 1, totalPaginas: 41 });
    expect(paginarLista(clientes, 41, 25).items).toEqual([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016]);
  });

  it('una página fuera de rango (p. ej. tras filtrar) se ajusta a la última', () => {
    expect(paginarLista([1, 2, 3], 5, 25)).toEqual({ items: [1, 2, 3], pagina: 1, totalPaginas: 1 });
    expect(paginarLista([], 3, 25)).toEqual({ items: [], pagina: 1, totalPaginas: 1 });
  });

  it('pinta la página, no la lista filtrada completa, con el pie de paginación', () => {
    expect(panel).toMatch(/\{pagina\.items\.map\(\(cliente\) =>/);
    expect(panel).not.toMatch(/\{filtrados\.map\(/);
    expect(panel).toContain('<PaginacionTabla');
  });

  it('el nombre de la clienta es el enlace a su ficha y ya no hay columna "Perfil" al final', () => {
    expect(panel).not.toMatch(/'Perfil',?\s*\]/);
    expect(panel).toMatch(/<Link\s+href=\{`\$\{rutaBasePerfil\}\/\$\{cliente\.clienteId\}`\}/);
  });
});

describe('H7 gráficas legibles', () => {
  it('ejes con "Grupo 1…4" (los de las tarjetas) en vez de nombres cortados a 14 caracteres', () => {
    expect(etiquetaGrupo('Sin compras registradas')).toBe('Grupo 1');
    expect(etiquetaGrupo('Frecuentes de alto valor')).toBe('Grupo 4');
    expect(panel).not.toMatch(/slice\(0, 14\)/);
    // Las 4 etiquetas siempre (a 375 px Recharts saltaba la mitad).
    expect(panel.match(/interval=\{0\}/g)?.length).toBe(2);
    expect(panel.match(/tickFormatter=\{etiquetaGrupo\}/g)?.length).toBe(2);
  });

  it('el porcentaje de la dona va en el color de texto, no en el del sector (1.5:1 en claro)', () => {
    const html = renderToStaticMarkup(
      createElement('svg', null, createElement(EtiquetaPorcentajeDona, { x: 10, y: 20, textAnchor: 'start', pct: 72.6 })),
    );
    expect(html).toContain('fill="var(--menu-texto-principal)"');
    expect(html).toContain('73%');
    expect(panel).toContain('label={EtiquetaPorcentajeDona}');
  });
});

describe('H20 sin el aviso "width(-1) and height(-1)" de Recharts', () => {
  it('el contenedor de las gráficas tiene alto explícito y no avisa al montar', () => {
    const avisos: string[] = [];
    const espia = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => { avisos.push(args.map(String).join(' ')); });
    try {
      const html = renderToStaticMarkup(
        createElement(ContenedorGrafica, { alto: 260 }, createElement(BarChart, { data: [{ v: 1 }] }, createElement(Bar, { dataKey: 'v' }))),
      );
      expect(html).toContain('height:260px');
    } finally {
      espia.mockRestore();
    }
    expect(avisos.filter((a) => a.includes('should be greater than 0'))).toEqual([]);
  });

  it('las 4 gráficas usan ese contenedor', () => {
    expect(panel.match(/<ContenedorGrafica alto=\{\d+\}>/g)?.length).toBe(4);
    expect(panel.match(/<ResponsiveContainer\b/g)?.length).toBe(1);
  });
});
