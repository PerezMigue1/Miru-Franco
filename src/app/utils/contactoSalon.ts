/**
 * Teléfono público del salón (pie de página y /contacto). Si se pone en `null`, las filas de
 * teléfono no se pintan.
 */
export const TELEFONO_SALON: { visible: string; enlace: string } | null = {
  visible: '+52 771 268 1432',
  enlace: 'tel:+527712681432',
};

/** Nombre con el que la clienta reconoce el lugar donde recoge su pedido. */
export const NOMBRE_SALON = 'Mirú Franco Beauty Salón';

/**
 * Dirección exacta del salón para recoger pedidos (variable de entorno pública). Mientras no se
 * configure, la clienta ve solo la ciudad y el teléfono: nunca una calle sin confirmar.
 */
export const DIRECCION_SALON: string | null = process.env.NEXT_PUBLIC_SALON_DIRECCION?.trim() || null;
export const CIUDAD_SALON = 'Huejutla de Reyes, Hidalgo';

/** Horario de atención, el mismo que publica /contacto. */
export const HORARIO_SALON = { dias: 'Lunes a sábado', horas: '9:00 a 20:00', cerrado: 'Domingo cerrado' } as const;
