/**
 * Consentimiento expreso para datos sensibles (alergias = datos de salud, LFPDPPP).
 * Se pide en cada formulario que captura o cambia alergias y viaja como `consienteDatosSensibles: true`;
 * el backend lo exige (400) cuando las alergias cambian a un texto nuevo y no lo guarda en la base.
 */
export type QuienCaptura = 'clienta' | 'personal';

/** Mismos textos que el 400 del backend: a la titular y al personal. */
export const ERROR_CONSENTIMIENTO_CLIENTA = 'Para guardar tus alergias marca la casilla de datos de salud.';
export const ERROR_CONSENTIMIENTO_PERSONAL = 'Marca que la persona aceptó que registremos sus datos de salud.';

const limpias = (alergias: string | null | undefined) => (alergias ?? '').trim();

/** true si las alergias cambiaron a un texto distinto del guardado: solo entonces se pide la casilla de salud. */
export function alergiasNuevas(guardadas: string | null | undefined, actuales: string | null | undefined): boolean {
  const nuevas = limpias(actuales);
  return nuevas !== '' && nuevas !== limpias(guardadas);
}

/**
 * Campos de alergias para el cuerpo: nada si no cambiaron (guardar otra cosa no las toca ni pide la casilla),
 * null si se borraron, y el texto nuevo con `consienteDatosSensibles: true` (validado antes con la casilla).
 */
export function cuerpoAlergias(
  guardadas: string | null | undefined,
  actuales: string | null | undefined,
): { alergias?: string | null; consienteDatosSensibles?: true } {
  const nuevas = limpias(actuales);
  if (nuevas === limpias(guardadas)) return {};
  return nuevas ? { alergias: nuevas, consienteDatosSensibles: true } : { alergias: null };
}

/** Mensaje que bloquea el guardado de un cambio de alergias sin la casilla, o null. */
export function errorConsentimientoCambio(
  guardadas: string | null | undefined,
  actuales: string | null | undefined,
  consiente: boolean,
  quien: QuienCaptura,
): string | null {
  return alergiasNuevas(guardadas, actuales) ? errorConsentimientoAlergias(actuales, consiente, quien) : null;
}

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

/** code del 400 del backend cuando cambian las alergias sin `consienteDatosSensibles: true`. */
export const CODIGO_CONSENTIMIENTO_SALUD = 'CONSENTIMIENTO_SALUD_REQUERIDO';

/**
 * Mensaje del 400 del backend por el consentimiento de salud, para ponerlo junto a la casilla (no en el aviso
 * general): el de `errors.consienteDatosSensibles` o, con solo el code, el del error. null si es otro error.
 */
export function mensajeSaludDelBackend(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as {
    message?: unknown;
    validationErrors?: Record<string, unknown>;
    data?: { code?: unknown; errors?: Record<string, unknown> } | null;
  };
  const delCampo = e.validationErrors?.consienteDatosSensibles ?? e.data?.errors?.consienteDatosSensibles;
  const texto = (Array.isArray(delCampo) ? delCampo : [delCampo]).filter((m): m is string => typeof m === 'string' && m.trim() !== '').join(' ');
  if (texto) return texto;
  if (e.data?.code === CODIGO_CONSENTIMIENTO_SALUD && typeof e.message === 'string' && e.message) return e.message;
  return null;
}
