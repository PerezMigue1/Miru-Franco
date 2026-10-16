import { HORARIO_SALON, TELEFONO_SALON } from '../../../../../utils/contactoSalon';
import { frasesHorario, type HorarioDia } from '../../../../../services/configuracionSitio';
import { listaMetodosSalon, REGLAS_PUBLICAS_POR_OMISION, type ReglasPublicas } from '../../../../../utils/reglasNegocio';

/**
 * Información de comercio electrónico del checkout (LFPC art. 76 BIS y 7 BIS): quién vende, precios, pago,
 * entrega y quejas. Solo dice lo que el sistema hace hoy. Los datos del proveedor son los que publican los
 * Términos y Condiciones (la prueba revisa que coincidan con esa página).
 */
export const PROVEEDOR = {
  nombreComercial: 'Mirú Franco Salón Beauty',
  responsable: 'Mildred Rubí Franco Martínez',
  domicilio: 'Segunda Cerrada de Allende No. 15, Col. Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000',
  correo: 'mildredfranco24@gmail.com',
  telefono: TELEFONO_SALON,
} as const;

export const LEYENDA_PRECIOS = 'Precios en pesos mexicanos con IVA incluido.';

/** El servidor crea el pedido con el precio vigente de cada producto; el carrito guarda el que vio al agregarlo. */
export const NOTA_TOTAL_COBRADO =
  'Si el precio de algún producto cambió desde que lo agregaste a tu carrito, tu pedido se crea con el precio vigente: lo ves en Mercado Pago o en la confirmación de tu pedido antes de pagar.';

/** Formas de pago activas en Admin > Configuración del sitio > Reglas, con sus plazos. Una apagada no se ofrece. */
export function condicionesPago(reglas: ReglasPublicas): { titulo: string; texto: string }[] {
  const condiciones: { titulo: string; texto: string }[] = [];
  if (reglas.pagos.mercadoPagoTienda) {
    condiciones.push({
      titulo: 'Pagar en línea',
      texto: `Con tarjeta en la página segura de Mercado Pago. Tienes ${reglas.tienda.plazoPagoLineaHoras} horas para completar el pago; si no, el pedido se cancela.`,
    });
  }
  if (reglas.pagos.metodosSalon.length > 0) {
    const metodos = listaMetodosSalon(reglas.pagos.metodosSalon);
    condiciones.push({
      titulo: 'Pagar al recoger en el salón',
      texto: `En ${metodos === 'efectivo, tarjeta o transferencia' ? 'efectivo, transferencia o tarjeta' : metodos}, según los medios disponibles en el salón. Si no recoges tu apartado en ${reglas.tienda.diasCancelarNoRecogido} días desde que te avisamos que está listo, se cancela.`,
    });
  }
  return condiciones;
}

/** Las de hoy (respaldo si el API no responde). */
export const CONDICIONES_PAGO: readonly { titulo: string; texto: string }[] = condicionesPago(REGLAS_PUBLICAS_POR_OMISION);

export const ENTREGA = `Recoges tu pedido en el salón, en el domicilio de arriba. ${HORARIO_SALON.texto} No hacemos envíos a domicilio.`;

/** La entrega con el horario de Configuración del sitio (por omisión, el mismo texto de ENTREGA). */
export function textoEntrega(dias: HorarioDia[]): string {
  return `Recoges tu pedido en el salón, en el domicilio de arriba. ${frasesHorario(dias).join(' ')} No hacemos envíos a domicilio.`;
}

export const QUEJAS = 'Si tienes una queja, escríbenos o llámanos primero: queremos resolverla contigo.';
