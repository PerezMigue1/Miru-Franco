import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Entorno node: window y localStorage mínimos antes de importar el cliente.
const almacen = new Map<string, string>();
const replace = vi.fn();
vi.stubGlobal('window', {
  location: { pathname: '/admin/inventario', search: '', origin: 'http://localhost:3000', replace },
});
vi.stubGlobal('localStorage', {
  getItem: (k: string) => almacen.get(k) ?? null,
  setItem: (k: string, v: string) => void almacen.set(k, v),
  removeItem: (k: string) => void almacen.delete(k),
});
vi.mock('./config', () => ({
  getApiBaseUrl: () => 'http://api.test/api/auth',
  getBackendBaseUrl: () => 'http://api.test',
}));

type ErrorApi = Error & { status?: number; code?: string; data?: unknown };

let apiClient: typeof import('./client').apiClient;
beforeAll(async () => {
  ({ apiClient } = await import('./client'));
});

const GENERICO = 'Ocurrió un error interno. Intenta de nuevo en unos segundos.';
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const responder = (status: number, cuerpo: string) => fetchMock.mockResolvedValueOnce(new Response(cuerpo, { status }));

async function errorDe(promesa: Promise<unknown>): Promise<ErrorApi> {
  try {
    await promesa;
  } catch (e) {
    return e as ErrorApi;
  }
  throw new Error('La petición no falló');
}

describe('apiClient: errores del servidor (5xx)', () => {
  let consola: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    fetchMock.mockReset();
    replace.mockReset();
    vi.restoreAllMocks();
  });

  it('un 500 con detalle técnico da el texto genérico con la referencia y el cuerpo solo va a la consola', async () => {
    const cuerpo = JSON.stringify({ message: 'Invalid `prisma.usuario.findMany()` invocation', referencia: 'A1B2C3D4' });
    responder(500, cuerpo);
    const err = await errorDe(apiClient.get('/usuarios'));
    expect(err.message).toBe(`${GENERICO} (ref. A1B2C3D4)`);
    expect(err.status).toBe(500);
    expect(err.data).toEqual({ statusCode: 500, referencia: 'A1B2C3D4' });
    expect(consola).toHaveBeenCalledWith('[API 5xx]', 'http://api.test/api/auth/usuarios', 500, cuerpo);
    expect(replace).toHaveBeenCalledWith('/500');
  });

  it('un 502 con HTML de proxy da el texto genérico, sin el HTML en el mensaje ni en err.data', async () => {
    const html = '<html><body><h1>502 Bad Gateway</h1><hr>nginx/1.25.3</body></html>';
    responder(502, html);
    const err = await errorDe(apiClient.get('/servicios', { skip500Redirect: true }));
    expect(err.message).toBe(GENERICO);
    expect(err.status).toBe(502);
    expect(err.data).toEqual({ statusCode: 502 });
    expect(consola).toHaveBeenCalledWith('[API 5xx]', 'http://api.test/api/auth/servicios', 502, html);
    expect(replace).not.toHaveBeenCalled();
  });

  it('un 503 deliberado del backend también da el texto genérico de servicio no disponible', async () => {
    responder(503, JSON.stringify({ message: 'Verificador de tarjetas: ECONNRESET 10.0.0.3' }));
    const err = await errorDe(apiClient.get('/checkout'));
    expect(err.message).toBe('El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.');
    expect(err.status).toBe(503);
  });

  it('skip500Redirect evita ir a /500', async () => {
    responder(500, '{}');
    await errorDe(apiClient.get('/usuarios', { skip500Redirect: true }));
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('apiClient: los 4xx y la red se conservan', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    fetchMock.mockReset();
    replace.mockReset();
    vi.restoreAllMocks();
  });

  it('un 400 conserva el texto del backend', async () => {
    responder(400, JSON.stringify({ message: 'El nombre es obligatorio' }));
    const err = await errorDe(apiClient.post('/productos', {}));
    expect(err.message).toBe('El nombre es obligatorio');
    expect(err.status).toBe(400);
  });

  it('un 409 conserva el texto del backend', async () => {
    responder(409, JSON.stringify({ message: 'El correo ya está registrado' }));
    const err = await errorDe(apiClient.post('/usuarios', {}));
    expect(err.message).toBe('El correo ya está registrado');
  });

  it('un fallo de red da el mensaje sin conexión', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const err = await errorDe(apiClient.get('/usuarios'));
    expect(err.message).toBe('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.');
  });

  it('un 403 lleva status, code y el cuerpo para que quien llama decida sin leer el texto', async () => {
    const cuerpo = {
      message: 'Tu cuenta no está activada. Revisa tu correo para activar tu cuenta.',
      code: 'CUENTA_NO_ACTIVADA',
    };
    responder(403, JSON.stringify(cuerpo));
    const err = await errorDe(apiClient.post('/api/auth/login', {}, { skip403Redirect: true }));
    expect(err.status).toBe(403);
    expect(err.code).toBe('CUENTA_NO_ACTIVADA');
    expect(err.data).toEqual(cuerpo);
    expect(err.message).toBe(cuerpo.message);
    expect(replace).not.toHaveBeenCalled();
  });
});
