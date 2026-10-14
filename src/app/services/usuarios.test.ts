import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(async () => ({ data: [] })),
  post: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async (_ruta, body) => ({
    usuario: { id: 'u1', ...(body as object) },
  })),
}));
vi.mock('./client', () => ({ apiClient: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  createUsuario,
  getUsuarioDatosRelacionados,
  TIPOS_CABELLO,
  validarAltaUsuario,
  telefonoEdicionUsuario,
  opcionesRolEdicion,
} from './usuarios';

afterEach(() => { get.mockClear(); post.mockClear(); });

const ALTA_VALIDA = {
  nombre: 'Ana Pérez',
  email: 'ana@salon.mx',
  password: 'Miru#Fr4nco!',
  telefono: '7711234567',
  fechaNacimiento: '1994-05-10',
  pregunta: '¿Cuál es el nombre de tu primera mascota?',
  respuesta: 'Firulais',
  tipoCabello: 'ondulado',
  aceptaAviso: true,
};

describe('Alta de usuario desde admin: no se inventan datos', () => {
  it('sin pregunta de seguridad no manda pregunta ni respuesta por defecto', async () => {
    await createUsuario({ nombre: 'Ana', email: 'ana@salon.mx', password: 'Miru#Fr4nco!' });
    const cuerpo = post.mock.calls[0][1] as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty('preguntaSeguridad');
    expect(JSON.stringify(cuerpo)).not.toContain('Por definir');
  });

  it('no inventa fecha de nacimiento, teléfono, tipo de cabello ni aceptación del aviso', async () => {
    await createUsuario({ nombre: 'Ana', email: 'ana@salon.mx', password: 'Miru#Fr4nco!' });
    const cuerpo = post.mock.calls[0][1] as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty('fechaNacimiento');
    expect(cuerpo).not.toHaveProperty('telefono');
    expect(cuerpo).not.toHaveProperty('perfilCapilar');
    expect(cuerpo).not.toHaveProperty('aceptaAvisoPrivacidad');
  });

  it('manda tal cual lo que el admin capturó', async () => {
    await createUsuario({
      nombre: 'Ana',
      email: 'ana@salon.mx',
      password: 'Miru#Fr4nco!',
      telefono: '7711234567',
      fechaNacimiento: '1994-05-10',
      preguntaSeguridad: { pregunta: '¿Mascota?', respuesta: 'Firulais' },
      perfilCapilar: { tipoCabello: 'rizado', tieneAlergias: false, tratamientosQuimicos: false },
      aceptaAvisoPrivacidad: false,
    });
    const cuerpo = post.mock.calls[0][1] as Record<string, unknown>;
    expect(cuerpo).toMatchObject({
      telefono: '7711234567',
      fechaNacimiento: '1994-05-10T00:00:00.000Z',
      preguntaSeguridad: { pregunta: '¿Mascota?', respuesta: 'Firulais' },
      perfilCapilar: { tipoCabello: 'rizado' },
      aceptaAvisoPrivacidad: false,
    });
  });
});

describe('Validación del formulario de alta', () => {
  it('con todo capturado no hay error', () => {
    expect(validarAltaUsuario(ALTA_VALIDA)).toBeNull();
  });

  it('la pregunta de seguridad es opcional, pero si se elige pide su respuesta (y al revés)', () => {
    expect(validarAltaUsuario({ ...ALTA_VALIDA, pregunta: '', respuesta: '' })).toBeNull();
    expect(validarAltaUsuario({ ...ALTA_VALIDA, respuesta: '  ' })).toMatch(/respuesta/i);
    expect(validarAltaUsuario({ ...ALTA_VALIDA, pregunta: '' })).toMatch(/pregunta de seguridad/i);
  });

  it('pide que la persona haya aceptado el aviso de privacidad (el backend lo exige)', () => {
    expect(validarAltaUsuario({ ...ALTA_VALIDA, aceptaAviso: false })).toMatch(/aviso de privacidad/i);
  });

  it('pide teléfono válido, fecha de nacimiento y tipo de cabello', () => {
    expect(validarAltaUsuario({ ...ALTA_VALIDA, telefono: '' })).toMatch(/teléfono/i);
    expect(validarAltaUsuario({ ...ALTA_VALIDA, telefono: '12345' })).toMatch(/10 dígitos/);
    expect(validarAltaUsuario({ ...ALTA_VALIDA, fechaNacimiento: '' })).toMatch(/fecha de nacimiento/i);
    expect(validarAltaUsuario({ ...ALTA_VALIDA, tipoCabello: '' })).toMatch(/tipo de cabello/i);
  });

  it('valida la contraseña igual que el registro: 8 caracteres, mayúscula, minúscula, número y especial', () => {
    expect(validarAltaUsuario({ ...ALTA_VALIDA, password: 'Ab1!xz' })).toMatch(/8 caracteres/);
    expect(validarAltaUsuario({ ...ALTA_VALIDA, password: 'miru#fr4nco!' })).toMatch(/mayúscula/);
    expect(validarAltaUsuario({ ...ALTA_VALIDA, password: 'MiruFr4ncoX' })).toMatch(/carácter especial/);
  });

  it('el tipo de cabello solo ofrece los del backend (sin "afro")', () => {
    expect(TIPOS_CABELLO.map((t) => t.value)).toEqual(['liso', 'ondulado', 'rizado']);
    expect(validarAltaUsuario({ ...ALTA_VALIDA, tipoCabello: 'afro' })).toMatch(/tipo de cabello/i);
  });
});

describe('Edición de usuario: opciones de rol', () => {
  it('incluye cliente para que una clienta no aparezca como Admin', () => {
    const valores = opcionesRolEdicion([]).map((o) => o.value);
    expect(valores).toContain('cliente');
  });

  it('con catálogo del backend también incluye cliente', () => {
    const opciones = opcionesRolEdicion([
      { id: 1, valor: 'cliente', nombre: 'Cliente', descripcion: '', permisos: '' },
      { id: 2, valor: 'admin', nombre: 'Administrador', descripcion: '', permisos: '' },
    ]);
    expect(opciones.map((o) => o.value)).toEqual(['cliente', 'admin']);
  });
});

describe('Datos relacionados de la ficha de cliente', () => {
  it('no pide /api/pedidos: las compras ya salen del historial de compras', async () => {
    await getUsuarioDatosRelacionados('u1');
    const rutas = get.mock.calls.map((c) => c[0]);
    expect(rutas.some((r) => r.startsWith('/api/pedidos'))).toBe(false);
  });
});

describe('Edición de usuario desde admin: teléfono', () => {
  it('se guarda sin lada ni espacios (el backend exige 10 dígitos)', () => {
    expect(telefonoEdicionUsuario('55 1234 5678')).toEqual({ telefono: '5512345678' });
    expect(telefonoEdicionUsuario('+52 771 123 4567')).toEqual({ telefono: '7711234567' });
  });

  it('vacío se guarda como null', () => {
    expect(telefonoEdicionUsuario('   ')).toEqual({ telefono: null });
  });

  it('un teléfono que no es de 10 dígitos da el mensaje de formato, sin enviarse', () => {
    expect(telefonoEdicionUsuario('Por definir')).toEqual({ error: expect.stringMatching(/10 dígitos/) });
    expect(telefonoEdicionUsuario('12345')).toEqual({ error: expect.stringMatching(/10 dígitos/) });
  });
});
