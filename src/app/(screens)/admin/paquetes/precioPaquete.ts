import { formatearPrecioMXN } from '../../../utils/formatoPrecio';

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

/**
 * Precio para la tabla y los indicadores con el formateador de pesos del proyecto ("$1,100",
 * "$1,250.50"): antes el mismo precio salía como $1100, $1,100 y $1,100.00.
 */
export function mostrarPrecioPaquete(valor: string | number | null | undefined): string {
  return formatearPrecioMXN(valor) || 'Sin precio';
}
