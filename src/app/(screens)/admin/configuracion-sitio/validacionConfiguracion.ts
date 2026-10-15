import {
  type ContenidoContacto,
  type ContenidoInicio,
  type ContenidoSobreNosotros,
  type DatosSalon,
  type HorarioDia,
  type RedesSalon,
  type SeccionConfiguracion,
} from '../../../services/configuracionSitio';

/**
 * Validación en el cliente de Admin > Configuración del sitio: los mismos límites y patrones que
 * validarSeccion del backend (configuracion-sitio.service.ts), con mensajes en español junto a cada
 * campo. El backend vuelve a validar; sus errores 400 se reparten con repartirErroresServidor.
 */

/** Errores por campo. Llaves: 'nombre', 'dias.2', 'parrafos.0', 'valores.1.titulo'… */
export type Errores = Record<string, string>;

export interface DefCampo {
  /** Nombre visible del campo. */
  titulo: string;
  /** Cómo lo nombra el mensaje de error ("Escribe el {etiqueta}."). */
  etiqueta: string;
  /** Artículo del mensaje: "el" o "la". */
  articulo?: 'el' | 'la';
  max: number;
  obligatorio?: boolean;
  patron?: RegExp;
  mensajePatron?: string;
  ayuda?: string;
  /** Texto largo: se edita en un área de texto. */
  largo?: boolean;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^\+?[\d\s()-]{10,20}$/;
const MAPA = /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+)\S*$/i;
/** La imagen que ya estaba (Cloudinary o una ruta del sitio) o una subida propia de sitio/ con "Subir foto". */
export const URL_IMAGEN = /^(https:\/\/res\.cloudinary\.com\/[^\s]+|\/(?![/\\])[\w./-]+|sitio\/(ilustrativas\/)?panel_[0-9a-f]{32})$/;
const MENSAJE_IMAGEN = 'Sube la imagen con el botón "Subir foto".';

/** Mensaje de un campo de texto, igual que texto() del backend; null si está bien. */
export function errorTexto(valor: string, c: DefCampo): string | null {
  const v = (valor ?? '').trim();
  const art = c.articulo ?? 'el';
  const Art = art === 'el' ? 'El' : 'La';
  if (c.obligatorio && !v) return `Escribe ${art} ${c.etiqueta}.`;
  if (v.length > c.max) return `${Art} ${c.etiqueta} tiene como máximo ${c.max} caracteres.`;
  if (v && c.patron && !c.patron.test(v)) return c.mensajePatron ?? `${Art} ${c.etiqueta} no es válido.`;
  return null;
}

export const CAMPOS_SALON: Record<keyof DatosSalon, DefCampo> = {
  nombre: { titulo: 'Nombre del salón', etiqueta: 'nombre del salón', max: 120, obligatorio: true },
  responsable: { titulo: 'Responsable', etiqueta: 'nombre de la responsable', max: 120, obligatorio: true, ayuda: 'Persona responsable del negocio y de los datos personales.' },
  direccion: { titulo: 'Domicilio (calle, número y colonia)', etiqueta: 'domicilio (calle, número y colonia)', max: 200, obligatorio: true },
  ciudad: { titulo: 'Ciudad y estado', etiqueta: 'ciudad y estado', articulo: 'la', max: 120, obligatorio: true },
  codigoPostal: { titulo: 'Código postal', etiqueta: 'código postal', max: 5, obligatorio: true, patron: /^\d{5}$/, mensajePatron: 'El código postal tiene 5 dígitos.' },
  telefono: { titulo: 'Teléfono', etiqueta: 'teléfono', max: 20, obligatorio: true, patron: TELEFONO, mensajePatron: 'El teléfono debe tener al menos 10 dígitos (puede llevar +52).' },
  whatsapp: { titulo: 'WhatsApp', etiqueta: 'WhatsApp', max: 20, patron: TELEFONO, mensajePatron: 'El WhatsApp debe tener al menos 10 dígitos (puede llevar +52).', ayuda: 'Opcional. Si lo dejas vacío, el sitio no muestra el botón de WhatsApp.' },
  correoContacto: {
    titulo: 'Correo de contacto',
    etiqueta: 'correo de contacto',
    max: 120,
    obligatorio: true,
    patron: CORREO,
    mensajePatron: 'El correo de contacto no es válido.',
    ayuda: 'Es el correo público: aparece en el pie de página y en Contacto. No es el de los documentos legales.',
  },
  correoPrivacidad: {
    titulo: 'Correo de privacidad y quejas',
    etiqueta: 'correo de privacidad y quejas',
    max: 120,
    obligatorio: true,
    patron: CORREO,
    mensajePatron: 'El correo de privacidad y quejas no es válido.',
    ayuda: 'Es el correo que citan los documentos legales para solicitudes ARCO, quejas y reembolsos. Puede ser distinto del correo de contacto.',
  },
  mapaUrl: {
    titulo: 'Enlace del mapa',
    etiqueta: 'enlace del mapa',
    max: 500,
    patron: MAPA,
    mensajePatron: 'El enlace del mapa debe ser de Google Maps y empezar con https://.',
    ayuda: 'Opcional. Un enlace de Google Maps (https://maps.app.goo.gl/…). Si lo pones, el domicilio del pie abre el mapa.',
  },
  lema: { titulo: 'Lema del pie de página', etiqueta: 'lema del pie de página', max: 300, largo: true },
  descripcionSeo: { titulo: 'Descripción para buscadores', etiqueta: 'descripción para buscadores', articulo: 'la', max: 300, largo: true, ayuda: 'El texto que muestra Google bajo el nombre del sitio.' },
};

const RED = (nombre: string, dominio: RegExp, ejemplo: string): DefCampo => ({
  titulo: nombre,
  etiqueta: `enlace de ${nombre}`,
  max: 300,
  patron: dominio,
  mensajePatron: `El enlace de ${nombre} debe ser de ${nombre} y empezar con https://.`,
  ayuda: `Opcional. Por ejemplo ${ejemplo}. Vacío: no se muestra.`,
});
export const CAMPOS_REDES: Record<keyof RedesSalon, DefCampo> = {
  instagram: RED('Instagram', /^https:\/\/(www\.)?instagram\.com\/\S+$/i, 'https://instagram.com/mirufranco'),
  facebook: RED('Facebook', /^https:\/\/(www\.|m\.)?facebook\.com\/\S+$/i, 'https://facebook.com/mirufranco'),
  tiktok: RED('TikTok', /^https:\/\/(www\.)?tiktok\.com\/\S+$/i, 'https://tiktok.com/@mirufranco'),
  twitter: RED('X (Twitter)', /^https:\/\/(www\.)?(x|twitter)\.com\/\S+$/i, 'https://x.com/mirufranco'),
};

type CamposEscalaresInicio = Exclude<keyof ContenidoInicio, 'sobreNosotrosParrafos'>;
export const CAMPOS_INICIO: Record<CamposEscalaresInicio, DefCampo> = {
  heroTexto: { titulo: 'Texto de la portada', etiqueta: 'texto de la portada', max: 300, obligatorio: true, largo: true },
  heroDestacado: { titulo: 'Frase grande de la portada', etiqueta: 'frase grande de la portada', articulo: 'la', max: 40, obligatorio: true, ayuda: 'Se escribe en letra muy grande: mejor corta.' },
  productosDescripcion: { titulo: 'Texto de la sección de productos', etiqueta: 'texto de productos', max: 200, largo: true },
  serviciosDescripcion: { titulo: 'Texto de la sección de servicios', etiqueta: 'texto de servicios', max: 200, largo: true },
  trabajoDescripcion: { titulo: 'Texto de la galería', etiqueta: 'texto de la galería', max: 200, largo: true },
  sobreNosotrosImagen: { titulo: 'Imagen de "Sobre nosotros" en el inicio', etiqueta: 'imagen de "Sobre nosotros"', articulo: 'la', max: 500, patron: URL_IMAGEN, mensajePatron: MENSAJE_IMAGEN },
  cierreTitulo: { titulo: 'Título del cierre', etiqueta: 'título del cierre', max: 80, obligatorio: true },
  cierreTexto: { titulo: 'Texto del cierre', etiqueta: 'texto del cierre', max: 200, largo: true },
};

export const CAMPOS_SOBRE_NOSOTROS: Record<'titulo' | 'imagen', DefCampo> = {
  titulo: { titulo: 'Título', etiqueta: 'título', max: 80, obligatorio: true },
  imagen: { titulo: 'Imagen', etiqueta: 'imagen', articulo: 'la', max: 500, patron: URL_IMAGEN, mensajePatron: MENSAJE_IMAGEN },
};

export const CAMPOS_CONTACTO: Record<keyof ContenidoContacto, DefCampo> = {
  introduccion: { titulo: 'Introducción de la página de contacto', etiqueta: 'introducción de contacto', articulo: 'la', max: 300, obligatorio: true, largo: true },
  agendaTexto: { titulo: 'Texto de "Agenda en línea"', etiqueta: 'texto de "Agenda en línea"', max: 300, obligatorio: true, largo: true },
};

/** Límites de las listas (los mismos del backend). */
export const LISTAS = {
  parrafosInicio: { min: 1, max: 4, maxLargo: 600 },
  parrafosSobreNosotros: { min: 1, max: 5, maxLargo: 800 },
  valores: { max: 6, maxTitulo: 40, maxDescripcion: 200 },
} as const;

function validarCampos<T extends object>(valor: T, campos: Partial<Record<keyof T, DefCampo>>): Errores {
  const errores: Errores = {};
  for (const [k, def] of Object.entries(campos) as [string, DefCampo][]) {
    const msg = errorTexto(String((valor as Record<string, unknown>)[k] ?? ''), def);
    if (msg) errores[k] = msg;
  }
  return errores;
}

function validarParrafos(parrafos: string[], llave: string, lim: { min: number; max: number; maxLargo: number }, errores: Errores) {
  if (parrafos.length < lim.min || parrafos.length > lim.max) errores[llave] = `Escribe entre ${lim.min} y ${lim.max} párrafos.`;
  parrafos.forEach((p, i) => {
    const msg = errorTexto(p, { titulo: '', etiqueta: `párrafo ${i + 1}`, max: lim.maxLargo, obligatorio: true });
    if (msg) errores[`${llave}.${i}`] = msg;
  });
}

export const validarSalon = (v: DatosSalon): Errores => validarCampos(v, CAMPOS_SALON);
export const validarRedes = (v: RedesSalon): Errores => validarCampos(v, CAMPOS_REDES);
export const validarContacto = (v: ContenidoContacto): Errores => validarCampos(v, CAMPOS_CONTACTO);

export function validarInicio(v: ContenidoInicio): Errores {
  const errores = validarCampos(v, CAMPOS_INICIO);
  validarParrafos(v.sobreNosotrosParrafos, 'sobreNosotrosParrafos', LISTAS.parrafosInicio, errores);
  return errores;
}

export function validarSobreNosotros(v: ContenidoSobreNosotros): Errores {
  const errores = validarCampos(v, CAMPOS_SOBRE_NOSOTROS);
  validarParrafos(v.parrafos, 'parrafos', LISTAS.parrafosSobreNosotros, errores);
  if (v.valores.length > LISTAS.valores.max) errores.valores = `Puedes poner hasta ${LISTAS.valores.max} valores.`;
  v.valores.forEach((x, i) => {
    const t = errorTexto(x.titulo, { titulo: '', etiqueta: `título del valor ${i + 1}`, max: LISTAS.valores.maxTitulo, obligatorio: true });
    const d = errorTexto(x.descripcion, { titulo: '', etiqueta: `descripción del valor ${i + 1}`, articulo: 'la', max: LISTAS.valores.maxDescripcion, obligatorio: true });
    if (t) errores[`valores.${i}.titulo`] = t;
    if (d) errores[`valores.${i}.descripcion`] = d;
  });
  return errores;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
export const NOMBRE_DIA_MINUSCULA: Record<string, string> = {
  lunes: 'lunes',
  martes: 'martes',
  miercoles: 'miércoles',
  jueves: 'jueves',
  viernes: 'viernes',
  sabado: 'sábado',
  domingo: 'domingo',
};

/** Errores del horario: por renglón ('dias.<i>') y del conjunto ('dias'). */
export function validarHorario(dias: HorarioDia[]): Errores {
  const errores: Errores = {};
  dias.forEach((d, i) => {
    if (d.cerrado) return;
    const nombre = NOMBRE_DIA_MINUSCULA[d.dia] ?? d.dia;
    if (!d.abre) errores[`dias.${i}`] = `Escribe la hora de apertura del ${nombre}.`;
    else if (!d.cierra) errores[`dias.${i}`] = `Escribe la hora de cierre del ${nombre}.`;
    else if (!HORA.test(d.abre) || !HORA.test(d.cierra)) errores[`dias.${i}`] = `Las horas del ${nombre} deben tener el formato HH:MM.`;
    else if (d.cierra <= d.abre) errores[`dias.${i}`] = `El ${nombre} debe abrir antes de cerrar.`;
  });
  if (dias.length > 0 && dias.every((d) => d.cerrado)) errores.dias = 'El salón debe abrir al menos un día.';
  return errores;
}

/** 'AAAA-MM-DD' que existe en el calendario. */
export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [a, m, d] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

export function validarReglas(v: { anticiposDesde: string | null }): Errores {
  const f = v.anticiposDesde;
  // null es "usar la variable del servidor"; '' es fecha propia sin elegir todavía.
  if (f === '') return { anticiposDesde: 'Elige la fecha de inicio o marca "Usar la variable del servidor".' };
  if (f && !esFechaValida(f)) return { anticiposDesde: 'La fecha de inicio de los anticipos debe ser una fecha válida (AAAA-MM-DD).' };
  return {};
}

export function validarSeccion(clave: SeccionConfiguracion, valor: unknown): Errores {
  switch (clave) {
    case 'salon':
      return validarSalon(valor as DatosSalon);
    case 'redes':
      return validarRedes(valor as RedesSalon);
    case 'horario':
      return validarHorario((valor as { dias: HorarioDia[] }).dias);
    case 'contenido_inicio':
      return validarInicio(valor as ContenidoInicio);
    case 'contenido_sobre_nosotros':
      return validarSobreNosotros(valor as ContenidoSobreNosotros);
    case 'contenido_contacto':
      return validarContacto(valor as ContenidoContacto);
    case 'reglas':
      return validarReglas(valor as { anticiposDesde: string | null });
  }
}

const recortar = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
function soloCampos(valor: unknown, campos: readonly string[]): Record<string, string> {
  const v = (valor ?? {}) as Record<string, unknown>;
  return Object.fromEntries(campos.map((k) => [k, recortar(v[k])]));
}
const listaTextos = (v: unknown) => (Array.isArray(v) ? v.map(recortar) : []);

/** El valor exacto que se manda en PUT /api/configuracion-sitio/:clave: solo los campos de la sección, recortados. */
export function prepararValor(clave: SeccionConfiguracion, borrador: unknown): unknown {
  const v = (borrador ?? {}) as Record<string, unknown>;
  switch (clave) {
    case 'salon':
      return soloCampos(v, Object.keys(CAMPOS_SALON));
    case 'redes':
      return soloCampos(v, Object.keys(CAMPOS_REDES));
    case 'contenido_contacto':
      return soloCampos(v, Object.keys(CAMPOS_CONTACTO));
    case 'contenido_inicio': {
      const campos = ['heroTexto', 'heroDestacado', 'productosDescripcion', 'serviciosDescripcion', 'trabajoDescripcion', 'sobreNosotrosParrafos', 'sobreNosotrosImagen', 'cierreTitulo', 'cierreTexto'];
      return Object.fromEntries(campos.map((k) => [k, k === 'sobreNosotrosParrafos' ? listaTextos(v[k]) : recortar(v[k])]));
    }
    case 'contenido_sobre_nosotros':
      return {
        titulo: recortar(v.titulo),
        parrafos: listaTextos(v.parrafos),
        imagen: recortar(v.imagen),
        valores: (Array.isArray(v.valores) ? v.valores : []).map((x: { titulo?: unknown; descripcion?: unknown }) => ({
          titulo: recortar(x?.titulo),
          descripcion: recortar(x?.descripcion),
        })),
      };
    case 'horario':
      return {
        dias: (Array.isArray(v.dias) ? (v.dias as HorarioDia[]) : []).map((d) => ({
          dia: d.dia,
          cerrado: Boolean(d.cerrado),
          abre: d.cerrado ? '' : recortar(d.abre),
          cierra: d.cerrado ? '' : recortar(d.cierra),
        })),
      };
    case 'reglas': {
      const f = recortar(v.anticiposDesde);
      return { anticiposDesde: f || null };
    }
  }
}

/** Mensajes de un 400 del backend (message: string[] o string); null si el error no es un 400. */
export function mensajesDelServidor(e: unknown): string[] | null {
  const err = e as { status?: unknown; data?: { message?: unknown } } | null;
  if (!err || err.status !== 400) return null;
  const m = err.data?.message;
  if (Array.isArray(m)) return m.filter((x): x is string => typeof x === 'string');
  if (typeof m === 'string' && m) return [m];
  return e instanceof Error && e.message ? [e.message] : [];
}

type Regla = [RegExp, string | ((m: RegExpMatchArray) => string)];
const indice = (m: RegExpMatchArray) => Number(m[1]) - 1;
const DIA_POR_NOMBRE = /\b(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/i;

/** Qué campo nombra cada mensaje del backend. El orden importa: lo más específico primero. */
const REGLAS_SERVIDOR: Record<SeccionConfiguracion, Regla[]> = {
  salon: [
    [/nombre del salón/i, 'nombre'],
    [/responsable/i, 'responsable'],
    [/domicilio/i, 'direccion'],
    [/ciudad/i, 'ciudad'],
    [/código postal/i, 'codigoPostal'],
    [/whatsapp/i, 'whatsapp'],
    [/teléfono/i, 'telefono'],
    [/correo de contacto/i, 'correoContacto'],
    [/correo de privacidad/i, 'correoPrivacidad'],
    [/mapa/i, 'mapaUrl'],
    [/lema/i, 'lema'],
    [/buscadores/i, 'descripcionSeo'],
  ],
  redes: [
    [/instagram/i, 'instagram'],
    [/facebook/i, 'facebook'],
    [/tiktok/i, 'tiktok'],
    [/twitter/i, 'twitter'],
  ],
  horario: [
    [/al menos un día/i, 'dias'],
    [DIA_POR_NOMBRE, (m) => `dias.${Object.values(NOMBRE_DIA_MINUSCULA).indexOf(m[1].toLowerCase())}`],
  ],
  contenido_inicio: [
    [/texto de la portada/i, 'heroTexto'],
    [/frase grande/i, 'heroDestacado'],
    [/texto de productos/i, 'productosDescripcion'],
    [/texto de servicios/i, 'serviciosDescripcion'],
    [/texto de la galería/i, 'trabajoDescripcion'],
    [/sobre nosotros" (\d+)/i, (m) => `sobreNosotrosParrafos.${indice(m)}`],
    [/^Párrafos de "Sobre nosotros"/i, 'sobreNosotrosParrafos'],
    [/imagen/i, 'sobreNosotrosImagen'],
    [/título del cierre/i, 'cierreTitulo'],
    [/texto del cierre/i, 'cierreTexto'],
  ],
  contenido_sobre_nosotros: [
    [/título del valor (\d+)/i, (m) => `valores.${indice(m)}.titulo`],
    [/descripción del valor (\d+)/i, (m) => `valores.${indice(m)}.descripcion`],
    [/^Valores/i, 'valores'],
    [/párrafos de la historia (\d+)/i, (m) => `parrafos.${indice(m)}`],
    [/^Párrafos de la historia/i, 'parrafos'],
    [/imagen/i, 'imagen'],
    [/título/i, 'titulo'],
  ],
  contenido_contacto: [
    [/introducción/i, 'introduccion'],
    [/agenda en línea/i, 'agendaTexto'],
  ],
  reglas: [[/anticipos/i, 'anticiposDesde']],
};

/** Reparte los mensajes del backend: junto a su campo si se reconoce, arriba de la sección si no. */
export function repartirErroresServidor(clave: SeccionConfiguracion, mensajes: string[]): { porCampo: Errores; generales: string[] } {
  const porCampo: Errores = {};
  const generales: string[] = [];
  for (const msg of mensajes) {
    let campo: string | null = null;
    for (const [patron, destino] of REGLAS_SERVIDOR[clave]) {
      const m = msg.match(patron);
      if (m) {
        campo = typeof destino === 'string' ? destino : destino(m);
        break;
      }
    }
    if (campo && !campo.endsWith('.-1') && !porCampo[campo]) porCampo[campo] = msg;
    else generales.push(msg);
  }
  return { porCampo, generales };
}

