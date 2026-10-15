import { apiClient } from '../../../../../../services/client';
import { getBackendBaseUrl } from '../../../../../../services/config';
import { formatearPrecioMXN } from '../../../../../../utils/formatoPrecio';

/**
 * Qué pasa con el anticipo si la clienta cancela. Política de anticipos compatible con el art. 56 de la Ley
 * Federal de Protección al Consumidor: si la cita está a más de 10 días hábiles del pago del anticipo y cancela
 * dentro de los 5 días hábiles siguientes al pago, se le devuelve completo; en otro caso no se devuelve (puede
 * reprogramar con aviso). Los días hábiles y la regla los calcula el backend.
 */
export interface PoliticaCancelacionAnticipo {
  reembolsable: boolean;
  /** ISO: fin del plazo para cancelar con reembolso; null si la cita está a 10 días hábiles o menos del pago. */
  reembolsableHasta: string | null;
  diasHabilesHastaCita: number;
}

const FECHA_LARGA = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const REPROGRAMAR = 'Si reprogramas tu cita con aviso, tu anticipo se respeta para la nueva fecha.';

function fecha(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : FECHA_LARGA.format(d);
}

/** Reembolsable según el backend y todavía dentro del plazo con el reloj de hoy. */
function reembolsableAhora(p: PoliticaCancelacionAnticipo | null, ahora: Date): boolean {
  if (!p?.reembolsable || !p.reembolsableHasta) return false;
  const limite = new Date(p.reembolsableHasta).getTime();
  return Number.isFinite(limite) && ahora.getTime() <= limite;
}

/** GET /api/pagos-en-linea/citas/:id/estado (campo `cancelacion`). null si no aplica o si la consulta falla. */
export async function consultarPoliticaCancelacionAnticipo(citaId: number): Promise<PoliticaCancelacionAnticipo | null> {
  try {
    const r = await apiClient.get<Record<string, unknown>>(`/api/pagos-en-linea/citas/${citaId}/estado`, { customBase: getBackendBaseUrl() });
    const c = r?.cancelacion;
    if (!c || typeof c !== 'object') return null;
    const o = c as Record<string, unknown>;
    return {
      reembolsable: o.reembolsable === true,
      reembolsableHasta: typeof o.reembolsableHasta === 'string' ? o.reembolsableHasta : null,
      diasHabilesHastaCita: Number(o.diasHabilesHastaCita) || 0,
    };
  } catch {
    return null;
  }
}

/** Texto que explica qué pasará con su anticipo si cancela ahora. */
export function textoAnticipoAlCancelar(monto: number, p: PoliticaCancelacionAnticipo | null, ahora: Date = new Date()): string {
  const anticipo = formatearPrecioMXN(monto);
  if (!p) {
    return `Si tu cita está a más de 10 días hábiles de la fecha en que pagaste tu anticipo de ${anticipo} y cancelas dentro de los 5 días hábiles siguientes a tu pago, te lo devolvemos completo; en otro caso no se devuelve. ${REPROGRAMAR}`;
  }
  const limite = p.reembolsableHasta ? fecha(p.reembolsableHasta) : null;
  if (reembolsableAhora(p, ahora)) {
    return `Si cancelas ahora, te devolvemos completo tu anticipo de ${anticipo} por el mismo medio con el que lo pagaste: tu cita está a más de 10 días hábiles de tu pago y cancelas dentro de los 5 días hábiles siguientes.${limite ? ` Tienes hasta el ${limite}.` : ''}`;
  }
  if (limite) {
    return `Tu anticipo de ${anticipo} ya no se devuelve si cancelas: el plazo para cancelar con reembolso terminó el ${limite}. ${REPROGRAMAR}`;
  }
  return `Tu anticipo de ${anticipo} no se devuelve si cancelas, porque tu cita está a 10 días hábiles o menos de la fecha en que lo pagaste. ${REPROGRAMAR}`;
}

/**
 * "Sí, Cancelar Cita" se desactiva mientras se cancela y, si el anticipo está pagado, mientras carga su
 * política de reembolso: así el aviso final dice si se le devuelve el anticipo.
 */
export function puedeConfirmarCancelacion({
  anticipoPagado,
  politicaCargando,
  cancelando,
}: {
  anticipoPagado: boolean;
  politicaCargando: boolean;
  cancelando: boolean;
}): boolean {
  return !cancelando && !(anticipoPagado && politicaCargando);
}

/** Aviso al terminar de cancelar. */
export function toastCitaCancelada(p: PoliticaCancelacionAnticipo | null, ahora: Date = new Date()): string {
  return reembolsableAhora(p, ahora)
    ? 'Tu cita quedó cancelada. Te devolvemos tu anticipo completo por el mismo medio con el que lo pagaste.'
    : 'Tu cita quedó cancelada.';
}
