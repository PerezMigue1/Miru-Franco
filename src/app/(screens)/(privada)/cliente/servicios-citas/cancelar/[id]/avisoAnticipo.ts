import { apiClient } from '../../../../../../services/client';
import { getBackendBaseUrl } from '../../../../../../services/config';
import { formatearPrecioMXN } from '../../../../../../utils/formatoPrecio';
import { REGLAS_PUBLICAS_POR_OMISION } from '../../../../../../utils/reglasNegocio';
import { textoSitio, TEXTOS_POR_OMISION } from '../../../../../../utils/textosSitio';

/**
 * Qué pasa con el anticipo si la clienta cancela. Política de anticipos compatible con el art. 56 de la Ley
 * Federal de Protección al Consumidor: si la cita está a más de N días hábiles del pago del anticipo y cancela
 * dentro de los M días hábiles siguientes al pago (los guardados en la cita; hoy 10 y 5), se le devuelve completo; en
 * otro caso no se devuelve (puede reprogramar con aviso). Los días hábiles y la regla los calcula el backend. Los
 * textos salen de Admin > Textos del sitio.
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

/** Plazos de la política guardados en la cita (sin ellos, los de hoy) y los textos del sitio. */
export interface OpcionesTextoCancelacion {
  textos?: Record<string, string>;
  diasExcepcion?: number;
  diasReembolso?: number;
}

/** Los días de la política que se guardaron en la cita al crearla (lo que falte, los de hoy). */
export function plazosDeCita(reglas: unknown): { diasExcepcion: number; diasReembolso: number } {
  const r = reglas && typeof reglas === 'object' ? (reglas as Record<string, unknown>) : {};
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return {
    diasExcepcion: num(r.diasHabilesExcepcionAnticipo, REGLAS_PUBLICAS_POR_OMISION.citas.diasHabilesExcepcionAnticipo),
    diasReembolso: num(r.diasHabilesCancelarConReembolso, REGLAS_PUBLICAS_POR_OMISION.citas.diasHabilesCancelarConReembolso),
  };
}

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
export function textoAnticipoAlCancelar(
  monto: number,
  p: PoliticaCancelacionAnticipo | null,
  ahora: Date = new Date(),
  { textos = TEXTOS_POR_OMISION, diasExcepcion, diasReembolso }: OpcionesTextoCancelacion = {},
): string {
  const plazos = plazosDeCita(null);
  const v = { anticipo: formatearPrecioMXN(monto), diasExcepcion: diasExcepcion ?? plazos.diasExcepcion, diasReembolso: diasReembolso ?? plazos.diasReembolso };
  const tx = (clave: string, extra: Record<string, string> = {}) => textoSitio(textos, clave, { ...v, ...extra });
  const reprogramar = tx('citas.cancelar.reprogramar');
  if (!p) return `${tx('citas.cancelar.anticipoSinDatos')} ${reprogramar}`;
  const limite = p.reembolsableHasta ? fecha(p.reembolsableHasta) : null;
  if (reembolsableAhora(p, ahora)) {
    return `${tx('citas.cancelar.anticipoReembolsable')}${limite ? ` ${tx('citas.cancelar.anticipoHasta', { fechaLimite: limite })}` : ''}`;
  }
  if (limite) return `${tx('citas.cancelar.anticipoPlazoTerminado', { fechaLimite: limite })} ${reprogramar}`;
  return `${tx('citas.cancelar.anticipoNoReembolsable')} ${reprogramar}`;
}

/**
 * Cancelar sin anticipo pagado: no tiene costo. Si la regla pide aviso mínimo, se dice que con menos aviso no se
 * reagenda desde la cuenta (Configuración del sitio > Reglas, horasAvisoCancelarReagendar).
 */
export function textoCancelarSinAnticipo(horasAviso: number, textos: Record<string, string> = TEXTOS_POR_OMISION): string {
  const base = textoSitio(textos, 'citas.cancelar.sinAnticipo');
  if (!(horasAviso > 0)) return base;
  return `${base} ${textoSitio(textos, 'citas.cancelar.avisoReagendar', { horasAviso: `${horasAviso} ${horasAviso === 1 ? 'hora' : 'horas'}` })}`;
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
export function toastCitaCancelada(p: PoliticaCancelacionAnticipo | null, ahora: Date = new Date(), textos: Record<string, string> = TEXTOS_POR_OMISION): string {
  return textoSitio(textos, reembolsableAhora(p, ahora) ? 'citas.cancelar.toastReembolso' : 'citas.cancelar.toast');
}
