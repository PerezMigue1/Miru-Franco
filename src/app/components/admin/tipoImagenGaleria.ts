import type { TipoImagenGaleria } from '../../utils/cloudinary';

/**
 * Qué imagen se sube a la galería. Es obligatorio y empieza sin elegir: quien sube decide si es una foto
 * real de un trabajo del salón o una imagen ilustrativa (va a galeria/ilustrativas y lleva esa marca).
 */
export const OPCIONES_TIPO_IMAGEN: readonly { valor: TipoImagenGaleria; texto: string }[] = [
  { valor: 'real', texto: 'Foto real de un trabajo del salón' },
  { valor: 'ilustrativa', texto: 'Imagen ilustrativa' },
];

export const MENSAJE_FALTA_TIPO_IMAGEN = 'Elige si es una foto real de un trabajo del salón o una imagen ilustrativa.';

/** Mensaje si todavía no se eligió el tipo (null: se puede subir). */
export function errorTipoImagen(tipo: TipoImagenGaleria | null): string | null {
  return tipo ? null : MENSAJE_FALTA_TIPO_IMAGEN;
}
