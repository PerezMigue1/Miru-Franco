import { avisoPagoEnSalon, limiteAnticipo } from '../../utils/anticipoCita';
import { consecuenciaNoAsistir } from '../../utils/formaPago';
import { REGLAS_PUBLICAS_POR_OMISION, type ReglasPublicas } from '../../utils/reglasNegocio';
import { conUnidad, textoSitio, TEXTOS_POR_OMISION } from '../../utils/textosSitio';
import { TEXTO_POLITICA_ANTICIPOS } from './consentimientoAnticipo';

/** Margen mínimo que pide el backend para apartar con pago en el salón (citas.service, MARGEN_MINIMO_ANTICIPO_MS). */
const MARGEN_MINIMO_MS = 5 * 60_000;

/**
 * "Pagar en el salón" se ofrece si el anticipo es en línea y todavía cabe el plazo del salón (15 min antes del
 * inicio) más el margen mínimo. Las demás reglas (faltas, otra cita por pagar en el salón) las revisa el backend y su
 * mensaje se muestra tal cual.
 */
export function puedeElegirPagoEnSalon(
  cita: { fechaHoraInicio: string; anticipoEnSalon?: boolean | null },
  ahora: Date,
  minutosAntesPagoSalon: number = REGLAS_PUBLICAS_POR_OMISION.citas.minutosAntesPagoSalon,
): boolean {
  if (cita.anticipoEnSalon) return false;
  const inicio = new Date(cita.fechaHoraInicio).getTime();
  if (!Number.isFinite(inicio)) return false;
  const limiteSalon = inicio - minutosAntesPagoSalon * 60_000;
  return limiteSalon - ahora.getTime() >= MARGEN_MINIMO_MS;
}

/**
 * Advertencia junto a los botones de pago: el plazo y qué pasa con el anticipo. El texto de devolución es el mismo de
 * la casilla (TEXTO_POLITICA_ANTICIPOS) y de la sección 7 de la Política de reembolsos.
 */
export function textosAdvertenciaAnticipo({
  enSalon,
  venceEn,
  ahora = new Date(),
  reglas = REGLAS_PUBLICAS_POR_OMISION,
  minutosAntesPagoSalon = reglas.citas.minutosAntesPagoSalon,
  plazoAnticipoHoras = reglas.citas.plazoAnticipoHoras,
  textos = TEXTOS_POR_OMISION,
}: {
  enSalon: boolean;
  venceEn: string | null;
  ahora?: Date;
  reglas?: ReglasPublicas;
  /** Los guardados en la cita (minutosSalonDeCita). */
  minutosAntesPagoSalon?: number;
  plazoAnticipoHoras?: number;
  /** Admin > Textos del sitio (sin ellos, los de hoy). */
  textos?: Record<string, string>;
}): string[] {
  const limite = venceEn ? limiteAnticipo(venceEn, ahora) : null;
  const plazo = enSalon
    ? `${avisoPagoEnSalon(venceEn, minutosAntesPagoSalon).replace(' También puedes pagarlo en línea.', '')} ${textoSitio(textos, 'anticipos.salonSeLibera')}`
    : textoSitio(textos, 'anticipos.plazoLinea', {
        // El plazo es el guardado en la cita (si existe), no el de hoy.
        plazoAnticipo: conUnidad(plazoAnticipoHoras, 'hora', 'horas'),
        limite: limite ? ` (${limite.charAt(0).toLowerCase()}${limite.slice(1)})` : '',
      });
  // TEXTO_POLITICA_ANTICIPOS es evidencia legal ligada a la versión publicada: se queda en el código.
  return [plazo, TEXTO_POLITICA_ANTICIPOS, consecuenciaNoAsistir(reglas, textos)];
}
