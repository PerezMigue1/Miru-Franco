import { afterEach, describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({
  patch: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async () => ({
    data: { id: 'u-1', nombre: 'Clienta', email: 'clienta@example.com' },
  })),
}));
vi.mock('./client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch, delete: vi.fn() } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { patchMiPerfil } from './perfil';

afterEach(() => { patch.mockClear(); });

describe('PATCH /api/auth/me: perfil capilar', () => {
  it('envía tipo de cabello, color natural, color actual y productos usados como campos directos', async () => {
    await patchMiPerfil({
      nombre: 'Clienta',
      tipoCabello: 'rizado',
      colorNatural: 'Castaño oscuro',
      colorActual: 'Rubio cenizo',
      productosUsados: 'Shampoo sin sulfatos',
    });
    expect(patch.mock.calls[0][0]).toBe('/api/auth/me');
    expect(patch.mock.calls[0][1]).toMatchObject({
      tipoCabello: 'rizado',
      colorNatural: 'Castaño oscuro',
      colorActual: 'Rubio cenizo',
      productosUsados: 'Shampoo sin sulfatos',
    });
  });

  it('manda null para borrar un campo capilar y omite los que no vienen', async () => {
    await patchMiPerfil({ tipoCabello: null, colorNatural: null });
    const cuerpo = patch.mock.calls[0][1] as Record<string, unknown>;
    expect(cuerpo.tipoCabello).toBeNull();
    expect(cuerpo.colorNatural).toBeNull();
    expect('colorActual' in cuerpo).toBe(false);
    expect('productosUsados' in cuerpo).toBe(false);
  });
});
