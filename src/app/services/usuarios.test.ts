import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  cuerpoPromocionesPanel,
  getUsuarioDatosRelacionados,
  TIPOS_CABELLO,
  validarAltaUsuario,
  erroresCamposAlta,
  erroresConsentimientoAlta,
  MENSAJE_FALTA_TERMINOS_ALTA,
  NOTA_PROMOCIONES_PANEL,
  perfilCapilarAlta,
  telefonoEdicionUsuario,
  opcionesRolEdicion,
  rutaOrigenEdicion,
} from './usuarios';
import { documentosAceptados } from './consentimientos';

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
  aceptaTerminos: true,
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

describe('Alta desde admin: perfil capilar solo con lo capturado (minimización)', () => {
  it('sin nada capturado no hay perfil capilar', () => {
    expect(perfilCapilarAlta({ tipoCabello: '', tieneAlergias: false, alergias: '', tratamientosQuimicos: false, tratamientos: '' })).toBeUndefined();
  });

  it('las alergias viajan aunque no se elija tipo de cabello, y no se manda un tipo vacío ni booleanos sin marcar', () => {
    expect(perfilCapilarAlta({ tipoCabello: '', tieneAlergias: true, alergias: '  Látex ', tratamientosQuimicos: false, tratamientos: '' })).toEqual({
      tieneAlergias: true,
      alergias: 'Látex',
    });
  });

  it('las alergias escritas solo cuentan con "Tiene alergias" marcada; los tratamientos con su casilla', () => {
    expect(perfilCapilarAlta({ tipoCabello: 'rizado', tieneAlergias: false, alergias: 'Látex', tratamientosQuimicos: true, tratamientos: ' Alaciado ' })).toEqual({
      tipoCabello: 'rizado',
      tratamientosQuimicos: true,
      tratamientos: 'Alaciado',
    });
  });

  it('createUsuario tampoco manda un tipo de cabello vacío ni descarta las alergias', async () => {
    await createUsuario({
      nombre: 'Ana', email: 'ana@salon.mx', password: 'Miru#Fr4nco!',
      perfilCapilar: { tipoCabello: '', tieneAlergias: true, alergias: 'Látex', tratamientosQuimicos: false },
      consienteDatosSensibles: true,
    });
    const cuerpo = post.mock.calls[0][1] as { perfilCapilar?: Record<string, unknown>; consienteDatosSensibles?: boolean };
    expect(cuerpo.perfilCapilar).toEqual({ tieneAlergias: true, alergias: 'Látex' });
    expect(cuerpo.consienteDatosSensibles).toBe(true);
  });
});

describe('Promociones desde el panel: el personal solo puede quitarlas', () => {
  it('quitar (true → false) manda recibePromociones: false', () => {
    expect(cuerpoPromocionesPanel(true, false)).toEqual({ recibePromociones: false });
  });

  it('sin cambio no se manda nada, y nunca se manda true desde el panel', () => {
    expect(cuerpoPromocionesPanel(true, true)).toEqual({});
    expect(cuerpoPromocionesPanel(false, false)).toEqual({});
    expect(cuerpoPromocionesPanel(false, true)).toEqual({});
  });

  it('la nota explica que solo la persona puede activarlas', () => {
    expect(NOTA_PROMOCIONES_PANEL).toBe('Solo la persona puede activar las promociones, desde su perfil.');
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

  it('pide que la persona haya aceptado los Términos y condiciones (el backend ahora lo exige)', () => {
    expect(validarAltaUsuario({ ...ALTA_VALIDA, aceptaTerminos: false })).toBe(MENSAJE_FALTA_TERMINOS_ALTA);
    expect(MENSAJE_FALTA_TERMINOS_ALTA).toMatch(/Términos y condiciones/);
  });

  it('erroresConsentimientoAlta da el mensaje de cada casilla sin marcar, para mostrarlo junto a ella', () => {
    expect(erroresConsentimientoAlta({ aceptaTerminos: false, aceptaAviso: false })).toEqual({
      aceptaTerminos: MENSAJE_FALTA_TERMINOS_ALTA,
      aceptaAviso: expect.stringMatching(/aviso de privacidad/i),
    });
    expect(erroresConsentimientoAlta({ aceptaTerminos: true, aceptaAviso: true })).toEqual({});
  });

  it('pide teléfono válido; la fecha de nacimiento y el tipo de cabello son opcionales (minimización)', () => {
    expect(validarAltaUsuario({ ...ALTA_VALIDA, telefono: '' })).toMatch(/teléfono/i);
    expect(validarAltaUsuario({ ...ALTA_VALIDA, telefono: '12345' })).toMatch(/10 dígitos/);
    expect(validarAltaUsuario({ ...ALTA_VALIDA, fechaNacimiento: '' })).toBeNull();
    expect(validarAltaUsuario({ ...ALTA_VALIDA, tipoCabello: '' })).toBeNull();
    expect(validarAltaUsuario({ ...ALTA_VALIDA, fechaNacimiento: '', tipoCabello: '' })).toBeNull();
  });

  it('cada campo que falta queda marcado con su propio mensaje (además del aviso de arriba)', () => {
    expect(erroresCamposAlta({ ...ALTA_VALIDA, nombre: ' ', email: '', password: '' })).toEqual({
      nombre: 'Escribe el nombre completo.',
      email: 'Escribe el email.',
      password: 'Escribe la contraseña.',
    });
    expect(validarAltaUsuario({ ...ALTA_VALIDA, nombre: ' ', email: '', password: '' })).toBe('Nombre, email y contraseña son obligatorios.');
    expect(erroresCamposAlta({ ...ALTA_VALIDA, email: 'no-es-correo' })).toEqual({ email: 'Escribe un email válido.' });
    expect(erroresCamposAlta({ ...ALTA_VALIDA, telefono: '12345' }).telefono).toMatch(/10 dígitos/);
    expect(erroresCamposAlta({ ...ALTA_VALIDA, password: 'Ab1!xz' }).password).toMatch(/8 caracteres/);
    expect(erroresCamposAlta({ ...ALTA_VALIDA, respuesta: '' }).respuesta).toMatch(/respuesta/i);
    expect(erroresCamposAlta({ ...ALTA_VALIDA, pregunta: '' }).pregunta).toMatch(/pregunta de seguridad/i);
    expect(erroresCamposAlta(ALTA_VALIDA)).toEqual({});
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

describe('Alta desde admin: Términos y documentos aceptados (punto 23)', () => {
  it('createUsuario manda aceptaTerminos y los documentos con su versión y hash', async () => {
    const documentos = documentosAceptados(['terminos', 'aviso-privacidad']);
    await createUsuario({
      nombre: 'Ana',
      email: 'ana@salon.mx',
      password: 'Miru#Fr4nco!',
      aceptaTerminos: true,
      aceptaAvisoPrivacidad: true,
      documentos,
    });
    const cuerpo = post.mock.calls[0][1] as Record<string, unknown>;
    expect(cuerpo).toMatchObject({ aceptaTerminos: true, aceptaAvisoPrivacidad: true, documentos });
  });

  it('sin capturarlo no inventa la aceptación de los Términos', async () => {
    await createUsuario({ nombre: 'Ana', email: 'ana@salon.mx', password: 'Miru#Fr4nco!' });
    const cuerpo = post.mock.calls[0][1] as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty('aceptaTerminos');
    expect(cuerpo).not.toHaveProperty('documentos');
  });

  it('la pantalla nuevo usuario tiene la casilla de Términos sin premarcar, la valida y manda los documentos vigentes', () => {
    const pagina = readFileSync(join(__dirname, '..', '(screens)', 'admin', 'usuarios-roles', 'nuevo', 'page.tsx'), 'utf8');
    expect(pagina).toContain('La persona leyó y aceptó los');
    expect(pagina).toMatch(/const \[aceptaTerminos, setAceptaTerminos\] = useState\(false\)/);
    expect(pagina).toMatch(/validarAltaUsuario\(\{[^}]*aceptaTerminos/);
    expect(pagina).toContain("documentos: documentosAceptados(['terminos', 'aviso-privacidad'])");
    expect(pagina).toContain('aceptaTerminos,');
  });
});

describe('rutaOrigen de las ediciones del panel', () => {
  it('se manda tal cual y se recorta a 300 caracteres (límite del backend)', () => {
    expect(rutaOrigenEdicion('/admin/clientes-crm/abc/editar')).toBe('/admin/clientes-crm/abc/editar');
    expect(rutaOrigenEdicion('/' + 'x'.repeat(400))).toHaveLength(300);
  });
});
