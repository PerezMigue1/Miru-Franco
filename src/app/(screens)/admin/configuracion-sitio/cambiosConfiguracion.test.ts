import { describe, expect, it } from 'vitest';
import { CONFIGURACION_POR_OMISION } from '../../../services/configuracionSitio';
import { PLAZOS_TERMINOS } from '../../../utils/terminosCondiciones';
import {
  alternarClave,
  cambiosDePermisos,
  cambiosDeSeccion,
  esCampoLegal,
  explicacionAnticipos,
  mover,
  PLAZOS_SOLO_LECTURA,
  quitar,
  valorInicial,
} from './cambiosConfiguracion';

const base = CONFIGURACION_POR_OMISION;

describe('Valor inicial de cada sección', () => {
  it('sin fila guardada usa los valores de hoy', () => {
    expect(valorInicial('salon', undefined)).toEqual(base.salon);
    expect(valorInicial('horario', null)).toEqual(base.horario);
    expect(valorInicial('contenido_inicio', undefined)).toEqual(base.contenido.inicio);
    expect(valorInicial('contenido_sobre_nosotros', undefined)).toEqual(base.contenido.sobreNosotros);
    expect(valorInicial('contenido_contacto', undefined)).toEqual(base.contenido.contacto);
    expect(valorInicial('redes', undefined)).toEqual(base.redes);
    expect(valorInicial('reglas', undefined)).toEqual({ anticiposDesde: null });
  });
  it('lo guardado manda; lo que falta o no es del tipo se completa', () => {
    const v = valorInicial('salon', { nombre: 'Otro', telefono: 5 }) as typeof base.salon;
    expect(v.nombre).toBe('Otro');
    expect(v.telefono).toBe(base.salon.telefono);
    expect(valorInicial('reglas', { anticiposDesde: '2026-11-01' })).toEqual({ anticiposDesde: '2026-11-01' });
    expect((valorInicial('contenido_sobre_nosotros', { valores: [] }) as typeof base.contenido.sobreNosotros).valores).toEqual([]);
  });
});

describe('Qué cambió (historial y confirmación)', () => {
  it('campos de texto con su nombre visible, valor anterior y nuevo', () => {
    expect(cambiosDeSeccion('salon', base.salon, { ...base.salon, telefono: '+52 771 000 0000', mapaUrl: 'https://maps.app.goo.gl/x' })).toEqual([
      { campo: 'Teléfono', antes: '+52 771 268 1432', despues: '+52 771 000 0000' },
      { campo: 'Enlace del mapa', antes: '(vacío)', despues: 'https://maps.app.goo.gl/x' },
    ]);
  });
  it('sin cambios: lista vacía', () => {
    expect(cambiosDeSeccion('salon', base.salon, { ...base.salon })).toEqual([]);
  });
  it('primera vez (valor anterior null): compara contra vacío', () => {
    const c = cambiosDeSeccion('contenido_contacto', null, base.contenido.contacto);
    expect(c).toHaveLength(2);
    expect(c[0].antes).toBe('(sin dato)');
  });
  it('horario: por día, legible', () => {
    const nuevo = { dias: base.horario.dias.map((d) => (d.dia === 'lunes' ? { ...d, cerrado: true, abre: '', cierra: '' } : d)) };
    expect(cambiosDeSeccion('horario', base.horario, nuevo)).toEqual([{ campo: 'Lunes', antes: '9:30 a 19:30 h', despues: 'Cerrado' }]);
  });
  it('párrafos y valores por posición', () => {
    const s = base.contenido.sobreNosotros;
    const c = cambiosDeSeccion('contenido_sobre_nosotros', s, { ...s, parrafos: [s.parrafos[0]], valores: [{ titulo: 'Nuevo', descripcion: 'D' }, ...s.valores.slice(1)] });
    expect(c).toEqual([
      { campo: 'Párrafo 2', antes: s.parrafos[1], despues: '(no existe)' },
      { campo: 'Párrafo 3', antes: s.parrafos[2], despues: '(no existe)' },
      { campo: 'Valor 1', antes: `${s.valores[0].titulo}: ${s.valores[0].descripcion}`, despues: 'Nuevo: D' },
    ]);
  });
  it('reglas: la fecha o "variable del servidor"', () => {
    expect(cambiosDeSeccion('reglas', { anticiposDesde: null }, { anticiposDesde: '2026-11-01' })).toEqual([
      { campo: 'Inicio de los anticipos', antes: 'Variable del servidor', despues: '1 de noviembre de 2026' },
    ]);
  });
});

describe('Permisos: claves agregadas y quitadas', () => {
  const catalogo = [
    { clave: 'citas:asignadas', descripcion: 'Ver las citas asignadas', grupo: 'Citas' },
    { clave: 'caja:lectura', descripcion: 'Caja: consultar', grupo: 'Ventas y caja' },
  ];
  it('con su descripción del catálogo (o la clave si no está)', () => {
    expect(cambiosDePermisos(['citas:asignadas', 'otra:clave'], ['caja:lectura', 'otra:clave'], catalogo)).toEqual({
      agregadas: [{ clave: 'caja:lectura', descripcion: 'Caja: consultar' }],
      quitadas: [{ clave: 'citas:asignadas', descripcion: 'Ver las citas asignadas' }],
    });
    expect(cambiosDePermisos(null, ['x:y'], catalogo).agregadas).toEqual([{ clave: 'x:y', descripcion: 'x:y' }]);
  });
  it('marcar y desmarcar una casilla', () => {
    expect(alternarClave(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(alternarClave(['a', 'b'], 'a', false)).toEqual(['b']);
    expect(alternarClave(['a'], 'a', true)).toEqual(['a']);
  });
});

describe('Listas: reordenar y quitar', () => {
  it('mover arriba y abajo, sin salirse', () => {
    expect(mover(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(mover(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(mover(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(quitar(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });
});

describe('Campos que aparecen en los documentos legales', () => {
  const campos = { salon: ['nombre', 'correoPrivacidad'], horario: ['dias'] };
  it('según camposEnDocumentosLegales del backend', () => {
    expect(esCampoLegal(campos, 'salon', 'nombre')).toBe(true);
    expect(esCampoLegal(campos, 'salon', 'correoContacto')).toBe(false);
    expect(esCampoLegal(campos, 'horario', 'dias')).toBe(true);
    expect(esCampoLegal(undefined, 'salon', 'nombre')).toBe(false);
  });
});

describe('Reglas de anticipos: qué pasa en cada caso', () => {
  it('con fecha propia', () => {
    expect(explicacionAnticipos('2026-11-01', '2026-10-01')).toMatch(/1 de noviembre de 2026/);
  });
  it('sin fecha propia, con variable del servidor', () => {
    const t = explicacionAnticipos(null, '2026-10-01');
    expect(t).toMatch(/variable del servidor/);
    expect(t).toMatch(/1 de octubre de 2026/);
  });
  it('sin ninguna: el sitio no pide ni promete anticipos', () => {
    expect(explicacionAnticipos(null, null)).toMatch(/no pide ni promete anticipos/);
  });
  it('los plazos de los Términos se muestran de solo lectura con sus valores', () => {
    const textos = PLAZOS_SOLO_LECTURA.map((p) => p.valor).join(' ');
    expect(textos).toContain(`${PLAZOS_TERMINOS.horasAnticipoCita} horas`);
    expect(textos).toContain(`${PLAZOS_TERMINOS.minutosAntesPagoSalon} minutos`);
    expect(textos).toContain(`${PLAZOS_TERMINOS.minutosToleranciaCita} minutos`);
    expect(PLAZOS_SOLO_LECTURA.length).toBeGreaterThanOrEqual(6);
  });
});
