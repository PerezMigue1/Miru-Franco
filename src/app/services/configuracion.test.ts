import { afterEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>() }));
vi.mock('./client', () => ({ apiClient: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { obtenerConfiguracionSalon } from './configuracion';

afterEach(() => { get.mockReset(); });

describe('Horario del salón: no se inventa un horario si la carga no trae datos', () => {
  it('una respuesta sin horario es un error, no 09:00 a 18:00 por defecto', async () => {
    get.mockResolvedValueOnce({ data: {} });
    await expect(obtenerConfiguracionSalon()).rejects.toThrow(/horario/i);
  });

  it('con horario real lo devuelve tal cual', async () => {
    get.mockResolvedValueOnce({
      data: {
        entradaLunesViernes: '10:00',
        salidaLunesViernes: '20:00',
        entradaSabado: '10:00',
        salidaSabado: '16:00',
        entradaDomingo: null,
        salidaDomingo: null,
        margenGraciaMinutos: 10,
        tarifaHoraExtra: 80,
      },
    });
    const config = await obtenerConfiguracionSalon();
    expect(config).toMatchObject({ entradaLunesViernes: '10:00', salidaSabado: '16:00', tarifaHoraExtra: 80 });
  });
});
