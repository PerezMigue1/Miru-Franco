import type { CitaApi } from '../services/citas';

/**
 * Estado del anticipo de una cita, igual en el portal y en /operacion. Sale de los campos de la cita y de
 * sus pagos (el backend es quien los cambia): nunca de la URL de regreso de Mercado Pago.
 */
export type EstadoAnticipoCita = 'no_requiere' | 'pendiente' | 'vencido' | 'pagado' | 'en_revision' | 'reembolsado' | 'retenido' | 'liberada';

type CitaConAnticipo = Pick<CitaApi, 'estado' | 'motivoCancelacion' | 'anticipoRequerido' | 'anticipoVenceEn' | 'anticipoPagadoEn' | 'pagosAnticipo'>;
type Variante = 'default' | 'success' | 'warning' | 'danger' | 'info';

export const INFO_ANTICIPO: Record<EstadoAnticipoCita, { etiqueta: string; variante: Variante }> = {
  no_requiere: { etiqueta: 'Sin anticipo', variante: 'default' },
  pendiente: { etiqueta: 'Anticipo pendiente', variante: 'warning' },
  vencido: { etiqueta: 'Anticipo vencido', variante: 'danger' },
  pagado: { etiqueta: 'Anticipo pagado', variante: 'success' },
  en_revision: { etiqueta: 'Anticipo en revisión', variante: 'info' },
  reembolsado: { etiqueta: 'Anticipo reembolsado', variante: 'default' },
  retenido: { etiqueta: 'Anticipo retenido', variante: 'default' },
  liberada: { etiqueta: 'Liberada sin anticipo', variante: 'danger' },
};

const ESTADOS_VIGENTES = ['pendiente', 'confirmada', 'reprogramada'];

export function estadoAnticipo(c: CitaConAnticipo, ahora: Date = new Date()): EstadoAnticipoCita {
  if (!c.anticipoRequerido || c.anticipoRequerido <= 0) return 'no_requiere';
  const pagos = c.pagosAnticipo ?? [];
  const aprobados = pagos.filter((p) => p.estado === 'aprobado');
  // Prioridad: retenido, luego el anticipo pagado (aunque haya un duplicado reembolsado o en revisión).
  if (aprobados.some((p) => p.retenidoEn)) return 'retenido';
  if (c.anticipoPagadoEn && aprobados.length > 0) return c.estado === 'no_asistio' ? 'retenido' : 'pagado';
  if (pagos.some((p) => p.estado === 'en_revision')) return 'en_revision';
  if (pagos.some((p) => p.estado === 'reembolsado')) return 'reembolsado';
  if (c.anticipoPagadoEn) return c.estado === 'no_asistio' ? 'retenido' : 'pagado';
  if (c.estado === 'cancelada') return 'liberada';
  if (!c.anticipoVenceEn) return 'pendiente';
  return new Date(c.anticipoVenceEn).getTime() > ahora.getTime() ? 'pendiente' : 'vencido';
}

/** "1 h 23 min", "12 min", "menos de 1 min" o "vencido". */
export function tiempoRestante(venceEn: string | null | undefined, ahora: Date = new Date()): string {
  if (!venceEn) return '';
  const ms = new Date(venceEn).getTime() - ahora.getTime();
  if (!(ms > 0)) return 'vencido';
  const minutos = Math.floor(ms / 60_000);
  if (minutos < 1) return 'menos de 1 min';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

type TienePermiso = (clave: string | readonly string[] | null | undefined) => boolean;

/**
 * Qué puede hacer el personal con el anticipo (lo valida también el backend):
 * - registrar el pago en el salón: caja o ventas, mientras la cita siga vigente y sin pagar;
 * - reembolsar: caja, si el salón canceló una cita pagada o el pago está en revisión;
 * - retener: caja, si el pago está en revisión (p. ej. la clienta canceló);
 * - no asistió: citas:escritura, con la cita aún vigente (el anticipo pagado se retiene).
 */
export function accionesAnticipo(c: CitaConAnticipo, ahora: Date, tienePermiso: TienePermiso) {
  const estado = estadoAnticipo(c, ahora);
  const caja = tienePermiso('caja:escritura');
  const vigente = ESTADOS_VIGENTES.includes(c.estado);
  const pagos = c.pagosAnticipo ?? [];
  const hayRevision = pagos.some((p) => p.estado === 'en_revision');
  const hayAprobado = pagos.some((p) => p.estado === 'aprobado');
  return {
    registrar: vigente && (estado === 'pendiente' || estado === 'vencido') && tienePermiso(['caja:escritura', 'ventas:escritura']),
    // Un pago en revisión siempre se puede devolver; uno aprobado, solo si canceló el salón y no se retuvo.
    reembolsar: caja && (hayRevision || (estado === 'pagado' && c.estado === 'cancelada')),
    // Retener solo si la cita ya no se cobra y no hay otro anticipo aprobado (el POS lo descontaría dos veces).
    retener: caja && hayRevision && !hayAprobado && (c.estado === 'cancelada' || c.estado === 'no_asistio'),
    noAsistio: vigente && tienePermiso('citas:escritura'),
  };
}
