import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Servicio } from '../../services/servicios';

// next/image necesita la configuración de Next: aquí basta un <img> con el mismo src.
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) => createElement('img', { src: props.src, alt: props.alt }),
}));

const { default: ServicioImagen } = await import('./ServicioImagen');
const { default: TarjetaServicio } = await import('./TarjetaServicio');

const RAIZ = join(__dirname, '..', '..', '..', '..');
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8');

const cdn = (archivo: string) => `https://res.cloudinary.com/salon/image/upload/v1/${archivo}`;
const IA = cdn('ChatGPT_Image_6_jul_2026_02_23_19_p.m._tqagms.png');
const FOTO = cdn('23886a47-c0fb-474f-8776-66ae246eb31c.png');
const PLACEHOLDER = 'imagen no disponible';

const pintarImagen = (src: string, marcarIlustrativa = false) =>
  renderToStaticMarkup(createElement(ServicioImagen, { src, alt: 'Corte', sizes: '100vw', marcarIlustrativa }));

describe('ServicioImagen: solo imágenes del salón', () => {
  it('muestra la foto subida por el equipo (Cloudinary)', () => {
    const html = pintarImagen(FOTO);
    expect(html).toContain(`src="${FOTO}"`);
    expect(html).not.toContain(PLACEHOLDER);
  });

  it.each(['https://images.unsplash.com/photo-1?w=800', 'https://logos-world.net/x.png', 'https://via.placeholder.com/300'])(
    'una URL de banco o de relleno (%s) cae al monograma',
    (src) => {
      const html = pintarImagen(src);
      expect(html).toContain(PLACEHOLDER);
      expect(html).not.toContain(`src="${src}"`);
    },
  );

  it('una imagen generada con IA lleva "Imagen ilustrativa" cuando se pide marcarla', () => {
    expect(pintarImagen(IA, true)).toContain('Imagen ilustrativa');
    expect(pintarImagen(FOTO, true)).not.toContain('Imagen ilustrativa');
    expect(pintarImagen(IA, false)).not.toContain('Imagen ilustrativa');
  });
});

describe('Tarjeta y detalle de servicio marcan las imágenes ilustrativas', () => {
  const servicio = (imagen: string): Servicio => ({ id: 8, nombre: 'Corte de Cabello Dama', imagen, precio: '350' });

  it('la tarjeta del catálogo dice "Imagen ilustrativa" sobre una imagen generada', () => {
    const tarjeta = (imagen: string) => renderToStaticMarkup(createElement(TarjetaServicio, { servicio: servicio(imagen), indice: 0 }));
    expect(tarjeta(IA)).toContain('Imagen ilustrativa');
    expect(tarjeta(FOTO)).not.toContain('Imagen ilustrativa');
  });

  it('el detalle del servicio pide marcar la imagen ilustrativa', () => {
    const detalle = leer('src/app/(screens)/(privada)/cliente/servicios-citas/servicios/[id]/page.tsx');
    expect(detalle).toMatch(/<ServicioImagen[\s\S]*?marcarIlustrativa[\s\S]*?\/>/);
  });
});

describe('Home: miniatura de la carta de servicios', () => {
  const ILUSTRATIVA_SUBIDA = cdn('galeria/ilustrativas/k3j9xq2vwl8z.jpg');
  /** Contenido de la miniatura de la primera fila de la carta. */
  const miniatura = async (imagen: string) => {
    const { default: SeccionesHome } = await import('../home/SeccionesHome');
    const html = renderToStaticMarkup(
      createElement(SeccionesHome, { initialProductos: [], initialServicios: [{ id: 3, nombre: 'Corte', imagen, activo: true }] }),
    );
    const m = html.match(/<span class="mf-carta-fila__miniatura">([\s\S]*?)<\/span><span class="min-w-0/);
    expect(m, 'no se encontró la miniatura de la carta').not.toBeNull();
    return m![1];
  };

  it.each([IA, ILUSTRATIVA_SUBIDA])('una imagen generada con IA o ilustrativa (%s) no sale en la miniatura: sale el monograma', async (src) => {
    const html = await miniatura(src);
    expect(html).not.toContain(src);
    expect(html).toContain(PLACEHOLDER);
  });

  it('la foto real del equipo sí sale en la miniatura', async () => {
    const html = await miniatura(FOTO);
    expect(html).toContain(`src="${FOTO}"`);
    expect(html).not.toContain(PLACEHOLDER);
  });
});

describe('Hosts de imágenes retirados', () => {
  const RETIRADOS = ['images.unsplash.com', 'logos-world.net', 'via.placeholder.com', 'picsum.photos', 'placehold.co', 'dummyimage.com'];
  const ALCANCE = [
    'src/app/components/home/SeccionesHome.tsx',
    'src/app/components/home/HeroFluidos.tsx',
    'src/app/components/home/HeroEscena.tsx',
    'src/app/components/home/CarruselProductosHome.tsx',
    'src/app/components/galeria/GaleriaTrabajo.tsx',
    'src/app/components/galeria/GaleriaVacia.tsx',
    'src/app/components/servicios/ServicioImagen.tsx',
    'src/app/components/servicios/TarjetaServicio.tsx',
    'src/app/components/tienda/TarjetaCatalogo.tsx',
    'src/app/components/tienda/ProductoImagenCarruselTarjeta.tsx',
    'src/app/components/tienda/ProductoGaleriaDetalle.tsx',
    'src/app/(screens)/(privada)/cliente/galeria/page.tsx',
    'src/app/(screens)/(privada)/cliente/servicios-citas/page.tsx',
    'src/app/(screens)/(privada)/cliente/servicios-citas/servicios/[id]/page.tsx',
    'src/app/(screens)/(privada)/cliente/tienda-online/page.tsx',
    'src/app/(screens)/(privada)/cliente/tienda-online/productos/[id]/DetalleProductoClient.tsx',
    'src/app/(screens)/(privada)/cliente/tienda-online/productos/[id]/page.tsx',
    'src/app/contacto/page.tsx',
    'src/app/sobre-nosotros/page.tsx',
    'src/app/utils/galeria.ts',
  ];

  it.each(ALCANCE)('%s no referencia hosts de bancos de imágenes ni de relleno', (archivo) => {
    const fuente = leer(archivo);
    for (const host of RETIRADOS) expect(fuente).not.toContain(host);
  });

  it('next.config.ts ya no permite unsplash ni logos-world (y conserva Cloudinary y las fotos de Google)', () => {
    const config = leer('next.config.ts');
    expect(config).not.toContain('images.unsplash.com');
    expect(config).not.toContain('logos-world.net');
    expect(config).toContain("hostname: 'res.cloudinary.com'");
    expect(config).toContain("hostname: '**.googleusercontent.com'");
  });
});
