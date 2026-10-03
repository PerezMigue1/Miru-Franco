/**
 * Fechas que son solo un día del calendario (nacimiento, caducidad, fecha de un evento, el rango
 * 'YYYY-MM-DD' de un input date). El backend las guarda a medianoche UTC y `new Date('YYYY-MM-DD')`
 * también las lee así: formateadas en hora de México (UTC-6) salen un día antes. Se formatean en UTC
 * para mostrar el día tal cual se guardó.
 *
 * No usar con marcas de tiempo (creadoEn, inicio de una cita): esas sí van en hora local.
 */

const ZONA_MEXICO = 'America/Mexico_City';
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
  // Año, mes y día de hoy según el reloj de México, sea cual sea la zona del navegador.
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_MEXICO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora);
  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  const hoy = Date.UTC(parte('year'), parte('month') - 1, parte('day'));
  return Math.round((dia - hoy) / MS_POR_DIA);
}
