import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Entorno node: window y localStorage mínimos antes de importar el cliente real (fetch simulado).
const replace = vi.fn();
vi.stubGlobal('window', {
  location: { pathname: '/perfil', search: '', origin: 'http://localhost:3000', replace },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => true,
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
vi.mock('./config', () => ({
  getApiBaseUrl: () => 'http://api.test/api/auth',
  getBackendBaseUrl: () => 'http://api.test',
}));

let perfil: typeof import('./perfil');
beforeAll(async () => {
  perfil = await import('./perfil');
});

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const responder = (status: number, cuerpo: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status }));

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  fetchMock.mockReset();
  replace.mockReset();
  vi.restoreAllMocks();
});

describe('Cambio de correo: paso 1, solicitar el código', () => {
  it('dice si el backend mandó otro código al correo actual (cuenta sin contraseña)', async () => {
    responder(200, { success: true, message: 'Te enviamos un código a tu nuevo correo y otro a tu correo actual.', vigenciaMinutos: 15, codigoAlCorreoActual: true });
    await expect(perfil.solicitarCambioCorreo('nuevo@example.com')).resolves.toMatchObject({ codigoAlCorreoActual: true });
    responder(200, { success: true, message: 'Te enviamos un código a tu nuevo correo.', vigenciaMinutos: 15 });
    await expect(perfil.solicitarCambioCorreo('nuevo@example.com', undefined, 'clave')).resolves.toMatchObject({ codigoAlCorreoActual: false });
  });

  it('POST /api/auth/me/correo/solicitar con el correo nuevo y devuelve el aviso y la vigencia', async () => {
    responder(200, { success: true, message: 'Te enviamos un código a tu nuevo correo. Vence en 15 minutos.', vigenciaMinutos: 15 });
    const res = await perfil.solicitarCambioCorreo('  nuevo@example.com ', 'clienta@example.com');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/auth/me/correo/solicitar');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ correoNuevo: 'nuevo@example.com' });
    expect(res).toEqual({ mensaje: 'Te enviamos un código a tu nuevo correo. Vence en 15 minutos.', vigenciaMinutos: 15, codigoAlCorreoActual: false });
  });

  it('correo de otra cuenta (409): el mensaje del backend', async () => {
    responder(409, { message: 'Ese correo ya está registrado en otra cuenta.' });
    await expect(perfil.solicitarCambioCorreo('ocupado@example.com')).rejects.toThrow('Ese correo ya está registrado en otra cuenta.');
  });

  it('si el correo no se pudo enviar (502): mensaje claro, no el error genérico, y sin redirigir', async () => {
    responder(502, { message: 'No pudimos enviar el código a tu nuevo correo.', code: 'CORREO_NO_ENVIADO', referencia: 'AB12CD34' });
    await expect(perfil.solicitarCambioCorreo('nuevo@example.com')).rejects.toThrow(
      'No pudimos enviar el código a tu nuevo correo. Revisa que esté bien escrito o intenta de nuevo en unos minutos.',
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('valida antes de enviar: formato y distinto al actual', async () => {
    expect(perfil.validarCorreoNuevo('', 'a@example.com')).toBe('Escribe tu correo nuevo.');
    expect(perfil.validarCorreoNuevo('no-es-correo')).toBe('Escribe un correo válido.');
    expect(perfil.validarCorreoNuevo('CLIENTA@example.com', 'clienta@example.com')).toBe('El correo nuevo es igual al actual. Escribe uno distinto.');
    expect(perfil.validarCorreoNuevo('nuevo@example.com', 'clienta@example.com')).toBeNull();
    await expect(perfil.solicitarCambioCorreo('no-es-correo')).rejects.toThrow('Escribe un correo válido.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Cambio de correo: contraseña actual (contrato del backend)', () => {
  it('se manda como passwordActual en la solicitud del código', async () => {
    responder(200, { success: true, message: 'Te enviamos un código.', vigenciaMinutos: 15 });
    await perfil.solicitarCambioCorreo('nuevo@example.com', 'clienta@example.com', 'Miru#Fr4nco!');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ correoNuevo: 'nuevo@example.com', passwordActual: 'Miru#Fr4nco!' });
  });

  it('vacía (cuenta solo de Google) no se manda', async () => {
    responder(200, { success: true, message: 'Te enviamos un código.', vigenciaMinutos: 15 });
    await perfil.solicitarCambioCorreo('nuevo@example.com', 'clienta@example.com', '');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ correoNuevo: 'nuevo@example.com' });
  });

  it('400 por la contraseña: el mensaje del backend tal cual', async () => {
    responder(400, { message: 'La contraseña actual no es correcta.' });
    await expect(perfil.solicitarCambioCorreo('nuevo@example.com', undefined, 'otra')).rejects.toThrow('La contraseña actual no es correcta.');
  });

  it('el campo: obligatorio si la cuenta tiene contraseña, oculto si es solo de Google y con ayuda si no se sabe', () => {
    expect(perfil.campoPasswordCambioCorreo(true)).toEqual({ visible: true, obligatorio: true, ayuda: null });
    expect(perfil.campoPasswordCambioCorreo(false)).toEqual({ visible: false, obligatorio: false, ayuda: null });
    expect(perfil.campoPasswordCambioCorreo(null)).toEqual({ visible: true, obligatorio: false, ayuda: 'Si entras solo con Google, déjala vacía.' });
  });

  it('con contraseña, vacía no se envía y dice lo mismo que el backend', () => {
    expect(perfil.validarPasswordActualCambioCorreo('', true)).toBe('Escribe tu contraseña actual para cambiar tu correo.');
    expect(perfil.validarPasswordActualCambioCorreo('  ', true)).toBe('Escribe tu contraseña actual para cambiar tu correo.');
    expect(perfil.validarPasswordActualCambioCorreo('x', true)).toBeNull();
    expect(perfil.validarPasswordActualCambioCorreo('', null)).toBeNull();
    expect(perfil.validarPasswordActualCambioCorreo('', false)).toBeNull();
  });

  it('el campo del error se decide por el code del 400 (PASSWORD_ACTUAL_REQUERIDA / INCORRECTA) que llega del cliente real', async () => {
    responder(400, { message: 'La contraseña actual no es correcta.', code: 'PASSWORD_ACTUAL_INCORRECTA' });
    const err = await perfil.solicitarCambioCorreo('nuevo@example.com', undefined, 'otra').catch((e) => e);
    expect(perfil.campoDelErrorCambioCorreo(err)).toBe('password');
    responder(400, { message: 'Texto distinto', code: 'PASSWORD_ACTUAL_REQUERIDA' });
    const err2 = await perfil.solicitarCambioCorreo('nuevo@example.com').catch((e) => e);
    expect(perfil.campoDelErrorCambioCorreo(err2)).toBe('password');
    responder(409, { message: 'Ese correo ya está registrado en otra cuenta.' });
    const err3 = await perfil.solicitarCambioCorreo('ocupado@example.com').catch((e) => e);
    expect(perfil.campoDelErrorCambioCorreo(err3)).toBe('correo');
  });

  it('los errores de la contraseña van junto al campo de contraseña; los demás, junto al correo', () => {
    expect(perfil.campoDelErrorCambioCorreo('Escribe tu contraseña actual para cambiar tu correo.')).toBe('password');
    expect(perfil.campoDelErrorCambioCorreo('La contraseña actual no es correcta.')).toBe('password');
    expect(perfil.campoDelErrorCambioCorreo('Ese correo ya está registrado en otra cuenta.')).toBe('correo');
  });
});

describe('Cambio de correo: paso 2, confirmar con el código', () => {
  it('POST /api/auth/me/correo/confirmar con el código y devuelve el correo nuevo', async () => {
    responder(200, { success: true, message: 'Listo, tu correo cambió.', data: { email: 'nuevo@example.com' } });
    const correo = await perfil.confirmarCambioCorreo(' 004821 ');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/auth/me/correo/confirmar');
    expect(JSON.parse(String(init?.body))).toEqual({ codigo: '004821' });
    expect(correo).toBe('nuevo@example.com');
  });

  it('código incorrecto (400): el mensaje del backend con los intentos que quedan', async () => {
    responder(400, { message: 'El código no es correcto. Te quedan 4 intentos.', code: 'CODIGO_INCORRECTO' });
    await expect(perfil.confirmarCambioCorreo('111111')).rejects.toThrow('El código no es correcto. Te quedan 4 intentos.');
  });

  it('cuenta sin contraseña: manda también el código del correo actual', async () => {
    responder(200, { success: true, data: { email: 'nuevo@example.com' } });
    await perfil.confirmarCambioCorreo('004821', ' 739102 ');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ codigo: '004821', codigoActual: '739102' });
  });

  it('el código del correo actual también debe tener 6 dígitos (no se envía si no)', async () => {
    expect(perfil.validarCodigoCorreoActual('12')).toBe('El código de tu correo actual tiene 6 dígitos.');
    expect(perfil.validarCodigoCorreoActual('123456')).toBeNull();
    await expect(perfil.confirmarCambioCorreo('123456', '12')).rejects.toThrow('El código de tu correo actual tiene 6 dígitos.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('el código debe tener 6 dígitos (no se envía si no)', async () => {
    expect(perfil.validarCodigoCambioCorreo('12ab')).toBe('El código tiene 6 dígitos.');
    expect(perfil.validarCodigoCambioCorreo('123456')).toBeNull();
    await expect(perfil.confirmarCambioCorreo('12345')).rejects.toThrow('El código tiene 6 dígitos.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Perfil: "Modificar" del correo', () => {
  const dir = join(__dirname, '..', 'components', 'perfil');
  const perfilUi = readFileSync(join(dir, 'UserProfile.tsx'), 'utf8');
  const modal = readFileSync(join(dir, 'CambioCorreoModal.tsx'), 'utf8');

  it('abre el modal de cambio de correo en vez de llevar a /forgot-password', () => {
    expect(perfilUi).not.toMatch(/fila\.modificar === 'correo'\s*\?\s*router\.push\('\/forgot-password'\)/);
    expect(perfilUi).toMatch(/<CambioCorreoModal\s/);
  });

  it('el modal tiene dos pasos (correo nuevo y código) con carga y error', () => {
    expect(modal).toContain('solicitarCambioCorreo(');
    expect(modal).toContain('confirmarCambioCorreo(');
    expect(modal).toContain('<Modal');
    expect(modal).toMatch(/Enviando…/);
    expect(modal).toMatch(/Confirmando…/);
    expect(modal).toMatch(/error=\{/);
  });
});
