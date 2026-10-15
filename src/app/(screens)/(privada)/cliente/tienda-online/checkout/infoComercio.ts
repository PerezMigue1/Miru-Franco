import { HORARIO_SALON, TELEFONO_SALON } from '../../../../../utils/contactoSalon';
import { PLAZOS_TERMINOS as P } from '../../../../../utils/terminosCondiciones';

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

export const CONDICIONES_PAGO: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'Pagar en línea',
    texto: `Con tarjeta en la página segura de Mercado Pago. Tienes ${P.horasPagoEnLinea} horas para completar el pago; si no, el pedido se cancela.`,
  },
  {
    titulo: 'Pagar al recoger en el salón',
    texto: `En efectivo, transferencia o tarjeta, según los medios disponibles en el salón. Si no recoges tu apartado en ${P.diasApartadoListo} días desde que te avisamos que está listo, se cancela.`,
  },
];

export const ENTREGA = `Recoges tu pedido en el salón, en el domicilio de arriba. ${HORARIO_SALON.texto} No hacemos envíos a domicilio.`;

export const QUEJAS = 'Si tienes una queja, escríbenos o llámanos primero: queremos resolverla contigo.';
