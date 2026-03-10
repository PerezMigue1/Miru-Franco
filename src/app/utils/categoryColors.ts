/**
 * Colores para badges por tipo de dato.
 * Solo 2 colores por dato.
 *
 * - Categoría: sin categoría → un color; con categoría → otro color.
 * - Estado (disponible/agotado): 2 colores fijos.
 * - Descuento: 2 colores (sin descuento / con descuento).
 */

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

/** 2 colores para categoría: sin categoría / con categoría. */
const CATEGORIA_SIN: BadgeVariant = 'default';
const CATEGORIA_CON: BadgeVariant = 'info';

/** 2 colores para estado de disponibilidad. */
const ESTADO_DISPONIBLE: BadgeVariant = 'success';
const ESTADO_AGOTADO: BadgeVariant = 'danger';

/** 2 colores para descuento: sin descuento (success, distinto a categoria/estado) / con descuento. */
const DESCUENTO_SIN: BadgeVariant = 'success';
const DESCUENTO_CON: BadgeVariant = 'warning';

/**
 * Color para categoría. Solo 2: sin categoría → default; con categoría → info.
 */
export function getCategoryColor(categoria: string): BadgeVariant {
  if (!categoria || typeof categoria !== 'string' || !categoria.trim()) return CATEGORIA_SIN;
  return CATEGORIA_CON;
}

/**
 * Color para estado disponible/agotado. Solo 2 colores.
 */
export function getEstadoColor(disponible: boolean): BadgeVariant {
  return disponible ? ESTADO_DISPONIBLE : ESTADO_AGOTADO;
}

/**
 * Color para descuento. Solo 2: sin descuento → default; con descuento → warning.
 */
export function getDescuentoColor(porcentaje: number): BadgeVariant {
  if (!porcentaje || porcentaje <= 0) return DESCUENTO_SIN;
  return DESCUENTO_CON;
}
