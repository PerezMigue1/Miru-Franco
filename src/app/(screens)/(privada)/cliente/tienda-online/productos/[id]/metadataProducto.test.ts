import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getProductoPorId } = vi.hoisted(() => ({ getProductoPorId: vi.fn() }));
vi.mock('../../../../../../services/productos', async (original) => {
  const real = await original<typeof import('../../../../../../services/productos')>();
  return { ...real, getProductoPorId };
});
vi.mock('./DetalleProductoClient', () => ({ default: () => null }));

import { generateMetadata } from './page';
import { OG_IMAGE_DEFAULT } from '../../../../../../utils/seo';

const FOTO_IA = 'https://res.cloudinary.com/dlwzgwfdj/image/upload/v1/productos/ChatGPT_Image_shampoo.png';
const FOTO_REAL = 'https://res.cloudinary.com/dlwzgwfdj/image/upload/v1/productos/shampoo-real.jpg';

async function imagenesDe(imagenes: string[]) {
  getProductoPorId.mockResolvedValueOnce({ id: 9, nombre: 'Shampoo', marca: 'AVYNA', descripcion: 'Shampoo', imagenes, presentaciones: [] });
  const meta = await generateMetadata({ params: Promise.resolve({ id: '9' }) });
  return ((meta.openGraph?.images ?? []) as { url: string }[]).map((i) => i.url);
}

beforeEach(() => getProductoPorId.mockReset());

describe('Vista previa al compartir un producto (og:image)', () => {
  it('una imagen generada con IA nunca sale en la vista previa', async () => {
    expect(await imagenesDe([FOTO_IA])).toEqual([OG_IMAGE_DEFAULT.url]);
  });

  it('si la primera es de IA y hay una real, usa la real', async () => {
    expect(await imagenesDe([FOTO_IA, FOTO_REAL])).toEqual([FOTO_REAL]);
  });
});
