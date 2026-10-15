import { createElement, type ComponentProps, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Button from './Button';

const boton = (props: Partial<ComponentProps<typeof Button>>, ...hijos: ReactNode[]) =>
  createElement(Button, props as ComponentProps<typeof Button>, ...hijos);

const estilo = (variant: 'primary' | 'outline-danger') =>
  renderToStaticMarkup(boton({ variant }, 'Eliminar')).match(/style="([^"]*)"/)?.[1] ?? '';

/**
 * H4 (global): el botón no era inline-flex y los íconos de lucide (display: block) quedaban encima
 * del texto ("Mis pedidos", "Revocar compra", "Agregar Observación", "Exportar CSV"…).
 */
describe('Button: ícono y texto en una línea', () => {
  const clases = (html: string) => html.match(/class="([^"]*)"/)?.[1].split(/\s+/) ?? [];

  it('la base es inline-flex centrada con separación', () => {
    const html = renderToStaticMarkup(boton({}, 'Exportar CSV'));
    expect(clases(html)).toEqual(expect.arrayContaining(['inline-flex', 'items-center', 'justify-center', 'gap-2']));
  });

  it('con ancho completo sigue ocupando todo el ancho', () => {
    const html = renderToStaticMarkup(boton({ fullWidth: true }, 'Guardar'));
    expect(clases(html)).toEqual(expect.arrayContaining(['inline-flex', 'w-full']));
  });

  it('con asChild el enlace recibe las mismas clases (y conserva las suyas)', () => {
    const html = renderToStaticMarkup(
      boton({ asChild: true }, createElement('a', { href: '/x', className: 'propia' }, 'Mis pedidos')),
    );
    expect(html.startsWith('<a')).toBe(true);
    expect(clases(html)).toEqual(expect.arrayContaining(['inline-flex', 'items-center', 'gap-2', 'propia']));
  });
});

/**
 * B5: "Eliminar", "Desactivar" o "Cancelar pedido" en una fila o junto a "Guardar" eran idénticos al
 * botón principal (relleno vino). La variante de contorno con texto de peligro los separa.
 */
describe('Button variant="outline-danger"', () => {
  it('es de contorno: fondo transparente, texto y borde de peligro', () => {
    const s = estilo('outline-danger');
    expect(s).toContain('--btn-bg:transparent');
    expect(s).toContain('--btn-texto:var(--danger-texto)');
    expect(s).toContain('--btn-borde:1.5px solid var(--danger-texto)');
  });

  it('no comparte el relleno del botón principal', () => {
    expect(estilo('primary')).toContain('--btn-bg:var(--botones-principales)');
    expect(estilo('outline-danger')).not.toContain('--btn-bg:var(--botones-principales)');
    expect(estilo('outline-danger')).not.toContain('--btn-bg:var(--danger)');
  });
});
