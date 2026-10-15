import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, patch } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(),
  patch: vi.fn<(ruta: string, body?: unknown, base?: unknown) => Promise<unknown>>(),
}));
vi.mock('./client', () => ({ apiClient: { get, patch } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { listarNotificaciones, marcarTodasNotificacionesLeidas } from './ecommerce';

afterEach(() => {
  get.mockReset();
  patch.mockReset();
});

/** La campana y la consulta de respaldo (cada 60 s sin SSE) usan GET /api/notificaciones?leida=false. */
describe('listarNotificaciones', () => {
  it('con leida=false pide solo las no leídas', async () => {
    get.mockResolvedValue({ success: true, data: [] });
    await listarNotificaciones({ leida: false });
    expect(get).toHaveBeenCalledWith('/api/notificaciones?leida=false', 'http://api.test');
  });

  it('sin filtro sigue pidiendo todas', async () => {
    get.mockResolvedValue({ success: true, data: [] });
    await listarNotificaciones();
    expect(get).toHaveBeenCalledWith('/api/notificaciones', 'http://api.test');
  });

  it('trae la pantalla relacionada (urlAccion) de cada notificación', async () => {
    get.mockResolvedValue({ success: true, data: [{ id: 'n-1', tipo: 'cita_creada', titulo: 'T', mensaje: 'M', leida: false, urlAccion: '/cliente/servicios-citas/mis-citas/7' }] });
    const [n] = await listarNotificaciones({ leida: false });
    expect(n.urlAccion).toBe('/cliente/servicios-citas/mis-citas/7');
  });
});

/** "Marcar todos como leídos" de la campana: una sola llamada, solo las propias (PATCH /api/notificaciones/leidas). */
describe('marcarTodasNotificacionesLeidas', () => {
  it('llama PATCH /api/notificaciones/leidas y devuelve cuántas marcó', async () => {
    patch.mockResolvedValue({ success: true, count: 4 });
    await expect(marcarTodasNotificacionesLeidas()).resolves.toBe(4);
    expect(patch).toHaveBeenCalledWith('/api/notificaciones/leidas', undefined, 'http://api.test');
  });

  it('sin count en la respuesta devuelve 0', async () => {
    patch.mockResolvedValue({ success: true });
    await expect(marcarTodasNotificacionesLeidas()).resolves.toBe(0);
  });
});
