import { documentosAceptados } from '../../services/consentimientos';

/**
 * Casillas legales del alta de una cuenta (registro con correo y registro con Google): tres casillas
 * separadas, nunca marcadas de inicio. Términos y Aviso son obligatorias (el backend las exige con
 * `Equals(true)`); promociones es opcional.
 */
export type CampoCasillaAlta = 'aceptaTerminos' | 'aceptaAvisoPrivacidad' | 'recibePromociones';

export type CasillasAlta = Record<CampoCasillaAlta, boolean>;

export const CASILLAS_ALTA_INICIALES: Readonly<CasillasAlta> = Object.freeze({
  aceptaTerminos: false,
  aceptaAvisoPrivacidad: false,
  recibePromociones: false,
});

export const MENSAJES_CASILLA_OBLIGATORIA = {
  aceptaTerminos: 'Para crear tu cuenta acepta los Términos y condiciones.',
  aceptaAvisoPrivacidad: 'Para crear tu cuenta acepta el Aviso de privacidad.',
} as const;

type CampoObligatorio = keyof typeof MENSAJES_CASILLA_OBLIGATORIA;

/** Mensaje de una casilla obligatoria sin marcar, o null si está bien (o es opcional). */
export function errorCasillaAlta(campo: CampoCasillaAlta, marcada: boolean): string | null {
  if (marcada || campo === 'recibePromociones') return null;
  return MENSAJES_CASILLA_OBLIGATORIA[campo];
}

/** Errores de las obligatorias sin marcar; vacío = se puede enviar. */
export function erroresCasillasAlta(c: CasillasAlta): Partial<Record<CampoObligatorio, string>> {
  const errores: Partial<Record<CampoObligatorio, string>> = {};
  for (const campo of Object.keys(MENSAJES_CASILLA_OBLIGATORIA) as CampoObligatorio[]) {
    const error = errorCasillaAlta(campo, c[campo]);
    if (error) errores[campo] = error;
  }
  return errores;
}

/** Lo que viaja al backend: las tres casillas y la versión vigente de Términos y Aviso que tenía a la vista. */
export function consentimientosAlta(c: CasillasAlta) {
  return {
    aceptaTerminos: c.aceptaTerminos,
    aceptaAvisoPrivacidad: c.aceptaAvisoPrivacidad,
    recibePromociones: c.recibePromociones,
    documentos: documentosAceptados(['terminos', 'aviso-privacidad']),
  };
}
