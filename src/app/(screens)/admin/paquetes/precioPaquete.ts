/**
 * Precio especial de un paquete escrito en el formulario: número válido (0 o más) o null.
 * Quita "$", comas y espacios pero conserva el signo, para no convertir "-500" en 500.
 */
export function leerPrecioPaquete(texto: string | number): number | null {
  const limpio = String(texto).trim().replace(/[$,\s]/g, '');
  if (!limpio) return null;
  const precioNum = Number(limpio);
  if (!Number.isFinite(precioNum) || precioNum < 0) return null;
  return precioNum;
}
