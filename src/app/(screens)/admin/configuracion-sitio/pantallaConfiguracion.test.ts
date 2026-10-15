// Admin > Configuración del sitio: pintado de las piezas (vitest corre sin DOM: renderToStaticMarkup).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type FunctionComponent, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../components/layouts/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => children }));

const { CONFIGURACION_POR_OMISION, frasesHorario } = await import('../../../services/configuracionSitio');
const { CAMPOS_INICIO, CAMPOS_SALON } = await import('./validacionConfiguracion');
const { AVISO_CAMPO_LEGAL, AVISO_DOCUMENTOS_LEGALES, NOTA_PLAZOS_TERMINOS } = await import('./cambiosConfiguracion');
const piezas = await import('./piezas');
const { default: Pestanas } = await import('./Pestanas');
const { FormHorario, VistaPreviaHorario } = await import('./FormHorario');
const { FormSalon, FormRedes, VistaPreviaPie } = await import('./FormSalon');
const { FormInicio, FormSobreNosotros, FormContacto, VistaPreviaSobreNosotros } = await import('./FormTextos');
const { FormReglas, PlazosTerminos } = await import('./SeccionReglas');
const { default: SeccionPermisos } = await import('./SeccionPermisos');
const { default: EditorSeccion } = await import('./EditorSeccion');
const { EntradaHistorialVista } = await import('./HistorialSeccion');
const { default: ConfiguracionSitioPage } = await import('./page');

const base = CONFIGURACION_POR_OMISION;
const nada = () => undefined;
const pintar = (tipo: unknown, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(tipo as FunctionComponent<Record<string, unknown>>, props));
const CAMPOS_LEGALES = { salon: ['nombre', 'responsable', 'direccion', 'ciudad', 'codigoPostal', 'telefono', 'whatsapp', 'correoPrivacidad'], horario: ['dias'] };

describe('Campo de configuración', () => {
  it('etiqueta vinculada, contador de caracteres y ayuda descritos por el campo', () => {
    const html = pintar(piezas.CampoConfig, { id: 'c-hero', def: CAMPOS_INICIO.heroDestacado, valor: 'Brillo', onCambiar: nada });
    expect(html).toContain('<label for="c-hero"');
    expect(html).toContain('6/40');
    expect(html).toMatch(/<input[^>]*id="c-hero"[^>]*aria-describedby="[^"]*c-hero-contador/);
  });
  it('pasado el máximo, el contador lo dice y el error se anuncia junto al campo', () => {
    const html = pintar(piezas.CampoConfig, { id: 'c-hero', def: CAMPOS_INICIO.heroDestacado, valor: 'a'.repeat(41), onCambiar: nada, error: 'Demasiado largo.' });
    expect(html).toContain('41/40');
    expect(html).toMatch(/role="alert"[^>]*>Demasiado largo\./);
    expect(html).toContain('aria-invalid="true"');
  });
  it('los campos de los documentos legales llevan el aviso visible', () => {
    const html = pintar(piezas.CampoConfig, { id: 'c-nombre', def: CAMPOS_SALON.nombre, valor: 'x', onCambiar: nada, legal: true });
    expect(html).toContain(AVISO_CAMPO_LEGAL);
    expect(pintar(piezas.CampoConfig, { id: 'c-lema', def: CAMPOS_SALON.lema, valor: 'x', onCambiar: nada })).not.toContain(AVISO_CAMPO_LEGAL);
  });
});

describe('Datos del salón y redes', () => {
  it('todos los campos; aviso legal solo en los que salen en los documentos', () => {
    const html = pintar(FormSalon, { valor: base.salon, errores: {}, onCambiar: nada, camposLegales: CAMPOS_LEGALES });
    for (const def of Object.values(CAMPOS_SALON)) expect(html).toContain(def.titulo.replace(/"/g, '&quot;'));
    expect(html.split(AVISO_CAMPO_LEGAL).length - 1).toBe(8);
    expect(html).toContain(CAMPOS_SALON.correoContacto.ayuda);
    expect(html).toContain(CAMPOS_SALON.correoPrivacidad.ayuda);
  });
  it('vista previa del bloque de contacto del pie', () => {
    const html = pintar(VistaPreviaPie, { salon: { ...base.salon, correoContacto: 'hola@ejemplo.mx' }, dias: base.horario.dias });
    expect(html).toContain('hola@ejemplo.mx');
    expect(html).toContain('Segunda Cerrada de Allende No. 15, Col. Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000');
    for (const f of frasesHorario(base.horario.dias)) expect(html).toContain(f);
  });
  it('redes: los cuatro enlaces', () => {
    const html = pintar(FormRedes, { valor: base.redes, errores: { tiktok: 'Mal enlace.' }, onCambiar: nada });
    for (const r of ['Instagram', 'Facebook', 'TikTok', 'X (Twitter)']) expect(html).toContain(r);
    expect(html).toContain('Mal enlace.');
  });
});

describe('Horario', () => {
  it('un renglón por día con casilla "Cerrado" y horas de tipo time', () => {
    const html = pintar(FormHorario, { dias: base.horario.dias, errores: {}, onCambiar: nada, legal: true });
    expect(html.match(/type="checkbox"/g)).toHaveLength(7);
    expect(html.match(/type="time"/g)).toHaveLength(14);
    expect(html.split('>Cerrado<').length - 1).toBe(7);
    expect(html).toContain(AVISO_CAMPO_LEGAL);
  });
  it('el error se muestra en el renglón del día y el de "al menos un día" arriba', () => {
    const html = pintar(FormHorario, { dias: base.horario.dias, errores: { 'dias.1': 'El martes debe abrir antes de cerrar.', dias: 'El salón debe abrir al menos un día.' }, onCambiar: nada });
    expect(html).toMatch(/role="alert"[^>]*>El martes debe abrir antes de cerrar\./);
    expect(html).toMatch(/role="alert"[^>]*>El salón debe abrir al menos un día\./);
  });
  it('el día cerrado deshabilita sus horas', () => {
    const html = pintar(FormHorario, { dias: base.horario.dias, errores: {}, onCambiar: nada });
    const domingo = html.slice(html.indexOf('Domingo'));
    expect(domingo).toMatch(/type="time"[^>]*disabled/);
  });
  it('vista previa con las frases del sitio; con errores pide corregir', () => {
    expect(pintar(VistaPreviaHorario, { dias: base.horario.dias, errores: {} })).toContain('Lunes a viernes de 9:30 a 19:30 h.');
    expect(pintar(VistaPreviaHorario, { dias: base.horario.dias, errores: { dias: 'x' } })).toContain('Corrige el horario para ver la vista previa.');
  });
});

describe('Textos del inicio, "Sobre nosotros" y contacto', () => {
  it('inicio: contadores y párrafos con agregar, quitar y reordenar', () => {
    const html = pintar(FormInicio, { valor: base.contenido.inicio, errores: {}, onCambiar: nada });
    expect(html).toContain(`${base.contenido.inicio.heroDestacado.length}/40`);
    expect(html).toContain('Agregar párrafo');
    expect(html).toContain('aria-label="Subir párrafo 2"');
    expect(html).toContain('aria-label="Bajar párrafo 1"');
    expect(html).toContain('aria-label="Quitar párrafo 1"');
    expect(html).toMatch(/aria-label="Subir párrafo 1"[^>]*disabled/);
  });
  it('con el máximo de párrafos ya no se agregan', () => {
    const html = pintar(FormInicio, { valor: { ...base.contenido.inicio, sobreNosotrosParrafos: ['a', 'b', 'c', 'd'] }, errores: {}, onCambiar: nada });
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*(<svg[\s\S]*?<\/svg>)?\s*Agregar párrafo/);
  });
  it('"Sobre nosotros": valores con título y descripción; imagen con vista previa si es de Cloudinary', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/salon.jpg';
    const html = pintar(FormSobreNosotros, { valor: { ...base.contenido.sobreNosotros, imagen: url }, errores: {}, onCambiar: nada });
    expect(html).toContain('Agregar valor');
    expect(html).toContain('aria-label="Quitar valor 4"');
    expect(html).toContain(`src="${url}"`);
    // Con imagen: se puede cambiar o quitar; no hay campo para pegar una URL.
    expect(html).toContain('Cambiar foto');
    expect(html).toContain('Quitar foto');
    expect(html).not.toMatch(/type="url"/);
    expect(pintar(VistaPreviaSobreNosotros, { valor: base.contenido.sobreNosotros })).toContain(base.contenido.sobreNosotros.titulo);
  });
  it('contacto: introducción y agenda', () => {
    const html = pintar(FormContacto, { valor: base.contenido.contacto, errores: {}, onCambiar: nada });
    expect(html).toContain('Introducción de la página de contacto');
    expect(html).toContain('Agenda en línea');
  });
});

describe('Reglas de citas y anticipos', () => {
  it('fecha propia: input date y explicación', () => {
    const html = pintar(FormReglas, { valor: { anticiposDesde: '2026-11-01' }, respaldo: '2026-10-01', errores: {}, onCambiar: nada });
    expect(html).toMatch(/<input[^>]*type="date"[^>]*value="2026-11-01"/);
    expect(html).toContain('1 de noviembre de 2026');
  });
  it('"Usar la variable del servidor" muestra el valor de respaldo', () => {
    const html = pintar(FormReglas, { valor: { anticiposDesde: null }, respaldo: '2026-10-01', errores: {}, onCambiar: nada });
    expect(html).toContain('Usar la variable del servidor');
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
    expect(html).toContain('1 de octubre de 2026');
  });
  it('sin fecha ni variable: no se piden anticipos', () => {
    expect(pintar(FormReglas, { valor: { anticiposDesde: null }, respaldo: null, errores: {}, onCambiar: nada })).toContain('no pide ni promete anticipos');
  });
  it('los plazos de los Términos son de solo lectura, con su nota', () => {
    const html = pintar(PlazosTerminos);
    expect(html).toContain(NOTA_PLAZOS_TERMINOS);
    expect(html).not.toContain('<input');
  });
});

describe('Permisos por rol', () => {
  const datos = {
    catalogo: [
      { clave: 'citas:asignadas', descripcion: 'Ver las citas asignadas a sí misma', grupo: 'Citas' },
      { clave: 'caja:lectura', descripcion: 'Caja: consultar', grupo: 'Ventas y caja' },
    ],
    roles: [
      { rol: 'admin', editable: false, claves: ['*'] },
      { rol: 'estilista', editable: true, claves: ['citas:asignadas', 'otra:clave'] },
      { rol: 'empleado', editable: true, claves: [] },
      { rol: 'becario', editable: true, claves: [] },
    ],
  };
  it('admin bloqueado con "Todos los permisos (*)"; una pestaña por rol', () => {
    const html = pintar(SeccionPermisos, { datos, onGuardado: nada });
    expect(html).toContain('Todos los permisos (*)');
    for (const r of ['Administrador', 'Estilista', 'Empleado', 'Becario']) expect(html).toContain(`>${r}<`);
    expect(html).toContain('role="tablist"');
  });
  it('casillas agrupadas por grupo y marcadas según el rol', () => {
    const html = pintar(SeccionPermisos, { datos, onGuardado: nada });
    expect(html).toContain('<legend');
    expect(html).toContain('Ventas y caja');
    expect(html).toMatch(/<input[^>]*id="permiso-estilista-citas:asignadas"[^>]*checked/);
    expect(html).not.toMatch(/<input[^>]*id="permiso-estilista-caja:lectura"[^>]*checked/);
  });
});

describe('Guardar, confirmación e historial', () => {
  it('sin cambios, "Guardar" está deshabilitado; hay historial visible', () => {
    const html = pintar(EditorSeccion, {
      clave: 'contenido_contacto',
      titulo: 'Contacto',
      guardado: base.contenido.contacto,
      camposLegales: CAMPOS_LEGALES,
      onGuardado: nada,
      children: () => createElement('p', null, 'formulario'),
    });
    expect(html).toContain('formulario');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Guardar<\/button>/);
    expect(html).toContain('Historial de cambios');
  });
  it('el resumen de la confirmación lista qué cambia y avisa si toca los documentos legales', () => {
    const html = pintar(piezas.ResumenGuardado, { cambios: [{ campo: 'Teléfono', antes: '1', despues: '2' }], tocaLegal: true });
    expect(html).toContain('Teléfono');
    expect(html).toMatch(/Antes[\s\S]*1[\s\S]*Ahora[\s\S]*2/);
    expect(html).toContain('documentos legales');
  });
  it('aviso posterior al guardado cuando el backend dice afectaDocumentosLegales', () => {
    expect(pintar(piezas.AvisoDocumentosLegales, { onCerrar: nada })).toContain(AVISO_DOCUMENTOS_LEGALES);
  });
  it('historial: fecha, quién y campos con valor anterior y nuevo', () => {
    const html = pintar(EntradaHistorialVista, {
      entrada: { id: 1, clave: 'salon', valorAnterior: base.salon, valorNuevo: { ...base.salon, telefono: '+52 771 000 0000' }, creadoEn: '2026-10-15T17:00:00.000Z', actualizadoPor: 'Mildred', afectaDocumentosLegales: true },
    });
    expect(html).toContain('Mildred');
    expect(html).toContain('Teléfono');
    expect(html).toContain('+52 771 000 0000');
    expect(html).toContain('15/10/2026');
  });
  it('historial de permisos: claves agregadas y quitadas', () => {
    const html = pintar(piezas.CambiosPermisos, { agregadas: [{ clave: 'caja:lectura', descripcion: 'Caja: consultar' }], quitadas: [{ clave: 'citas:asignadas', descripcion: 'Ver citas' }] });
    expect(html).toContain('Agregados');
    expect(html).toContain('Caja: consultar');
    expect(html).toContain('Quitados');
    expect(html).toContain('Ver citas');
  });
});

describe('Pestañas accesibles', () => {
  it('tablist con la activa seleccionada y foco itinerante', () => {
    const html = pintar(Pestanas, { id: 'cfg', etiqueta: 'Secciones', pestanas: [{ id: 'a', etiqueta: 'Uno' }, { id: 'b', etiqueta: 'Dos' }], activa: 'b', onCambiar: nada });
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Secciones"');
    expect(html).toMatch(/id="cfg-tab-b"[^>]*aria-selected="true"[^>]*tabindex="0"|aria-selected="true"[^>]*id="cfg-tab-b"/);
    expect(html).toMatch(/aria-controls="cfg-panel-a"/);
    expect(html).toMatch(/aria-selected="false"[^>]*tabindex="-1"/);
  });
});

describe('Estados de la pantalla', () => {
  it('cargando con skeleton', () => {
    const html = pintar(ConfiguracionSitioPage);
    expect(html).toContain('Configuración del sitio');
    expect(html).toContain('mf-skeleton');
  });
  it('sin permiso y error con "Reintentar"', () => {
    expect(pintar(piezas.PantallaSinPermiso)).toMatch(/No tienes permiso/);
    expect(pintar(piezas.PantallaError, { mensaje: 'Falló', onReintentar: nada })).toContain('Reintentar');
  });
});

describe('Fuente', () => {
  const carpeta = __dirname;
  const archivos = readdirSync(carpeta).filter((n) => /\.tsx?$/.test(n));
  it('ningún archivo de la pantalla usa guiones largos', () => {
    for (const n of archivos) expect(readFileSync(join(carpeta, n), 'utf8').includes(String.fromCharCode(0x2014)), n).toBe(false);
  });
  it('la página lee con las funciones que muestran el 403 en la pantalla y nunca genera versiones legales', () => {
    const page = readFileSync(join(carpeta, 'page.tsx'), 'utf8');
    expect(page).toContain('obtenerConfiguracionAdminEnPantalla');
    expect(page).toContain('obtenerPermisosPorRolEnPantalla');
    for (const n of archivos) expect(readFileSync(join(carpeta, n), 'utf8'), n).not.toMatch(/documentos-legales\/(publicar|versiones)/);
  });
});
