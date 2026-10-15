import { ORIGEN_REVOCACION, type PedidoApi, type RevocacionApi } from '../../../../../../services/ecommerce';
import { formatearPrecioMXN } from '../../../../../../utils/formatoPrecio';
import type { ToastType } from '../../../../../../utils/toast';

/**
 * Revocación de compra (art. 56 de la Ley Federal de Protección al Consumidor) en el detalle del pedido. El
 * plazo (5 días hábiles desde que recogió su pedido, o desde su pago si aún no lo recoge) lo calcula el backend.
 */
const FECHA_LARGA = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "jueves, 19 de noviembre de 2026" en hora de México; null si no hay fecha válida. */
export function fechaLimiteRevocacion(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : FECHA_LARGA.format(d);
}

/** El botón "Revocar compra" se ve mientras el backend diga que se puede y no haya pasado la fecha límite. */
export function puedeVerBotonRevocar(pedido: Pick<PedidoApi, 'puedeRevocar' | 'revocableHasta'>, ahora: Date = new Date()): boolean {
  if (pedido.puedeRevocar !== true || !pedido.revocableHasta) return false;
  const limite = new Date(pedido.revocableHasta).getTime();
  return Number.isFinite(limite) && ahora.getTime() <= limite;
}

/** Párrafos del modal: el derecho, qué pasa con su pedido y hasta cuándo puede revocarla. */
export function textoModalRevocacion(pedido: Pick<PedidoApi, 'estado' | 'total' | 'revocableHasta' | 'montoRevocable'>): string[] {
  const fecha = fechaLimiteRevocacion(pedido.revocableHasta);
  const saldo = pedido.montoRevocable ?? pedido.total;
  const reintegro =
    saldo < pedido.total
      ? `Te reintegramos lo que pagaste y todavía no te habíamos devuelto: ${formatearPrecioMXN(saldo)}.`
      : `Te reintegramos todo lo que pagaste: ${formatearPrecioMXN(pedido.total)}.`;
  return [
    `Tienes derecho a revocar tu compra sin dar razones dentro de los 5 días hábiles siguientes a que recogiste tu pedido en el salón (o a tu pago, si todavía no lo recoges); no cuentan los domingos ni los días festivos oficiales. ${reintegro}`,
    pedido.estado === 'entregado'
      ? 'Como ya recogiste tu pedido, entrégalo en el salón con sus productos. Al recibirlo te reembolsamos por el mismo medio con el que pagaste.'
      : 'Como todavía no lo recoges, cancelamos tu pedido y te reembolsamos por el mismo medio con el que pagaste.',
    ...(fecha ? [`Puedes revocarla hasta el ${fecha} (hora de la Ciudad de México).`] : []),
  ];
}

/** Mensaje del resultado según lo que respondió el servidor. */
export function resultadoRevocacion(r: RevocacionApi): { mensaje: string; tipo: ToastType } {
  const monto = formatearPrecioMXN(r.monto);
  if (r.estado === 'reembolsado') {
    return {
      mensaje: `Revocaste tu compra: cancelamos tu pedido y te devolvimos ${monto}. Puede tardar unos días en reflejarse, según tu banco.`,
      tipo: 'success',
    };
  }
  if (r.estado === 'pendiente_entrega') {
    return {
      mensaje: `Revocaste tu compra. Entrega tu pedido en el salón: al recibirlo te reembolsamos ${monto} por el mismo medio con el que pagaste.`,
      tipo: 'success',
    };
  }
  return {
    mensaje: `Revocaste tu compra y cancelamos tu pedido. El salón te reintegra ${monto} por el mismo medio con el que pagaste y te contactará.`,
    tipo: 'info',
  };
}

/** Etiqueta que el backend antepone al motivo de una revocación (la pantalla ya muestra la insignia). */
const PREFIJO_MOTIVO_REVOCACION = '[Revocación de compra · art. 56 LFPC]';

/**
 * Motivo de una devolución para la clienta. En una revocación se quita la etiqueta cruda del backend y queda solo
 * lo que escribió (null si no escribió nada: la insignia "Revocación (art. 56)" ya lo dice).
 */
export function motivoVisibleDevolucion(d: { origen?: string | null; motivo?: string | null }): string | null {
  const motivo = (d.motivo ?? '').trim();
  if (d.origen === ORIGEN_REVOCACION) {
    const resto = motivo.startsWith(PREFIJO_MOTIVO_REVOCACION) ? motivo.slice(PREFIJO_MOTIVO_REVOCACION.length).trim() : motivo;
    return resto || null;
  }
  return motivo || 'Sin motivo';
}
