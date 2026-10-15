import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Inbox } from 'lucide-react';
import Table, { PaginacionTabla, TablaVacia, TableCell, TableRow, estadoDesborde } from './Table';

/**
 * H5/H6: a 1440 px y en móvil las tablas recortaban columnas sin ninguna señal. El marco avisa con
 * una sombra en el borde hacia donde queda contenido y puede fijar la primera columna.
 */
describe('estadoDesborde: hacia dónde queda contenido oculto', () => {
  it('sin desborde no hay señal', () => {
    expect(estadoDesborde(0, 600, 600)).toEqual({ izquierda: false, derecha: false });
  });

  it('al inicio solo queda contenido a la derecha', () => {
    expect(estadoDesborde(0, 1200, 600)).toEqual({ izquierda: false, derecha: true });
  });

  it('a la mitad queda a los dos lados y al final solo a la izquierda (con 1 px de tolerancia)', () => {
    expect(estadoDesborde(300, 1200, 600)).toEqual({ izquierda: true, derecha: true });
    expect(estadoDesborde(599.5, 1200, 600)).toEqual({ izquierda: true, derecha: false });
  });
});

const celda = (texto: string) => createElement(TableCell, { className: '' } as ComponentProps<typeof TableCell>, texto);
const fila = createElement(TableRow, {} as ComponentProps<typeof TableRow>, celda('Ana'), celda('55 1234'));
const tabla = (props: Partial<ComponentProps<typeof Table>>) => createElement(Table, props as ComponentProps<typeof Table>, fila);

describe('Table', () => {
  it('con stickyFirstColumn fija la primera columna de todas las filas (no solo el encabezado)', () => {
    const html = renderToStaticMarkup(tabla({ headers: ['Nombre', 'Teléfono'], stickyFirstColumn: true }));
    expect(html).toMatch(/<table class="[^"]*mf-tabla--primera-fija/);
    expect(html).toContain('data-primera-fija="true"');
  });

  it('el marco va dentro de una envoltura que pinta la señal de desplazamiento', () => {
    const html = renderToStaticMarkup(tabla({ headers: ['Nombre'] }));
    expect(html).toMatch(/<div class="mf-tabla-envoltura"[^>]*><div class="mf-tabla-marco"/);
  });
});

describe('PaginacionTabla (H4: listas de cientos de filas)', () => {
  const html = (pagina: number, totalPaginas: number) =>
    renderToStaticMarkup(createElement(PaginacionTabla, { pagina, totalPaginas, total: 1016, unidad: 'clientes', onCambiar: () => {} }));

  it('dice en qué página va y cuántos registros hay', () => {
    expect(html(2, 21)).toContain('Página 2 de 21 · 1,016 clientes');
  });

  it('desactiva Anterior en la primera página y Siguiente en la última', () => {
    const primera = html(1, 21);
    expect(primera).toMatch(/<button[^>]*disabled=""[^>]*>.*Anterior/);
    expect(primera).not.toMatch(/<button[^>]*disabled=""[^>]*>Siguiente/);
    const ultima = html(21, 21);
    expect(ultima).toMatch(/<button[^>]*disabled=""[^>]*>Siguiente/);
  });

  it('Anterior y Siguiente miden 44 px (min-h-11), no 36', () => {
    const botones = html(2, 21).match(/<button[^>]*>/g) ?? [];
    expect(botones).toHaveLength(2);
    for (const b of botones) {
      expect(b).toContain('min-h-11');
      expect(b).not.toContain('min-h-9');
    }
  });

  it('con una sola página no se muestra', () => {
    expect(html(1, 1)).toBe('');
  });
});

describe('TablaVacia (B17: estado vacío con ícono y acción)', () => {
  it('pinta el ícono, el título, la ayuda y la acción', () => {
    const html = renderToStaticMarkup(
      createElement(TablaVacia, {
        icono: Inbox,
        titulo: 'Todavía no hay casos',
        descripcion: 'Registra el primero abajo.',
        accion: createElement('a', { href: '#nuevo' }, 'Registrar caso'),
      }),
    );
    expect(html).toContain('<svg');
    expect(html).toContain('Todavía no hay casos');
    expect(html).toContain('Registra el primero abajo.');
    expect(html).toContain('Registrar caso');
  });
});

describe('Table ocupada', () => {
  it('con ocupada pone aria-busy="true" en la tabla; sin ella no lo pone', () => {
    const pintar = (ocupada?: boolean) =>
      renderToStaticMarkup(createElement(Table, { headers: ['A'], ocupada, children: null } as ComponentProps<typeof Table>));
    expect(pintar(true)).toMatch(/<table[^>]*aria-busy="true"/);
    expect(pintar(false)).not.toContain('aria-busy');
  });
});
