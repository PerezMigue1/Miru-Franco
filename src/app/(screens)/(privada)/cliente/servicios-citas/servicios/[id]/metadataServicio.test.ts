import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServicioPorId } = vi.hoisted(() => ({ getServicioPorId: vi.fn() }));
vi.mock('../../../../../../services/servicios', () => ({ getServicioPorId }));

import { generateMetadata } from './layout';
import { OG_IMAGE_DEFAULT } from '../../../../../../utils/seo';

const FOTO_EQUIPO = 'https://res.cloudinary.com/dlwzgwfdj/image/upload/v1/servicios/corte-real.jpg';
const FOTO_IA = 'https://res.cloudinary.com/dlwzgwfdj/image/upload/v1/servicios/ChatGPT_Image_2025_corte.png';
const FOTO_BANCO = 'https://images.unsplash.com/photo-123?w=800';

async function imagenesDe(imagen: string) {
  getServicioPorId.mockResolvedValueOnce({ id: 7, nombre: 'Corte', descripcion: 'Corte de cabello', imagen });
  const meta = await generateMetadata({ params: Promise.resolve({ id: '7' }) });
  return (meta.openGraph?.images ?? []) as { url: string }[];
}

beforeEach(() => getServicioPorId.mockReset());

describe('Vista previa al compartir un servicio (og:image)', () => {
  it('una imagen generada con IA nunca sale en la vista previa: usa la imagen propia del salón', async () => {
    const imagenes = await imagenesDe(FOTO_IA);
    expect(imagenes.map((i) => i.url)).toEqual([OG_IMAGE_DEFAULT.url]);
  });

  it('una imagen de banco o de otro host tampoco: usa la imagen propia del salón', async () => {
    const imagenes = await imagenesDe(FOTO_BANCO);
    expect(imagenes.map((i) => i.url)).toEqual([OG_IMAGE_DEFAULT.url]);
  });

  it('la foto real que subió el equipo sí se usa como vista previa del servicio', async () => {
    const imagenes = await imagenesDe(FOTO_EQUIPO);
    expect(imagenes.map((i) => i.url)).toEqual([FOTO_EQUIPO]);
  });

  it('si la primera es de IA, ilustrativa o de banco, usa la primera foto real entre imagen e imagenes (como el producto)', async () => {
    const ILUSTRATIVA = 'https://res.cloudinary.com/dlwzgwfdj/image/upload/v1/galeria/ilustrativas/k3j9.jpg';
    getServicioPorId.mockResolvedValueOnce({
      id: 7,
      nombre: 'Corte',
      descripcion: 'Corte de cabello',
      imagen: FOTO_IA,
      imagenes: [FOTO_IA, FOTO_BANCO, ILUSTRATIVA, FOTO_EQUIPO],
    });
    const meta = await generateMetadata({ params: Promise.resolve({ id: '7' }) });
    expect(((meta.openGraph?.images ?? []) as { url: string }[]).map((i) => i.url)).toEqual([FOTO_EQUIPO]);
  });

  it('sin ninguna foto real entre imagen e imagenes: la imagen propia del salón', async () => {
    getServicioPorId.mockResolvedValueOnce({ id: 7, nombre: 'Corte', imagen: FOTO_IA, imagenes: [FOTO_IA, FOTO_BANCO] });
    const meta = await generateMetadata({ params: Promise.resolve({ id: '7' }) });
    expect(((meta.openGraph?.images ?? []) as { url: string }[]).map((i) => i.url)).toEqual([OG_IMAGE_DEFAULT.url]);
  });
});
