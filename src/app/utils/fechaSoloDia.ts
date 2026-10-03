/**
 * Fechas y días de calendario del negocio (México, America/Mexico_City vía Intl; nunca un desfase fijo).
 *
 * - Fechas que son solo un día (nacimiento, caducidad, fecha de un evento, el rango 'YYYY-MM-DD' de un
 *   input date): el backend las guarda a medianoche UTC y `new Date('YYYY-MM-DD')` también las lee
 *   así; formateadas en hora de México saldrían un día antes. formatearFechaSoloDia y
 *   diasHastaFechaSoloDia toman su día UTC.
 * - "Hoy", el mes actual y el día de una marca de tiempo (creadoEn): hoyEnMexico, mesActualEnMexico y
 *   diaEnMexico usan el reloj de México. `toISOString().slice(0, 10)` daría el día UTC, que desde las
 *   18:00 de México ya es el siguiente.
 */

export const ZONA_MEXICO = 'America/Mexico_City';
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Día de calendario en es-MX, sin desfase por zona horaria. `null` si no hay fecha o no es válida.
 * Sin opciones da el formato corto de es-MX ("4/10/2026").
 */
export function formatearFechaSoloDia(
  valor: string | Date | null | undefined,
  opciones: Intl.DateTimeFormatOptions = {},
): string | null {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-MX', { ...opciones, timeZone: 'UTC' });
}

const DIA_EN_MEXICO = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_MEXICO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * 'YYYY-MM-DD' del día en México de un instante (una marca de tiempo como creadoEn), sea cual sea
 * la zona del navegador. Lo que se hacía con `toISOString().slice(0, 10)` daba el día UTC: después
 * de las 18:00 en México, el día siguiente. `null` si no hay fecha o no es válida.
 */
export function diaEnMexico(instante: string | Date | null | undefined): string | null {
  if (!instante) return null;
  const d = instante instanceof Date ? instante : new Date(instante);
  if (Number.isNaN(d.getTime())) return null;
  return DIA_EN_MEXICO.format(d);
}

/** 'YYYY-MM-DD' de hoy en México (para filtros "de hoy" y valores por defecto de un input date). */
export function hoyEnMexico(ahora: Date = new Date()): string {
  return DIA_EN_MEXICO.format(ahora);
}

/**
 * 'YYYY-MM-DD' del mismo día `anios` años antes (por ejemplo, la fecha de nacimiento más reciente
 * para tener 18 años hoy). Un 29 de febrero en un año no bisiesto queda en el 28.
 */
export function mismoDiaHaceAnios(dia: string, anios: number): string {
  const [a, m, d] = dia.split('-').map(Number);
  const anio = a - anios;
  const ultimoDelMes = new Date(Date.UTC(anio, m, 0)).getUTCDate();
  return `${anio}-${String(m).padStart(2, '0')}-${String(Math.min(d, ultimoDelMes)).padStart(2, '0')}`;
}

/** 'YYYY-MM' del mes actual en México. */
export function mesActualEnMexico(ahora: Date = new Date()): string {
  return hoyEnMexico(ahora).slice(0, 7);
}

/**
 * Días de calendario desde hoy (en México) hasta esa fecha solo-día: hoy 0, mañana 1, ayer -1.
 * Compara días, no milisegundos, así que no depende de la hora en que se consulte.
 */
export function diasHastaFechaSoloDia(
  valor: string | Date | null | undefined,
  ahora: Date = new Date(),
): number | null {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  const dia = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const [anio, mes, diaHoy] = hoyEnMexico(ahora).split('-').map(Number);
  const hoy = Date.UTC(anio, mes - 1, diaHoy);
  return Math.round((dia - hoy) / MS_POR_DIA);
}
