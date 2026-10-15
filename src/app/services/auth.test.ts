import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Entorno node: window y localStorage mínimos antes de importar auth.ts (y el cliente).
const almacen = new Map<string, string>();
const replace = vi.fn();
vi.stubGlobal('window', {
  location: { pathname: '/login', search: '', origin: 'http://localhost:3000', replace },
  dispatchEvent: () => true,
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

let api: typeof import('./auth').api;
beforeAll(async () => {
  ({ api } = await import('./auth'));
});

const TEXTO_SIN_ACTIVAR = 'Tu cuenta no está activada. Revisa tu correo para activar tu cuenta.';
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const responder = (status: number, cuerpo: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status }));

describe('api.login: cuenta sin activar se decide por el código, no por el texto', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    fetchMock.mockReset();
    replace.mockReset();
    almacen.clear();
    vi.restoreAllMocks();
  });

  it('403 con code CUENTA_NO_ACTIVADA devuelve requiereVerificacion sin redirigir a /403', async () => {
    responder(403, { statusCode: 403, message: TEXTO_SIN_ACTIVAR, code: 'CUENTA_NO_ACTIVADA' });
    const r = await api.login('ana@correo.mx', 'Secreta123!');
    expect(r).toEqual({ success: false, error: TEXTO_SIN_ACTIVAR, requiereVerificacion: true });
    expect(replace).not.toHaveBeenCalled();
  });

  it('403 con el mismo texto pero sin code no se trata como cuenta sin activar: se relanza', async () => {
    responder(403, { statusCode: 403, message: TEXTO_SIN_ACTIVAR });
    await expect(api.login('ana@correo.mx', 'Secreta123!')).rejects.toMatchObject({
      message: TEXTO_SIN_ACTIVAR,
      status: 403,
    });
  });

  it('un 401 con un texto que menciona "revisa tu correo" tampoco pide activación', async () => {
    responder(401, { statusCode: 401, message: 'Credenciales inválidas. Revisa tu correo y contraseña.' });
    await expect(api.login('ana@correo.mx', 'mala')).rejects.toThrow('Credenciales inválidas');
  });
});

describe('api.getProfile: el status del fallo llega a quien decide (layouts)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    fetchMock.mockReset();
    replace.mockReset();
    almacen.clear();
    vi.restoreAllMocks();
  });

  it('200 con el usuario: success sin status', async () => {
    responder(200, { id: 'u1', email: 'ana@correo.mx', nombre: 'Ana', rol: 'estilista' });
    const r = await api.getProfile();
    expect(r.success).toBe(true);
    expect(r.status).toBeUndefined();
  });

  it('503 (backend dormido) devuelve status 503', async () => {
    responder(503, { message: 'Service Unavailable' });
    const r = await api.getProfile();
    expect(r).toMatchObject({ success: false, status: 503 });
  });

  it('429 devuelve status 429', async () => {
    responder(429, { message: 'Demasiadas peticiones', retryAfter: 30 });
    const r = await api.getProfile();
    expect(r).toMatchObject({ success: false, status: 429 });
  });

  it('403 devuelve status 403', async () => {
    responder(403, { statusCode: 403, message: 'Acceso denegado' });
    const r = await api.getProfile();
    expect(r).toMatchObject({ success: false, status: 403 });
  });

  it('401 devuelve status 401', async () => {
    responder(401, { statusCode: 401, message: 'Unauthorized' });
    const r = await api.getProfile();
    expect(r).toMatchObject({ success: false, status: 401 });
  });

  it('un fallo de red no trae status', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const r = await api.getProfile();
    expect(r.success).toBe(false);
    expect(r.status).toBeUndefined();
  });
});

describe('cuentaTienePassword: si la cuenta entra con contraseña (GET /auth/me, tienePassword)', () => {
  let cuentaTienePassword: typeof import('./auth').cuentaTienePassword;
  beforeAll(async () => {
    ({ cuentaTienePassword } = await import('./auth'));
  });
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.restoreAllMocks();
  });

  it('true o false según lo que diga el backend', async () => {
    responder(200, { success: true, data: { id: 'u-1', email: 'a@b.mx', tienePassword: true } });
    expect(await cuentaTienePassword()).toBe(true);
    responder(200, { success: true, data: { id: 'u-2', email: 'g@gmail.com', tienePassword: false } });
    expect(await cuentaTienePassword()).toBe(false);
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/auth/me');
  });

  it('si no viene el dato o la consulta falla: null (no se sabe)', async () => {
    responder(200, { success: true, data: { id: 'u-1', email: 'a@b.mx' } });
    expect(await cuentaTienePassword()).toBeNull();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await cuentaTienePassword()).toBeNull();
  });
});
