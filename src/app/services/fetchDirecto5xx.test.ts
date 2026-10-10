import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ apiClient: {} }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { aplicarDescuentoPorMarca, getProductosSinRedirigir } from './productos';
import { getServicios } from './servicios';

const GENERICO = 'Ocurrió un error interno. Intenta de nuevo en unos segundos.';
const HTML_PROXY = '<html><body><h1>502 Bad Gateway</h1><hr>nginx/1.25.3</body></html>';

const respuesta = (status: number, cuerpo: string) => new Response(cuerpo, { status });

describe('fetch directos de productos y servicios: un 5xx no muestra el cuerpo crudo', () => {
  let consola: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consola = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('getServicios con HTML de proxy (502) da el texto genérico y deja el detalle en la consola', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(502, HTML_PROXY)));
    const { data, error } = await getServicios();
    expect(data).toEqual([]);
    expect(error).toBe(GENERICO);
    expect(consola).toHaveBeenCalledWith('[API 5xx]', 'http://api.test/api/servicios', 502, HTML_PROXY);
  });

  it('getProductosSinRedirigir con un 500 técnico da el texto genérico con la referencia', async () => {
    const cuerpo = JSON.stringify({ message: 'Invalid `prisma.producto.findMany()`', referencia: 'A1B2C3D4' });
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(500, cuerpo)));
    const { error } = await getProductosSinRedirigir();
    expect(error).toBe(`${GENERICO} (ref. A1B2C3D4)`);
  });

  it('aplicarDescuentoPorMarca con un 503 da el texto de servicio no disponible', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(503, 'upstream connect error')));
    const r = await aplicarDescuentoPorMarca('Kerastase', 10);
    expect(r).toEqual({
      success: false,
      error: 'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.',
    });
  });

  it('un 4xx conserva el mensaje del backend, como antes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(403, JSON.stringify({ message: 'Sin permiso para servicios' }))));
    const { error } = await getServicios();
    expect(error).toBe('Sin permiso para servicios');
  });
});
