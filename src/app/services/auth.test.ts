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
