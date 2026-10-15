import { describe, expect, it } from 'vitest';
import { esImagenGenerada, fotosDeServicios, imagenServicioMostrable } from './galeria';
import type { Servicio } from '../services/servicios';

const base = (x: Partial<Servicio>): Servicio => ({ id: 1, nombre: 'Corte', ...x });
/** Fotos que sube el equipo: viven en Cloudinary. */
const cdn = (archivo: string) => `https://res.cloudinary.com/salon/image/upload/v1/${archivo}`;

describe('fotosDeServicios', () => {
  it('toma todas las fotos de servicios activos con su nombre y categoría', () => {
    const fotos = fotosDeServicios([
      base({ id: 1, nombre: 'Corte', categoria: 'Cortes', imagenes: [cdn('1.jpg'), cdn('2.jpg')] }),
      base({ id: 2, nombre: 'Color', imagen: cdn('3.jpg') }),
    ]);
    expect(fotos.map((f) => f.url)).toEqual([cdn('1.jpg'), cdn('2.jpg'), cdn('3.jpg')]);
    expect(fotos[0]).toMatchObject({ servicioId: 1, servicio: 'Corte', categoria: 'Cortes' });
  });

  it('omite servicios inactivos, URLs no absolutas y duplicados', () => {
    const fotos = fotosDeServicios([
      base({ id: 1, activo: false, imagenes: [cdn('1.jpg')] }),
      base({ id: 2, imagenes: ['/local.jpg', cdn('2.jpg')] }),
      base({ id: 3, imagenes: [cdn('2.jpg')] }),
    ]);
    expect(fotos.map((f) => f.url)).toEqual([cdn('2.jpg')]);
  });

  it('sin fotos devuelve una lista vacía (estado vacío, sin relleno)', () => {
    expect(fotosDeServicios([base({})])).toEqual([]);
  });

  it('solo publica fotos subidas por el equipo (Cloudinary): bancos de imágenes y relleno quedan fuera', () => {
    const fotos = fotosDeServicios([
      base({
        id: 1,
        imagenes: [
          'https://images.unsplash.com/photo-123?w=800',
          'https://logos-world.net/logo.png',
          'https://via.placeholder.com/300',
          'https://url.jpg/',
          cdn('real.jpg'),
        ],
      }),
    ]);
    expect(fotos.map((f) => f.url)).toEqual([cdn('real.jpg')]);
  });

  it('"Nuestro trabajo" no incluye imágenes generadas con IA: no son trabajos hechos en el salón', () => {
    const fotos = fotosDeServicios([
      base({ id: 1, imagen: cdn('ChatGPT_Image_6_jul_2026_02_22_50_p.m._dpppsn.png') }),
      base({ id: 2, imagen: cdn('14ff90c6-1634-4044-806b-5ef14e9e4fec.png') }),
    ]);
    expect(fotos.map((f) => f.servicioId)).toEqual([2]);
  });
});

describe('imagenServicioMostrable', () => {
  it('acepta Cloudinary y descarta otros hosts o valores que no son texto', () => {
    expect(imagenServicioMostrable(cdn('a.jpg'))).toBe(cdn('a.jpg'));
    expect(imagenServicioMostrable('https://images.unsplash.com/photo-1')).toBeNull();
    expect(imagenServicioMostrable('https://logos-world.net/x.png')).toBeNull();
    expect(imagenServicioMostrable(undefined)).toBeNull();
    expect(imagenServicioMostrable(42)).toBeNull();
  });
});

describe('esImagenGenerada', () => {
  it.each([
    cdn('ChatGPT_Image_6_jul_2026_02_23_03_p.m._ubwexg.png'),
    cdn('DALL·E 2026-01-01 10.00.00 - salon.png'),
    cdn('DALL-E_corte.webp'),
    cdn('Gemini_Generated_Image_abc123.png'),
    cdn('midjourney_peinado.jpg'),
  ])('reconoce el nombre de archivo de un generador de IA: %s', (url) => {
    expect(esImagenGenerada(url)).toBe(true);
  });

  it.each([
    cdn('IMG_20260401_151129_vjycxz.jpg'),
    cdn('14ff90c6-1634-4044-806b-5ef14e9e4fec.png'),
    cdn('detalle-corte.jpg'),
    'https://res.cloudinary.com/chatgpt_image/image/upload/v1/foto.jpg',
  ])('una foto normal no se marca: %s', (url) => {
    expect(esImagenGenerada(url)).toBe(false);
  });

  it('una imagen marcada como ilustrativa al subirla (carpeta /ilustrativas/) cuenta como generada, aunque su nombre sea aleatorio', () => {
    expect(esImagenGenerada(cdn('galeria/ilustrativas/k3j9xq2vwl8z.jpg'))).toBe(true);
    expect(esImagenGenerada(`${cdn('galeria/ilustrativas/k3j9xq2vwl8z.jpg')}?w=800`)).toBe(true);
    // La foto real del equipo vive en galeria/ y sigue sin marcarse.
    expect(esImagenGenerada(cdn('galeria/k3j9xq2vwl8z.jpg'))).toBe(false);
  });

  it('la galería y la vista previa nunca usan una imagen ilustrativa', () => {
    const fotos = fotosDeServicios([
      base({ imagenes: [cdn('galeria/ilustrativas/a1.jpg'), cdn('galeria/b2.jpg')] }),
    ]);
    expect(fotos.map((f) => f.url)).toEqual([cdn('galeria/b2.jpg')]);
  });
});
