import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// next/image necesita la configuración de Next: aquí basta un <img> con el mismo src.
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) => createElement('img', { src: props.src, alt: props.alt }),
}));

const { ProductoImagenCarruselTarjeta, fotosQueCargan } = await import('./ProductoImagenCarruselTarjeta');
const { ProductoGaleriaDetalle } = await import('./ProductoGaleriaDetalle');

const cdn = (archivo: string) => `https://res.cloudinary.com/salon/image/upload/v1/${archivo}`;
const IA = cdn('ChatGPT_Image_2025_shampoo.png');
const ILUSTRATIVA = cdn('galeria/ilustrativas/p8w2.jpg');
const FOTO = cdn('shampoo-goji-frente.jpg');
const INSIGNIA = 'Imagen ilustrativa';

const tarjeta = (urls: string[]) => renderToStaticMarkup(createElement(ProductoImagenCarruselTarjeta, { urls, alt: 'Shampoo' }));
const detalle = (urls: string[]) => renderToStaticMarkup(createElement(ProductoGaleriaDetalle, { urls, nombreProducto: 'Shampoo' }));

/** La misma insignia que en servicios: una foto de producto generada con IA o ilustrativa lo dice. */
describe('Fotos de producto ilustrativas', () => {
  it.each([IA, ILUSTRATIVA])('la tarjeta de la tienda pone "Imagen ilustrativa" sobre %s', (src) => {
    const html = tarjeta([src]);
    expect(html).toContain(INSIGNIA);
    expect(html).toContain('mf-badge');
  });

  it('la tarjeta con una foto real no lleva la insignia', () => {
    expect(tarjeta([FOTO])).not.toContain(INSIGNIA);
    // Solo cuenta la foto que se ve (la primera); la segunda aparece al pasar el puntero.
    expect(tarjeta([FOTO, IA])).not.toContain(INSIGNIA);
  });

  it.each([IA, ILUSTRATIVA])('el detalle del producto pone "Imagen ilustrativa" sobre %s', (src) => {
    expect(detalle([src])).toContain(INSIGNIA);
  });

  it('el detalle con una foto real no lleva la insignia', () => {
    expect(detalle([FOTO])).not.toContain(INSIGNIA);
    expect(detalle([FOTO, IA])).not.toContain(INSIGNIA);
  });
});

describe('Tarjeta de producto: una foto que no carga no deja la imagen rota', () => {
  it('las fotos que fallaron se quitan; sin ninguna, sale el placeholder de marca', () => {
    expect(fotosQueCargan([FOTO, IA], new Set([FOTO]))).toEqual([IA]);
    expect(fotosQueCargan([FOTO, '', IA], new Set())).toEqual([FOTO, IA]);
    expect(fotosQueCargan([FOTO], new Set([FOTO]))).toEqual([]);
    expect(tarjeta([])).toContain('imagen no disponible');
  });

  it('cada foto marca su falla con onError (como ServicioImagen)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const fuente = readFileSync(join(__dirname, 'ProductoImagenCarruselTarjeta.tsx'), 'utf8');
    expect(fuente).toMatch(/onError=\{\(\) => marcarFallida\(src\)\}/);
    expect(fuente).toMatch(/const safe = fotosQueCargan\(urls, fallidas\);/);
  });
});

describe('Galería del detalle: flechas de 44 px', () => {
  it('"Imagen anterior" e "Imagen siguiente" miden 44 px también en móvil', () => {
    const html = detalle([FOTO, cdn('shampoo-goji-reverso.jpg')]);
    for (const etiqueta of ['Imagen anterior', 'Imagen siguiente']) {
      const boton = html.match(new RegExp(`<button[^>]*aria-label="${etiqueta}"[^>]*>`))?.[0] ?? html.match(new RegExp(`<button[^>]*class="([^"]*)"[^>]*aria-label="${etiqueta}"`))?.[0];
      expect(boton, etiqueta).toBeDefined();
      expect(boton, etiqueta).toMatch(/\bh-11\b/);
      expect(boton, etiqueta).toMatch(/\bw-11\b/);
      expect(boton, etiqueta).not.toMatch(/\bh-10\b|\bw-10\b/);
    }
  });
});
