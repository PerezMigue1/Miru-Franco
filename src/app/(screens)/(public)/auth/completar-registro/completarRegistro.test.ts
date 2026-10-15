import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

const markSessionStart = vi.fn();
vi.mock('../../../../utils/security', () => ({ markSessionStart: (s?: unknown) => markSessionStart(s) }));
const getProfile = vi.fn();
vi.mock('../../../../services/auth', () => ({ api: { getProfile: () => getProfile() } }));
const mergePerfilEnLocalStorage = vi.fn();
vi.mock('../../../../services/perfil', () => ({ mergePerfilEnLocalStorage: (p: unknown) => mergePerfilEnLocalStorage(p) }));

const {
  MENSAJE_CUENTA_EXISTENTE,
  MENSAJE_ENLACE_VENCIDO,
  completarRegistroGoogle,
  datosDelTokenGoogle,
  estadoTrasCompletar,
  iniciarSesionTrasCompletar,
  leerTokenDeLaUrl,
} = await import('./completarRegistro');
const { documentosAceptados } = await import('../../../../services/consentimientos');
const { MENSAJES_CASILLA_OBLIGATORIA } = await import('../../../../components/legal/reglasAlta');

const base64url = (texto: string) => Buffer.from(texto, 'utf8').toString('base64url');
const tokenCon = (payload: Record<string, unknown>) =>
  `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(JSON.stringify(payload))}.firma`;
const TOKEN = tokenCon({ proposito: 'registro_google', googleId: 'g-1', email: 'ana@gmail.com', nombre: 'Ana Pérez', foto: 'https://x/y.jpg', iat: 1, exp: 901 });

const ACEPTA = { aceptaTerminos: true, aceptaAvisoPrivacidad: true, recibePromociones: false };
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const responder = (status: number, cuerpo: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status }));

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => {
  fetchMock.mockReset();
  markSessionStart.mockReset();
  getProfile.mockReset();
  mergePerfilEnLocalStorage.mockReset();
  vi.restoreAllMocks();
});

describe('Token del registro con Google (solo para mostrar nombre y correo)', () => {
  it('lee nombre y correo del payload, con acentos', () => {
    expect(datosDelTokenGoogle(TOKEN)).toEqual({ nombre: 'Ana Pérez', email: 'ana@gmail.com' });
  });

  it('sin token, mal formado o de otro propósito: null', () => {
    expect(datosDelTokenGoogle(null)).toBeNull();
    expect(datosDelTokenGoogle('')).toBeNull();
    expect(datosDelTokenGoogle('no-es-un-jwt')).toBeNull();
    expect(datosDelTokenGoogle('a.%%%.c')).toBeNull();
    expect(datosDelTokenGoogle(tokenCon({ proposito: 'sesion', email: 'ana@gmail.com', nombre: 'Ana' }))).toBeNull();
  });
});

describe('El token llega en el fragmento (#token=); leerlo no toca la URL', () => {
  it('lee #token=', () => {
    expect(leerTokenDeLaUrl({ hash: `#token=${TOKEN}`, search: '' })).toBe(TOKEN);
  });

  it('por compatibilidad también lee ?token= (enlaces viejos)', () => {
    expect(leerTokenDeLaUrl({ hash: '', search: `?token=${encodeURIComponent(TOKEN)}` })).toBe(TOKEN);
  });

  it('si vienen los dos, manda el del fragmento', () => {
    expect(leerTokenDeLaUrl({ hash: '#token=del-fragmento', search: '?token=de-la-query' })).toBe('del-fragmento');
  });

  it('sin token (o vacío) devuelve null', () => {
    expect(leerTokenDeLaUrl({ hash: '', search: '' })).toBeNull();
    expect(leerTokenDeLaUrl({ hash: '#token=', search: '?otra=1' })).toBeNull();
  });

  it('es pura: solo recibe la ubicación, no el historial, y no guarda nada entre llamadas', () => {
    expect(leerTokenDeLaUrl.length).toBe(1);
    expect(leerTokenDeLaUrl({ hash: '#token=primero', search: '' })).toBe('primero');
    expect(leerTokenDeLaUrl({ hash: '', search: '' })).toBeNull();
  });
});

describe('Token de la app (origen app)', () => {
  it('la respuesta sin sesión con data.origen "app" se marca para no iniciar sesión en la web', async () => {
    responder(201, { success: true, data: { origen: 'app' } });
    expect(await completarRegistroGoogle(TOKEN, ACEPTA, fetchMock)).toEqual({ ok: true, origenApp: true });
  });

  it('con origen app no inicia sesión en la web: pide volver a la app', async () => {
    const iniciar = vi.fn(async () => true);
    expect(await estadoTrasCompletar({ ok: true, origenApp: true }, iniciar)).toBe('lista_app');
    expect(iniciar).not.toHaveBeenCalled();
  });

  it('en la web inicia sesión con la renovación que mandó el backend (o pide entrar si /auth/me falla)', async () => {
    const iniciar = vi.fn(async () => true);
    expect(await estadoTrasCompletar({ ok: true, renovarEnSegundos: 600 }, iniciar)).toBe('lista');
    expect(iniciar).toHaveBeenCalledWith(600);
    expect(await estadoTrasCompletar({ ok: true }, vi.fn(async () => false))).toBe('sin_perfil');
  });
});

describe('POST /auth/google/completar', () => {
  it('manda X-Auth-Mode: cookie, la cookie de sesión y solo los campos del DTO', async () => {
    responder(200, { success: true, renovarEnSegundos: 600 });
    const r = await completarRegistroGoogle(TOKEN, { ...ACEPTA, recibePromociones: true }, fetchMock);
    expect(r).toEqual({ ok: true, renovarEnSegundos: 600 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/auth/google/completar');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect((init?.headers as Record<string, string>)['X-Auth-Mode']).toBe('cookie');
    expect(JSON.parse(String(init?.body))).toEqual({
      token: TOKEN,
      aceptaTerminos: true,
      aceptaAvisoPrivacidad: true,
      recibePromociones: true,
      documentos: documentosAceptados(['terminos', 'aviso-privacidad']),
    });
  });

  it('con una obligatoria sin marcar no llama al backend: la cuenta no existe sin aceptar', async () => {
    const r = await completarRegistroGoogle(TOKEN, { ...ACEPTA, aceptaAvisoPrivacidad: false }, fetchMock);
    expect(r).toEqual({ ok: false, motivo: 'casillas', mensaje: MENSAJES_CASILLA_OBLIGATORIA.aceptaAvisoPrivacidad });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401: enlace vencido (para volver a entrar con Google)', async () => {
    responder(401, { statusCode: 401, message: MENSAJE_ENLACE_VENCIDO });
    expect(await completarRegistroGoogle(TOKEN, ACEPTA, fetchMock)).toEqual({ ok: false, motivo: 'enlace_vencido', mensaje: MENSAJE_ENLACE_VENCIDO });
  });

  it('401 sin cuerpo usa el mismo mensaje del contrato', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    expect(await completarRegistroGoogle(TOKEN, ACEPTA, fetchMock)).toMatchObject({ motivo: 'enlace_vencido', mensaje: MENSAJE_ENLACE_VENCIDO });
  });

  it('409: cuenta existente (para ir a iniciar sesión)', async () => {
    responder(409, { statusCode: 409, message: MENSAJE_CUENTA_EXISTENTE });
    expect(await completarRegistroGoogle(TOKEN, ACEPTA, fetchMock)).toEqual({ ok: false, motivo: 'cuenta_existente', mensaje: MENSAJE_CUENTA_EXISTENTE });
  });

  it('400: muestra el mensaje del backend sobre las casillas o el documento', async () => {
    responder(400, { statusCode: 400, message: 'Debes aceptar los términos y condiciones' });
    expect(await completarRegistroGoogle(TOKEN, ACEPTA, fetchMock)).toEqual({ ok: false, motivo: 'casillas', mensaje: 'Debes aceptar los términos y condiciones' });
  });

  it('400 de validación con errores por campo: junta los mensajes', async () => {
    responder(400, { message: 'Revisa los campos del formulario', errors: { aceptaTerminos: 'Debes aceptar los términos y condiciones' } });
    expect(await completarRegistroGoogle(TOKEN, ACEPTA, fetchMock)).toMatchObject({ motivo: 'casillas', mensaje: 'Debes aceptar los términos y condiciones' });
  });

  it('429 y 5xx: mensaje claro sin el cuerpo crudo', async () => {
    responder(429, { message: 'Demasiadas solicitudes' });
    expect(await completarRegistroGoogle(TOKEN, ACEPTA, fetchMock)).toMatchObject({ ok: false, motivo: 'limite' });
    fetchMock.mockResolvedValueOnce(new Response('<html>502 Bad Gateway</html>', { status: 502 }));
    const r = await completarRegistroGoogle(TOKEN, ACEPTA, fetchMock);
    expect(r).toMatchObject({ ok: false, motivo: 'error' });
    expect(r.ok ? '' : r.mensaje).not.toContain('<html>');
  });

  it('sin red: mensaje de conexión', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await completarRegistroGoogle(TOKEN, ACEPTA, fetchMock)).toMatchObject({ ok: false, motivo: 'error', mensaje: expect.stringMatching(/conexión/) });
  });
});

describe('Sesión después de aceptar (igual que /auth/callback)', () => {
  it('marca la sesión, pide /auth/me y guarda el usuario con mergePerfilEnLocalStorage (sin datos de salud)', async () => {
    const perfil = { id: 'u-1', nombre: 'Ana', email: 'ana@gmail.com', alergias: 'Látex' };
    getProfile.mockResolvedValueOnce({ success: true, data: perfil });
    expect(await iniciarSesionTrasCompletar(600)).toBe(true);
    expect(markSessionStart).toHaveBeenCalledWith(600);
    expect(mergePerfilEnLocalStorage).toHaveBeenCalledWith(perfil);
  });

  it('si /auth/me falla devuelve false para pedir que inicie sesión', async () => {
    getProfile.mockResolvedValueOnce({ success: false, status: 500 });
    expect(await iniciarSesionTrasCompletar(600)).toBe(false);
    expect(mergePerfilEnLocalStorage).not.toHaveBeenCalled();
  });
});

describe('Página /auth/completar-registro', () => {
  const fuente = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

  it('usa las mismas tres casillas del registro y la lógica probada', () => {
    expect(fuente).toContain('<CasillasAlta');
    expect(fuente).toContain('completarRegistroGoogle(');
    // estadoTrasCompletar inicia la sesión web con iniciarSesionTrasCompletar (probado arriba), salvo con token de la app.
    expect(fuente).toContain('estadoTrasCompletar(r)');
  });

  it('401 ofrece volver a entrar con Google y 409 enlaza a iniciar sesión', () => {
    expect(fuente).toMatch(/enlace_vencido[\s\S]*loginWithGoogle\(\)/);
    expect(fuente).toMatch(/cuenta_existente[\s\S]*href="\/login"/);
  });
});
