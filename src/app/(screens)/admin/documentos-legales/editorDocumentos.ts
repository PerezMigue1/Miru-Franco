/**
 * Lógica sin interfaz de Admin > Documentos legales: versiones, validación de "Publicar nueva versión" y la barra de
 * formato del editor. El backend vuelve a revisar todo al publicar (documentos-legales.service.ts).
 */

const VERSION = /^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;
export const MIN_MOTIVO = 10;
export const MAX_MOTIVO = 1000;

/** "2.10" > "2.9": compara mayor y menor como números. */
export function compararVersiones(a: string, b: string): number {
  const [a1, a2] = a.split('.').map(Number);
  const [b1, b2] = b.split('.').map(Number);
  return a1 - b1 || a2 - b2;
}

/** La versión que se propone al publicar: la menor siguiente (2.0 a 2.1), o 1.0 si no hay ninguna. */
export function siguienteVersion(actual: string | null | undefined): string {
  if (!actual || !VERSION.test(actual)) return '1.0';
  const [mayor, menor] = actual.split('.').map(Number);
  return `${mayor}.${menor + 1}`;
}

function diaValido(dia: string): boolean {
  if (!DIA.test(dia)) return false;
  const [a, m, d] = dia.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

export interface CamposPublicacion {
  version: string;
  vigenteDesde: string;
  motivo: string;
}

export interface ContextoPublicacion {
  /** La versión más alta ya publicada (vigente o programada). */
  versionMayor: string | null;
  /** Fecha de vigencia de la última versión publicada. */
  ultimaVigencia: string | null;
  /** Hoy en México, YYYY-MM-DD. */
  hoy: string;
}

/** Error de cada campo del diálogo "Publicar nueva versión" (vacío: se puede publicar). */
export function validarPublicacion(campos: CamposPublicacion, ctx: ContextoPublicacion): Partial<Record<keyof CamposPublicacion, string>> {
  const errores: Partial<Record<keyof CamposPublicacion, string>> = {};
  const version = campos.version.trim();
  if (!VERSION.test(version)) errores.version = 'Escribe la versión con la forma X.Y (por ejemplo, 2.1).';
  else if (ctx.versionMayor && compararVersiones(version, ctx.versionMayor) <= 0) errores.version = `La versión debe ser mayor que la ${ctx.versionMayor} ya publicada.`;
  const dia = campos.vigenteDesde.trim();
  if (!diaValido(dia)) errores.vigenteDesde = 'Elige una fecha de vigencia válida.';
  else if (dia < ctx.hoy) errores.vigenteDesde = 'La fecha de vigencia debe ser hoy o una fecha futura.';
  else if (ctx.ultimaVigencia && dia < ctx.ultimaVigencia) errores.vigenteDesde = `No puede ser anterior a la vigencia de la última versión (${ctx.ultimaVigencia}).`;
  const motivo = campos.motivo.trim();
  if (!motivo) errores.motivo = 'Escribe el motivo del cambio.';
  else if (motivo.length < MIN_MOTIVO) errores.motivo = `Explica el motivo con al menos ${MIN_MOTIVO} caracteres.`;
  else if (motivo.length > MAX_MOTIVO) errores.motivo = `El motivo tiene como máximo ${MAX_MOTIVO} caracteres.`;
  return errores;
}

export type Formato = 'seccion' | 'subtitulo' | 'lista' | 'numerada' | 'negritas' | 'enlace' | 'variable';

export interface TextoConSeleccion {
  texto: string;
  inicio: number;
  fin: number;
}

/** Separación de bloque antes de lo que se inserta en `pos`: una línea en blanco si hay texto antes. */
function separacionAntes(texto: string, pos: number): string {
  const antes = texto.slice(0, pos);
  if (!antes.trim()) return '';
  if (antes.endsWith('\n\n')) return '';
  return antes.endsWith('\n') ? '\n' : '\n\n';
}

function separacionDespues(texto: string, pos: number): string {
  const despues = texto.slice(pos);
  if (!despues.trim()) return '';
  if (despues.startsWith('\n\n')) return '';
  return despues.startsWith('\n') ? '\n' : '\n\n';
}

/** Aplica un botón de la barra de formato al texto y devuelve la selección que debe quedar. */
export function aplicarFormato(texto: string, inicio: number, fin: number, formato: Formato, variable?: string): TextoConSeleccion {
  const seleccion = texto.slice(inicio, fin);
  const antes = texto.slice(0, inicio);
  const despues = texto.slice(fin);
  switch (formato) {
    case 'negritas': {
      const contenido = seleccion || 'texto en negritas';
      return { texto: `${antes}**${contenido}**${despues}`, inicio: inicio + 2, fin: inicio + 2 + contenido.length };
    }
    case 'enlace': {
      const contenido = seleccion || 'texto del enlace';
      const direccion = '/ruta-del-sitio';
      const nuevo = `${antes}[${contenido}](${direccion})${despues}`;
      const ini = inicio + contenido.length + 3;
      return { texto: nuevo, inicio: ini, fin: ini + direccion.length };
    }
    case 'variable': {
      const marca = `{${variable ?? 'variable'}}`;
      return { texto: `${antes}${marca}${despues}`, inicio: inicio + marca.length, fin: inicio + marca.length };
    }
    case 'seccion':
    case 'subtitulo': {
      const prefijo = formato === 'seccion' ? '## ' : '### ';
      const contenido = seleccion.trim() || (formato === 'seccion' ? 'Título de la sección' : 'Subtítulo');
      const previo = separacionAntes(texto, inicio);
      const nuevo = `${antes}${previo}${prefijo}${contenido}${separacionDespues(texto, fin)}${despues}`;
      const ini = inicio + previo.length + prefijo.length;
      return { texto: nuevo, inicio: ini, fin: ini + contenido.length };
    }
    case 'lista':
    case 'numerada': {
      const lineas = (seleccion || 'Elemento de la lista').split('\n');
      const marcadas = lineas.map((l, i) => `${formato === 'lista' ? '-' : `${i + 1}.`} ${l.replace(/^(-|\d+\.)\s+/, '')}`).join('\n');
      const previo = seleccion && (inicio === 0 || texto[inicio - 1] === '\n') ? '' : separacionAntes(texto, inicio);
      const nuevo = `${antes}${previo}${marcadas}${despues}`;
      return { texto: nuevo, inicio: inicio + previo.length, fin: inicio + previo.length + marcadas.length };
    }
  }
}

/** Variables {nombre} del texto que no están en la lista (sin repetir). Las anclas {#ancla} no son variables. */
export function variablesDesconocidasEnTexto(texto: string, disponibles: readonly string[]): string[] {
  const usadas = [...texto.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((m) => m[1]);
  return [...new Set(usadas.filter((v) => !disponibles.includes(v)))];
}

/** Guía corta del formato (se muestra junto al editor). */
export const GUIA_FORMATO: ReadonlyArray<{ marca: string; explica: string }> = [
  { marca: '## Título', explica: 'Empieza una sección numerada. Puedes fijar su ancla con {#ancla} al final.' },
  { marca: '### Subtítulo', explica: 'Un subtítulo dentro de la sección.' },
  { marca: '- elemento', explica: 'Lista con viñetas. Con "1. " es una lista numerada.' },
  { marca: '**texto**', explica: 'Negritas.' },
  { marca: '[texto](/ruta)', explica: 'Enlace a una página del sitio, a https://, mailto: o tel:.' },
  { marca: '{variable}', explica: 'Un valor de las reglas del salón: se guarda con su valor al publicar.' },
  { marca: 'Línea en blanco', explica: 'Separa párrafos y bloques. Lo que está antes de la primera sección es la introducción.' },
  { marca: '<div ...>', explica: 'Un bloque con formato especial (por ejemplo, la tarjeta de contacto). Déjalo como está si no lo necesitas cambiar.' },
];

/** "Vigente", "Programada" o "Anterior". */
export function etiquetaEstado(estado: 'vigente' | 'programada' | 'anterior'): string {
  return estado === 'vigente' ? 'Vigente' : estado === 'programada' ? 'Programada' : 'Anterior (solo consulta)';
}
