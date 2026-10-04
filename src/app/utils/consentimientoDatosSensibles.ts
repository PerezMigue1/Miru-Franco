/**
 * Consentimiento expreso para datos sensibles (alergias = datos de salud, LFPDPPP).
 * Se pide en cada formulario que captura o edita alergias y viaja como `consienteDatosSensibles`;
 * el backend lo exige cuando hay alergias con texto y no lo guarda en la base.
 */
export type QuienCaptura = 'clienta' | 'personal';

export const ERROR_CONSENTIMIENTO_CLIENTA =
  'Para guardar tus alergias, marca la autorización para usar tus datos de salud.';
export const ERROR_CONSENTIMIENTO_PERSONAL =
  'Para guardar las alergias, confirma que la clienta autorizó el uso de sus datos de salud.';

/** true si las alergias traen texto: solo entonces hace falta el consentimiento. */
export function requiereConsentimiento(alergias: string | null | undefined): boolean {
  return typeof alergias === 'string' && alergias.trim() !== '';
}

/** Mensaje que bloquea el guardado, o null si se puede guardar. */
export function errorConsentimientoAlergias(
  alergias: string | null | undefined,
  consiente: boolean,
  quien: QuienCaptura = 'clienta',
): string | null {
  if (!requiereConsentimiento(alergias) || consiente) return null;
  return quien === 'personal' ? ERROR_CONSENTIMIENTO_PERSONAL : ERROR_CONSENTIMIENTO_CLIENTA;
}
