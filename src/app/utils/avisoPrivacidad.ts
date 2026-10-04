import { formatearFechaSoloDia } from './fechaSoloDia';

/** Datos del Aviso de Privacidad (/aviso-de-privacidad) que no son texto. */
export const AVISO_PRIVACIDAD = {
  /** Fecha de la última actualización del texto (día de calendario, YYYY-MM-DD). */
  fechaActualizacion: '2026-10-04',
} as const;

/** "4 de octubre de 2026": la fecha de actualización sin desfase por zona horaria. */
export function fechaActualizacionAviso(): string {
  return (
    formatearFechaSoloDia(AVISO_PRIVACIDAD.fechaActualizacion, { day: 'numeric', month: 'long', year: 'numeric' }) ??
    AVISO_PRIVACIDAD.fechaActualizacion
  );
}
