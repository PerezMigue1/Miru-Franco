import { PLAZOS_TERMINOS } from '../../utils/terminosCondiciones';
import { avisoPagoEnSalon, limiteAnticipo } from '../../utils/anticipoCita';
import { TEXTO_POLITICA_ANTICIPOS } from './consentimientoAnticipo';

/** Margen mínimo que pide el backend para apartar con pago en el salón (citas.service, MARGEN_MINIMO_ANTICIPO_MS). */
const MARGEN_MINIMO_MS = 5 * 60_000;

/**
 * "Pagar en el salón" se ofrece si el anticipo es en línea y todavía cabe el plazo del salón (15 min antes del
 * inicio) más el margen mínimo. Las demás reglas (faltas, otra cita por pagar en el salón) las revisa el backend y su
 * mensaje se muestra tal cual.
 */
export function puedeElegirPagoEnSalon(cita: { fechaHoraInicio: string; anticipoEnSalon?: boolean | null }, ahora: Date): boolean {
  if (cita.anticipoEnSalon) return false;
  const inicio = new Date(cita.fechaHoraInicio).getTime();
  if (!Number.isFinite(inicio)) return false;
  const limiteSalon = inicio - PLAZOS_TERMINOS.minutosAntesPagoSalon * 60_000;
  return limiteSalon - ahora.getTime() >= MARGEN_MINIMO_MS;
}

/**
 * Advertencia junto a los botones de pago: el plazo y qué pasa con el anticipo. El texto de devolución es el mismo de
 * la casilla (TEXTO_POLITICA_ANTICIPOS) y de la sección 7 de la Política de reembolsos.
 */
export function textosAdvertenciaAnticipo({ enSalon, venceEn, ahora = new Date() }: { enSalon: boolean; venceEn: string | null; ahora?: Date }): string[] {
  const limite = venceEn ? limiteAnticipo(venceEn, ahora) : null;
  const plazo = enSalon
    ? `${avisoPagoEnSalon(venceEn).replace(' También puedes pagarlo en línea.', '')} Si no lo pagas a tiempo, el horario se libera.`
    : `Tienes ${PLAZOS_TERMINOS.horasAnticipoCita} horas para pagarlo en línea${limite ? ` (${limite.charAt(0).toLowerCase()}${limite.slice(1)})` : ''}; si no, el horario se libera.`;
  return [plazo, TEXTO_POLITICA_ANTICIPOS, 'Si no llegas a tu cita y no avisas, el anticipo no se devuelve.'];
}
