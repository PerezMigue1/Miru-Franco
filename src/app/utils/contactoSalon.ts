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

/**
 * Horario de atención: la única fuente para el pie de página, /contacto, los términos y "recoger en el salón".
 * Debe coincidir con configuracion_salon en la base, que es la que usa la agenda de citas.
 */
const TRAMOS_HORARIO = [
  { dias: 'Lunes a viernes', abre: '9:30', cierra: '19:30' },
  { dias: 'Sábados', abre: '9:30', cierra: '19:00' },
] as const;
const FRASES_HORARIO = [...TRAMOS_HORARIO.map((t) => `${t.dias} de ${t.abre} a ${t.cierra} h.`), 'Domingos cerrado.'];

export const HORARIO_SALON = {
  /** Una frase por tramo, para mostrarlas en líneas separadas. */
  frases: FRASES_HORARIO,
  /** "Lunes a viernes de 9:30 a 19:30 h. Sábados de 9:30 a 19:00 h. Domingos cerrado." */
  texto: FRASES_HORARIO.join(' '),
} as const;
