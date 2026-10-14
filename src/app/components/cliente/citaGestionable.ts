import type { CitaApi } from '../../services/citas';
import { mensajeUsuarioDesdeErrorApi } from '../../utils/apiErrorMessage';

/** Estados en los que la clienta todavía puede reprogramar o cancelar su cita (el backend los valida igual). */
const ESTADOS_GESTIONABLES: ReadonlyArray<CitaApi['estado']> = ['pendiente', 'confirmada', 'reprogramada'];

export const MENSAJE_CITA_NO_CANCELABLE = 'Esta cita ya no se puede cancelar.';

/**
 * Regla única del portal para mostrar Reprogramar y Cancelar (lista de Mis citas, detalle y pantalla
 * de cancelar): la cita sigue vigente y todavía no empieza.
 */
export function citaGestionablePorClienta(
  cita: Pick<CitaApi, 'estado' | 'fechaHoraInicio'>,
  ahora: Date = new Date(),
): boolean {
  if (!ESTADOS_GESTIONABLES.includes(cita.estado)) return false;
  const inicio = new Date(cita.fechaHoraInicio).getTime();
  return Number.isFinite(inicio) && inicio > ahora.getTime();
}

/** Texto para la clienta cuando falla la cancelación: nunca el "estado 'completada'" crudo del backend. */
export function mensajeErrorCancelarCita(err: unknown): string {
  const status = (err as { status?: unknown } | null)?.status;
  const texto = err instanceof Error ? err.message : '';
  if ((status === 400 || status === 409) && /estado/i.test(texto)) return MENSAJE_CITA_NO_CANCELABLE;
  return mensajeUsuarioDesdeErrorApi(err);
}

/** Título de la confirmación según el estado real: una cita pendiente está agendada, no confirmada. */
export function tituloConfirmacionCita(estado: CitaApi['estado'] | string | null | undefined): string {
  return estado === 'confirmada' ? '¡Cita confirmada!' : '¡Cita agendada!';
}
