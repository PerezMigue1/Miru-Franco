import { afterEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>() }));
vi.mock('./client', () => ({ apiClient: { get } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { getServicioPorId, getServiciosAdmin, obtenerServicioPorIdOError } from './servicios';

const conStatus = (status: number, mensaje: string) => Object.assign(new Error(mensaje), { status });

afterEach(() => get.mockReset());

describe('Servicio por id en el panel', () => {
  it('un 404 es "no encontrado" (null)', async () => {
    get.mockRejectedValueOnce(conStatus(404, 'Servicio no encontrado'));
    await expect(getServicioPorId(99)).resolves.toBeNull();
  });

  it('un id que no es número es "no encontrado" sin pedirlo al backend (evita el 500 y /500)', async () => {
    await expect(getServicioPorId('abc')).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('en el panel cualquier otro fallo se propaga como error, no como "no encontrado"', async () => {
    get.mockRejectedValueOnce(conStatus(503, 'El servicio no está disponible en este momento.'));
    await expect(obtenerServicioPorIdOError(5)).rejects.toThrow('El servicio no está disponible');
  });

  it('en el panel un 404 sigue siendo null', async () => {
    get.mockRejectedValueOnce(conStatus(404, 'Servicio no encontrado'));
    await expect(obtenerServicioPorIdOError(5)).resolves.toBeNull();
  });

  it('getServicioPorId (portal y metadatos) sigue sin lanzar', async () => {
    get.mockRejectedValueOnce(conStatus(503, 'caído'));
    await expect(getServicioPorId(5)).resolves.toBeNull();
  });

  it('pide el detalle sin redirigir a /500', async () => {
    get.mockResolvedValueOnce({ data: { id: 5, nombre: 'Corte' } });
    await getServicioPorId(5);
    expect(get.mock.calls[0][1]).toMatchObject({ skip500Redirect: true });
  });
});

describe('Listado admin de servicios', () => {
  it('un fallo devuelve el error (no solo una lista vacía)', async () => {
    get.mockRejectedValueOnce(conStatus(403, 'Sin permiso para servicios'));
    const r = await getServiciosAdmin(true);
    expect(r).toEqual({ data: [], error: 'Sin permiso para servicios' });
  });
});
