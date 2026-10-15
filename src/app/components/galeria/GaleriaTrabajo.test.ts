// Galería de trabajo: rejilla uniforme con pocas fotos (el mosaico dejaba un hueco de ~640×250 px con
// tres fotos a 1440 px) y placeholder de marca cuando una foto no carga. Sin DOM: renderToStaticMarkup.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FotoGaleria } from '../../utils/galeria';

// Sin navegador no hay evento de error de la imagen: se fuerza el estado "falló" de cada foto
// (es el único useState de la galería que empieza en false mientras el visor está cerrado).
const forzar = vi.hoisted(() => ({ fotoFallida: false }));
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useState: (inicial: unknown) =>
      forzar.fotoFallida && inicial === false ? react.useState(true) : react.useState(inicial),
  };
});

const { default: GaleriaTrabajo, rejillaGaleria } = await import('./GaleriaTrabajo');

const fotos = (n: number): FotoGaleria[] =>
  Array.from({ length: n }, (_, i) => ({
    url: `https://res.cloudinary.com/demo/image/upload/foto-${i + 1}.jpg`,
    servicioId: i + 1,
    servicio: `Servicio ${i + 1}`,
  }));
const pintar = (n: number) =>
  renderToStaticMarkup(createElement(GaleriaTrabajo, { fotos: fotos(n), etiqueta: 'Fotos de prueba' }));

afterEach(() => {
  forzar.fotoFallida = false;
});

describe('H14 con menos de 7 fotos la rejilla es uniforme y sin huecos', () => {
  it('de 7 fotos en adelante se conserva el mosaico editorial', () => {
    expect(rejillaGaleria(7).modo).toBe('mosaico');
    expect(rejillaGaleria(20).modo).toBe('mosaico');
  });

  it.each([1, 2, 3, 4, 5, 6])('con %i foto(s) no hay celdas vacías en móvil ni en escritorio', (n) => {
    const r = rejillaGaleria(n);
    if (r.modo !== 'uniforme') throw new Error('con menos de 7 fotos la rejilla debe ser uniforme');
    const suma = (clave: 'movil' | 'escritorio') => r.celdas.reduce((t, c) => t + c[clave], 0);
    expect(r.celdas).toHaveLength(n);
    expect(suma('movil') % r.columnas.movil).toBe(0);
    expect(suma('escritorio') % r.columnas.escritorio).toBe(0);
  });

  it('con 3 fotos, en escritorio van en una fila de 3 columnas', () => {
    const r = rejillaGaleria(3);
    expect(r.modo === 'uniforme' && r.columnas.escritorio).toBe(3);
  });

  it('con 3 fotos el HTML no lleva celdas grandes, altas ni anchas ni el mosaico de 4 columnas', () => {
    const html = pintar(3);
    expect(html).not.toContain('data-forma');
    expect(html).not.toContain('mf-galeria-mosaico');
    const lista = html.match(/<ul class="([^"]*)"/)?.[1].split(/\s+/) ?? [];
    expect(lista).toEqual(expect.arrayContaining(['grid', 'grid-cols-2', 'md:grid-cols-3']));
  });

  it('con 7 fotos el HTML es el mosaico (una grande, una alta, una ancha)', () => {
    const html = pintar(7);
    expect(html).toContain('mf-galeria-mosaico');
    expect(html).toContain('data-forma="grande"');
    expect(html).toContain('data-forma="alta"');
    expect(html).toContain('data-forma="ancha"');
  });
});

describe('H5 una foto que no carga muestra el placeholder de marca', () => {
  it('con las fotos cargando bien se pintan las imágenes', () => {
    const html = pintar(2);
    expect(html).toContain('foto-1.jpg');
    expect(html).not.toContain('imagen no disponible');
  });

  it('si la foto falla, la celda muestra el monograma sobre carbón y sigue siendo un botón con nombre', () => {
    forzar.fotoFallida = true;
    const html = pintar(2);
    expect(html).not.toContain('foto-1.jpg');
    expect(html.match(/imagen no disponible/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Ver foto de Servicio 1 en grande"');
  });
});
