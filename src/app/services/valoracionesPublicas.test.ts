import { describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, opciones?: unknown) => Promise<{ data: unknown }>>(async () => ({ data: [] })),
}));
vi.mock('./client', () => ({ apiClient: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { listarValoracionesProducto } from './ecommerce';

describe('Reseñas públicas de un producto', () => {
  it('muestran el nombre de pila de la autora y no exponen ids de pedido ni de usuaria', async () => {
    get.mockResolvedValueOnce({
      data: [{ id: 9, puntuacion: 5, comentario: 'Me encantó', creadoEn: '2026-10-01T10:00:00Z', autor: 'Ana' }],
    });
    const [r] = await listarValoracionesProducto(3);
    expect(r).toMatchObject({ id: 9, puntuacion: 5, comentario: 'Me encantó', autor: 'Ana' });
    expect(r.pedidoId).toBeUndefined();
    expect(r.usuarioId).toBeUndefined();
  });
});
