/**
 * Cantidad de unidades escrita en un formulario de inventario o compras: entero >= mínimo, o null.
 * El backend valida @IsInt(), así que un decimal se rechaza aquí con mensaje en español.
 */
export function leerCantidadEntera(texto: string, minimo = 1): number | null {
  const limpio = String(texto ?? '').trim();
  if (!limpio) return null;
  const n = Number(limpio);
  if (!Number.isInteger(n) || n < minimo) return null;
  return n;
}
