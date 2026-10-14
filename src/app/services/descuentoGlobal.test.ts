import { afterEach, describe, expect, it, vi } from 'vitest';

const { put } = vi.hoisted(() => ({
  put: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async () => ({ data: { id: 1 } })),
}));
vi.mock('./client', () => ({ apiClient: { put } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { aplicarDescuentoGlobal } from './productos';

const productoAvyna = {
  id: 7,
  nombre: 'Shampoo',
  descripcion: 'Hidratante',
  marca: 'AVYNA',
  categoria: 'Cabello',
  descuento: 0,
  presentaciones: [
    { id: 70, tamanio: '500ml', precio: 200, precioOriginal: 200, stock: 4, disponible: true, imagenes: ['https://res.cloudinary.com/x/a.jpg'], fechaCaducidad: '2027-01-31T12:00:00.000Z' },
    { id: 71, tamanio: '1L', precio: 350, stock: 0, disponible: true, imagenes: [] },
  ],
};

function listado(productos: unknown[]) {
  return vi.fn(async (url: string) => {
    if (url.includes('/descuento-global')) return new Response('{"message":"Cannot POST"}', { status: 404 });
    return new Response(JSON.stringify({ data: productos }), { status: 200 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  put.mockReset();
  put.mockImplementation(async () => ({ data: { id: 1 } }));
});

describe('Descuento global del inventario', () => {
  it('manda las presentaciones con su id, imágenes y caducidad para que el backend no las rechace ni las borre', async () => {
    vi.stubGlobal('fetch', listado([productoAvyna]));
    const r = await aplicarDescuentoGlobal({ marca: 'AVYNA', porcentaje: 10 });
    expect(r).toEqual({ success: true, actualizados: 1 });
    const body = put.mock.calls[0][1] as { presentaciones: Array<Record<string, unknown>> };
    expect(body.presentaciones.map((p) => p.id)).toEqual([70, 71]);
    expect(body.presentaciones[0]).toMatchObject({
      precio: 180,
      precioOriginal: 200,
      imagenes: ['https://res.cloudinary.com/x/a.jpg'],
      fechaCaducidad: '2027-01-31T12:00:00.000Z',
    });
  });

  it('no llama al endpoint inexistente /descuento-global', async () => {
    const fetchMock = listado([productoAvyna]);
    vi.stubGlobal('fetch', fetchMock);
    await aplicarDescuentoGlobal({ marca: 'AVYNA', porcentaje: 10 });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/descuento-global'))).toBe(false);
  });

  it('si ningún producto se actualiza lo reporta como error, nunca como éxito con 0', async () => {
    vi.stubGlobal('fetch', listado([productoAvyna]));
    put.mockRejectedValue(new Error('Las presentaciones ya existentes deben incluir su id.'));
    const r = await aplicarDescuentoGlobal({ marca: 'AVYNA', porcentaje: 10 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('No se pudo aplicar el descuento');
  });

  it('si algunos fallan lo reporta como error con cuántos sí se actualizaron', async () => {
    vi.stubGlobal('fetch', listado([productoAvyna, { ...productoAvyna, id: 8, nombre: 'Acondicionador' }]));
    put.mockResolvedValueOnce({ data: { id: 7 } }).mockRejectedValueOnce(new Error('Error de red'));
    const r = await aplicarDescuentoGlobal({ marca: 'AVYNA', porcentaje: 10 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('1 de 2');
  });
});
