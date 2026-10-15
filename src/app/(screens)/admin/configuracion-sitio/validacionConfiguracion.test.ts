import { describe, expect, it } from 'vitest';
import { CONFIGURACION_POR_OMISION, type HorarioDia } from '../../../services/configuracionSitio';
import {
  CAMPOS_SALON,
  mensajesDelServidor,
  prepararValor,
  repartirErroresServidor,
  validarContacto,
  validarHorario,
  validarInicio,
  validarRedes,
  validarReglas,
  validarSalon,
  validarSeccion,
  validarSobreNosotros,
} from './validacionConfiguracion';

const base = CONFIGURACION_POR_OMISION;
const dias = (cambios: Partial<Record<string, Partial<HorarioDia>>>): HorarioDia[] =>
  base.horario.dias.map((d) => ({ ...d, ...(cambios[d.dia] ?? {}) }));

describe('Datos del salón: mismos límites que el backend', () => {
  it('los valores de hoy son válidos', () => {
    expect(validarSalon(base.salon)).toEqual({});
  });

  it('obligatorios vacíos, código postal de 5 dígitos, teléfonos y correos', () => {
    const e = validarSalon({ ...base.salon, nombre: '  ', codigoPostal: '4300', telefono: '123', correoContacto: 'no-es-correo', correoPrivacidad: '' });
    expect(e.nombre).toBe('Escribe el nombre del salón.');
    expect(e.codigoPostal).toBe('El código postal tiene 5 dígitos.');
    expect(e.telefono).toMatch(/al menos 10 dígitos/);
    expect(e.correoContacto).toBe('El correo de contacto no es válido.');
    expect(e.correoPrivacidad).toBe('Escribe el correo de privacidad y quejas.');
  });

  it('WhatsApp y mapa son opcionales, pero si se escriben deben ser válidos', () => {
    expect(validarSalon({ ...base.salon, whatsapp: '', mapaUrl: '' })).toEqual({});
    expect(validarSalon({ ...base.salon, mapaUrl: 'https://maps.app.goo.gl/abc' })).toEqual({});
    expect(validarSalon({ ...base.salon, mapaUrl: 'http://maps.google.com/x' }).mapaUrl).toMatch(/Google Maps/);
    expect(validarSalon({ ...base.salon, mapaUrl: 'https://example.com/maps' }).mapaUrl).toMatch(/Google Maps/);
  });

  it('largo máximo por campo (lema y descripción hasta 300)', () => {
    expect(validarSalon({ ...base.salon, lema: 'a'.repeat(301) }).lema).toBe('El lema del pie de página tiene como máximo 300 caracteres.');
    expect(validarSalon({ ...base.salon, lema: 'a'.repeat(300) }).lema).toBeUndefined();
    expect(CAMPOS_SALON.descripcionSeo.max).toBe(300);
  });

  it('el correo de contacto y el de privacidad se explican como campos distintos', () => {
    expect(CAMPOS_SALON.correoContacto.ayuda).toMatch(/pie de página/);
    expect(CAMPOS_SALON.correoPrivacidad.ayuda).toMatch(/documentos legales/);
  });
});

describe('Redes: vacío o https del dominio de cada red', () => {
  it('acepta vacío y el dominio correcto', () => {
    expect(validarRedes({ instagram: '', facebook: 'https://facebook.com/miru', tiktok: 'https://www.tiktok.com/@miru', twitter: 'https://x.com/miru' })).toEqual({});
  });
  it('rechaza otro dominio o http', () => {
    const e = validarRedes({ instagram: 'https://facebook.com/miru', facebook: 'http://facebook.com/miru', tiktok: '', twitter: '' });
    expect(e.instagram).toBe('El enlace de Instagram debe ser de Instagram y empezar con https://.');
    expect(e.facebook).toMatch(/Facebook/);
  });
});

describe('Horario: validación en vivo junto a cada día', () => {
  it('el horario de hoy es válido', () => {
    expect(validarHorario(base.horario.dias)).toEqual({});
  });
  it('la apertura debe ser antes del cierre (error en el renglón del día)', () => {
    const e = validarHorario(dias({ martes: { abre: '19:30', cierra: '09:30' } }));
    expect(e['dias.1']).toBe('El martes debe abrir antes de cerrar.');
    expect(validarHorario(dias({ martes: { abre: '10:00', cierra: '10:00' } }))['dias.1']).toBe('El martes debe abrir antes de cerrar.');
  });
  it('un día abierto sin horas pide la hora', () => {
    expect(validarHorario(dias({ miercoles: { abre: '' } }))['dias.2']).toBe('Escribe la hora de apertura del miércoles.');
    expect(validarHorario(dias({ sabado: { cierra: '' } }))['dias.5']).toBe('Escribe la hora de cierre del sábado.');
  });
  it('un día cerrado no se valida aunque tenga horas viejas', () => {
    expect(validarHorario(dias({ lunes: { cerrado: true, abre: '20:00', cierra: '08:00' } }))).toEqual({});
  });
  it('al menos un día abierto', () => {
    const todosCerrados = base.horario.dias.map((d) => ({ ...d, cerrado: true }));
    expect(validarHorario(todosCerrados).dias).toBe('El salón debe abrir al menos un día.');
  });
});

describe('Textos: límites del inicio, "Sobre nosotros" y contacto', () => {
  it('los textos de hoy son válidos', () => {
    expect(validarInicio(base.contenido.inicio)).toEqual({});
    expect(validarSobreNosotros(base.contenido.sobreNosotros)).toEqual({});
    expect(validarContacto(base.contenido.contacto)).toEqual({});
  });
  it('frase grande de la portada: máximo 40', () => {
    expect(validarInicio({ ...base.contenido.inicio, heroDestacado: 'a'.repeat(41) }).heroDestacado).toMatch(/40 caracteres/);
  });
  it('párrafos del inicio: de 1 a 4 y ninguno vacío', () => {
    expect(validarInicio({ ...base.contenido.inicio, sobreNosotrosParrafos: [] }).sobreNosotrosParrafos).toBe('Escribe entre 1 y 4 párrafos.');
    expect(validarInicio({ ...base.contenido.inicio, sobreNosotrosParrafos: ['a', 'b', 'c', 'd', 'e'] }).sobreNosotrosParrafos).toBe('Escribe entre 1 y 4 párrafos.');
    expect(validarInicio({ ...base.contenido.inicio, sobreNosotrosParrafos: ['a', ' '] })['sobreNosotrosParrafos.1']).toBe('Escribe el párrafo 2.');
    expect(validarInicio({ ...base.contenido.inicio, sobreNosotrosParrafos: ['a'.repeat(601)] })['sobreNosotrosParrafos.0']).toMatch(/600/);
  });
  it('imagen: vacía o de Cloudinary', () => {
    expect(validarInicio({ ...base.contenido.inicio, sobreNosotrosImagen: 'https://res.cloudinary.com/demo/image/upload/a.jpg' })).toEqual({});
    expect(validarInicio({ ...base.contenido.inicio, sobreNosotrosImagen: 'https://imgur.com/a.jpg' }).sobreNosotrosImagen).toMatch(/Subir foto/);
  });
  it('"Sobre nosotros": de 1 a 5 párrafos de hasta 800, hasta 6 valores con título (40) y descripción (200)', () => {
    const s = base.contenido.sobreNosotros;
    expect(validarSobreNosotros({ ...s, parrafos: Array(6).fill('x') }).parrafos).toBe('Escribe entre 1 y 5 párrafos.');
    expect(validarSobreNosotros({ ...s, parrafos: ['a'.repeat(801)] })['parrafos.0']).toMatch(/800/);
    expect(validarSobreNosotros({ ...s, valores: Array(7).fill({ titulo: 'a', descripcion: 'b' }) }).valores).toBe('Puedes poner hasta 6 valores.');
    const e = validarSobreNosotros({ ...s, valores: [{ titulo: '', descripcion: 'b'.repeat(201) }] });
    expect(e['valores.0.titulo']).toBe('Escribe el título del valor 1.');
    expect(e['valores.0.descripcion']).toMatch(/200/);
    expect(validarSobreNosotros({ ...s, valores: [] })).toEqual({});
  });
  it('contacto: introducción y texto de agenda obligatorios de hasta 300', () => {
    expect(validarContacto({ introduccion: '', agendaTexto: 'a'.repeat(301) })).toEqual({
      introduccion: 'Escribe la introducción de contacto.',
      agendaTexto: 'El texto de "Agenda en línea" tiene como máximo 300 caracteres.',
    });
  });
});

describe('Reglas: fecha de inicio de los anticipos', () => {
  it('null (variable del servidor) o una fecha válida', () => {
    expect(validarReglas({ anticiposDesde: null })).toEqual({});
    expect(validarReglas({ anticiposDesde: '2026-11-01' })).toEqual({});
    expect(validarReglas({ anticiposDesde: '2026-02-30' }).anticiposDesde).toMatch(/fecha válida/);
  });
  it('sin la variable del servidor hay que elegir la fecha (vacío no es lo mismo que la variable)', () => {
    expect(validarReglas({ anticiposDesde: '' }).anticiposDesde).toBe('Elige la fecha de inicio o marca "Usar la variable del servidor".');
  });
  it('el despachador valida por clave', () => {
    expect(validarSeccion('reglas', { anticiposDesde: 'x' }).anticiposDesde).toBeDefined();
    expect(validarSeccion('salon', base.salon)).toEqual({});
  });
});

describe('Armado del valor a enviar', () => {
  it('recorta espacios y manda solo los campos de la sección', () => {
    const v = prepararValor('salon', { ...base.salon, nombre: '  Mirú  ', extra: 'x' } as never) as Record<string, string>;
    expect(v.nombre).toBe('Mirú');
    expect(Object.keys(v)).toEqual(Object.keys(base.salon));
  });
  it('un día cerrado va con horas vacías', () => {
    const v = prepararValor('horario', { dias: dias({ lunes: { cerrado: true } }) }) as { dias: HorarioDia[] };
    expect(v.dias[0]).toEqual({ dia: 'lunes', cerrado: true, abre: '', cierra: '' });
    expect(v.dias[1]).toEqual(base.horario.dias[1]);
  });
  it('reglas: vacío se manda como null', () => {
    expect(prepararValor('reglas', { anticiposDesde: '' })).toEqual({ anticiposDesde: null });
    expect(prepararValor('reglas', { anticiposDesde: '2026-11-01' })).toEqual({ anticiposDesde: '2026-11-01' });
  });
  it('listas de párrafos y valores recortadas', () => {
    const v = prepararValor('contenido_sobre_nosotros', { titulo: ' T ', parrafos: [' a '], imagen: '', valores: [{ titulo: ' x ', descripcion: ' y ' }] });
    expect(v).toEqual({ titulo: 'T', parrafos: ['a'], imagen: '', valores: [{ titulo: 'x', descripcion: 'y' }] });
  });
});

describe('Errores 400 del backend', () => {
  it('lee la lista de mensajes del error del apiClient', () => {
    const e = Object.assign(new Error('x | y'), { status: 400, data: { message: ['Escribe el nombre del salón.', 'Otro'] } });
    expect(mensajesDelServidor(e)).toEqual(['Escribe el nombre del salón.', 'Otro']);
    expect(mensajesDelServidor(Object.assign(new Error('Uno solo'), { status: 400, data: { message: 'Uno solo' } }))).toEqual(['Uno solo']);
    expect(mensajesDelServidor(Object.assign(new Error('no'), { status: 500 }))).toBeNull();
  });

  it('reparte cada mensaje junto a su campo; lo que no se reconoce va arriba de la sección', () => {
    expect(
      repartirErroresServidor('salon', [
        'Escribe el nombre del salón.',
        'El WhatsApp debe tener al menos 10 dígitos (puede llevar +52).',
        'El teléfono debe tener al menos 10 dígitos (puede llevar +52).',
        'El correo de privacidad y quejas no es válido.',
        'Estos campos no se reconocen: x.',
      ]),
    ).toEqual({
      porCampo: {
        nombre: 'Escribe el nombre del salón.',
        whatsapp: 'El WhatsApp debe tener al menos 10 dígitos (puede llevar +52).',
        telefono: 'El teléfono debe tener al menos 10 dígitos (puede llevar +52).',
        correoPrivacidad: 'El correo de privacidad y quejas no es válido.',
      },
      generales: ['Estos campos no se reconocen: x.'],
    });
  });

  it('horario, listas y valores numerados', () => {
    expect(repartirErroresServidor('horario', ['El miércoles debe abrir antes de cerrar.', 'El salón debe abrir al menos un día.']).porCampo).toEqual({
      'dias.2': 'El miércoles debe abrir antes de cerrar.',
      dias: 'El salón debe abrir al menos un día.',
    });
    expect(repartirErroresServidor('contenido_inicio', ['Escribe el párrafos de "sobre nosotros" 2.']).porCampo).toEqual({
      'sobreNosotrosParrafos.1': 'Escribe el párrafos de "sobre nosotros" 2.',
    });
    expect(repartirErroresServidor('contenido_sobre_nosotros', ['Escribe el título del valor 3.', 'Escribe el título.']).porCampo).toEqual({
      'valores.2.titulo': 'Escribe el título del valor 3.',
      titulo: 'Escribe el título.',
    });
    expect(repartirErroresServidor('redes', ['El enlace de X (Twitter) debe ser de X (Twitter) y empezar con https://.']).porCampo.twitter).toBeDefined();
  });
});
