import type { TextoAdmin, TipoTexto } from '../../../services/textosSitio';

/**
 * Admin > Textos del sitio: búsqueda, filtro por página, validación en vivo (la misma del backend: largo, variables
 * existentes, llaves y sin HTML) y vista previa con las variables llenas.
 */

export const TODAS_LAS_PAGINAS = '';

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca en la descripción, el texto actual, el original, la página y la clave (sin distinguir acentos). */
export function filtrarTextos(lista: TextoAdmin[], busqueda: string, pagina: string = TODAS_LAS_PAGINAS): TextoAdmin[] {
  const palabras = sinAcentos(busqueda.trim()).split(/\s+/).filter(Boolean);
  return lista.filter((t) => {
    if (pagina && t.pagina !== pagina) return false;
    if (!palabras.length) return true;
    const donde = sinAcentos([t.descripcion, t.valor, t.porDefecto, t.pagina, t.clave].join(' '));
    return palabras.every((p) => donde.includes(p));
  });
}

export const ETIQUETA_TIPO: Record<TipoTexto, string> = {
  texto: 'Texto del sitio',
  'correo-asunto': 'Asunto de correo',
  'correo-cuerpo': 'Texto de correo',
  'aviso-titulo': 'Título de aviso',
  'aviso-mensaje': 'Mensaje de aviso',
};

/** Los tipos que van en una sola línea (sin saltos de línea). */
export const UNA_LINEA: ReadonlySet<TipoTexto> = new Set(['texto', 'correo-asunto', 'aviso-titulo']);

const VARIABLE = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;
const HTML = /<\s*[a-zA-Z!/?]|&[a-zA-Z#][a-zA-Z0-9]*;/;
const CONTROL = /[\x00-\x09\x0b-\x1f\x7f]/;

export function variablesDeTexto(texto: string): string[] {
  return [...new Set([...texto.matchAll(VARIABLE)].map((m) => m[1]))];
}

/** El primer error en español (el que se muestra junto al campo) o null. */
export function errorTexto(texto: Pick<TextoAdmin, 'max' | 'tipo' | 'variables'>, valor: string): string | null {
  const t = valor.trim();
  if (!t) return 'Escribe el texto. Si quieres volver al original, usa "Restaurar texto original".';
  if (t.length > texto.max) return `El texto tiene como máximo ${texto.max} caracteres (lleva ${t.length}).`;
  if (HTML.test(t)) return 'Escribe solo texto, sin etiquetas HTML ni códigos como &amp;.';
  if (CONTROL.test(t)) return 'El texto tiene caracteres que no se pueden mostrar.';
  if (UNA_LINEA.has(texto.tipo) && /[\r\n]/.test(t)) return 'Este texto va en una sola línea: quita los saltos de línea.';
  if (/[{}]/.test(t.replace(VARIABLE, ''))) return 'Revisa las llaves: cada variable se escribe así, {nombreDeVariable}, y no puede quedar una llave suelta.';
  const permitidas = new Set(texto.variables.map((v) => v.nombre));
  const desconocidas = variablesDeTexto(t).filter((v) => !permitidas.has(v));
  if (desconocidas.length) {
    return `${desconocidas.length === 1 ? 'Esta variable no existe' : 'Estas variables no existen'} para este texto: ${desconocidas.map((v) => `{${v}}`).join(', ')}. Usa solo las de la lista.`;
  }
  return null;
}

/** Vista previa: las variables de reglas con su valor de hoy y las de contexto con un ejemplo. */
export function vistaPreviaTexto(texto: Pick<TextoAdmin, 'variables'>, valor: string, nombreSalon?: string): string {
  const ejemplos: Record<string, string> = Object.fromEntries(texto.variables.map((v) => [v.nombre, v.ejemplo]));
  if (nombreSalon) ejemplos.nombreSalon = nombreSalon;
  return valor.replace(VARIABLE, (todo, nombre: string) => (nombre in ejemplos ? ejemplos[nombre] : todo));
}

/** Agrega la variable al final del texto (con un espacio si hace falta). */
export function agregarVariable(valor: string, nombre: string): string {
  const v = `{${nombre}}`;
  if (!valor) return v;
  return /\s$/.test(valor) ? `${valor}${v}` : `${valor} ${v}`;
}

/** Cuántos textos cambió la dueña (distintos del original). */
export function contarPersonalizados(lista: TextoAdmin[]): number {
  return lista.filter((t) => t.valor !== t.porDefecto).length;
}
