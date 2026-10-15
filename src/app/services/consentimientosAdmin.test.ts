import { afterEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(),
}));
vi.mock('./client', () => ({ apiClient: { get } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  buscarConsentimientosAdmin,
  descargarConsentimientosCsv,
  MENSAJE_CONSTANCIA_DEMASIADO_GRANDE,
  todosLosConsentimientosAdmin,
} from './consentimientosAdmin';

afterEach(() => {
  get.mockReset();
  vi.unstubAllGlobals();
});

describe('Consentimientos del panel: búsqueda por persona', () => {
  it('lee GET /api/consentimientos/admin con q recortada, página y límite', async () => {
    get.mockResolvedValueOnce({ success: true, data: [{ id: '1' }], total: 1, page: 1, limit: 20, totalPages: 1 });
    const res = await buscarConsentimientosAdmin({ q: '  ana@correo.com ', page: 1 });
    expect(get.mock.calls[0][0]).toBe('/api/consentimientos/admin?q=ana%40correo.com&page=1&limit=20');
    expect(get.mock.calls[0][1]).toMatchObject({ customBase: 'http://api.test', skip403Redirect: true });
    expect(res).toEqual({ filas: [{ id: '1' }], total: 1, page: 1, totalPages: 1 });
  });

  it('sin texto de búsqueda no manda q', async () => {
    get.mockResolvedValueOnce({ success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await buscarConsentimientosAdmin({ q: '  ' });
    expect(get.mock.calls[0][0]).toBe('/api/consentimientos/admin?page=1&limit=20');
  });

  it('para el PDF junta todas las páginas de 100 en 100', async () => {
    get
      .mockResolvedValueOnce({ success: true, data: [{ id: '1' }], total: 2, page: 1, limit: 100, totalPages: 2 })
      .mockResolvedValueOnce({ success: true, data: [{ id: '2' }], total: 2, page: 2, limit: 100, totalPages: 2 });
    const filas = await todosLosConsentimientosAdmin('u-1');
    expect(filas.map((f) => f.id)).toEqual(['1', '2']);
    expect(get.mock.calls.map((c) => c[0])).toEqual([
      '/api/consentimientos/admin?q=u-1&page=1&limit=100',
      '/api/consentimientos/admin?q=u-1&page=2&limit=100',
    ]);
  });

  it('si la búsqueda pasa del tope de páginas no arma una constancia recortada: pide filtrar por persona', async () => {
    get.mockResolvedValue({ success: true, data: [{ id: '1' }], total: 6000, page: 1, limit: 100, totalPages: 60 });
    await expect(todosLosConsentimientosAdmin('')).rejects.toThrow(MENSAJE_CONSTANCIA_DEMASIADO_GRANDE);
    expect(MENSAJE_CONSTANCIA_DEMASIADO_GRANDE).toMatch(/una sola persona/);
    // No sigue pidiendo páginas que no va a usar
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('si el total crece mientras junta las páginas y pasa del tope, también se detiene con el aviso', async () => {
    get
      .mockResolvedValueOnce({ success: true, data: [{ id: '1' }], total: 4950, page: 1, limit: 100, totalPages: 50 })
      .mockResolvedValue({ success: true, data: [{ id: '2' }], total: 5050, page: 2, limit: 100, totalPages: 51 });
    await expect(todosLosConsentimientosAdmin('')).rejects.toThrow(MENSAJE_CONSTANCIA_DEMASIADO_GRANDE);
  });

  it('justo en el tope (50 páginas) sí arma la constancia completa', async () => {
    let pagina = 0;
    get.mockImplementation(async () => {
      pagina += 1;
      return { success: true, data: [{ id: String(pagina) }], total: 5000, page: pagina, limit: 100, totalPages: 50 };
    });
    expect(await todosLosConsentimientosAdmin('')).toHaveLength(50);
  });
});

describe('Consentimientos del panel: descarga del CSV con la sesión', () => {
  it('pide el CSV de la persona con la cookie y toma el nombre del Content-Disposition', async () => {
    const fetchSimulado = vi.fn(
      async () =>
        new Response('id,usuario_id\n1,u-1\n', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="consentimientos-u-1-2026-10-14.csv"',
          },
        }),
    );
    vi.stubGlobal('fetch', fetchSimulado);
    const archivo = await descargarConsentimientosCsv('u-1');
    const [url, init] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/api/consentimientos/admin/export?usuarioId=u-1&formato=csv');
    expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
    expect(archivo.nombre).toBe('consentimientos-u-1-2026-10-14.csv');
    expect(await archivo.blob.text()).toBe('id,usuario_id\n1,u-1\n');
  });

  it('sin persona pide el CSV completo y arma un nombre si no viene la cabecera', async () => {
    const fetchSimulado = vi.fn(async () => new Response('id\n', { status: 200 }));
    vi.stubGlobal('fetch', fetchSimulado);
    const archivo = await descargarConsentimientosCsv(undefined, new Date('2026-10-15T03:00:00.000Z'));
    expect((fetchSimulado.mock.calls[0] as unknown as [string])[0]).toBe(
      'http://api.test/api/consentimientos/admin/export?formato=csv',
    );
    expect(archivo.nombre).toBe('consentimientos-todos-2026-10-14.csv');
  });

  it('un 403 se convierte en el mensaje del backend, sin redirigir', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ success: false, message: 'No tienes permisos' }), { status: 403 })),
    );
    await expect(descargarConsentimientosCsv('u-1')).rejects.toThrow('No tienes permisos');
  });
});
