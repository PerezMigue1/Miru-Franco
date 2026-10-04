import { formatearFechaSoloDia } from './fechaSoloDia';

/**
 * Plazos que cita la página /terminos-y-condiciones. El texto lee estos valores: para cambiar un plazo
 * se cambia aquí y la página se actualiza sola.
 * Los de pago en línea y apartados deben coincidir con el backend (VIGENCIA_PEDIDO_EN_LINEA_MS en
 * flujo-pedido.ts y las constantes DIAS_* de apartados.service.ts), que es quien cancela los pedidos.
 */
export const PLAZOS_TERMINOS = {
  /** Días naturales para cambiar un producto después de recogerlo. */
  diasCambioProducto: 7,
  /** Días que se guarda un pedido pagado en línea desde el aviso de "listo para recoger". */
  diasResguardoPedidoPagado: 15,
  /** Minutos de tolerancia para llegar a una cita. */
  minutosToleranciaCita: 15,
  /** Días para reportar un servicio con el que no quedó satisfecha. */
  diasGarantiaServicio: 7,
  /** Horas para completar el pago en línea antes de que el pedido se cancele. */
  horasPagoEnLinea: 24,
  /** Horas para pagar el anticipo de una cita agendada en línea antes de que se libere (HORAS_ANTICIPO_CITA del backend). */
  horasAnticipoCita: 2,
  /** Días para preparar un apartado antes de que se cancele. */
  diasApartadoSinPreparar: 3,
  /** Día, desde que el apartado está listo, en que se manda el recordatorio. */
  diasRecordatorioApartado: 3,
  /** Días, desde que el apartado está listo, para recogerlo antes de que se cancele. */
  diasApartadoListo: 7,
  /** Fecha de la última actualización del texto (día de calendario, YYYY-MM-DD). */
  fechaActualizacion: '2026-10-04',
} as const;

/** "4 de octubre de 2026": la fecha de actualización sin desfase por zona horaria. */
export function fechaActualizacionTerminos(): string {
  return (
    formatearFechaSoloDia(PLAZOS_TERMINOS.fechaActualizacion, { day: 'numeric', month: 'long', year: 'numeric' }) ??
    PLAZOS_TERMINOS.fechaActualizacion
  );
}
