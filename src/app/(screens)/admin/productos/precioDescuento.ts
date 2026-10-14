/**
 * Precios de las presentaciones en la edición de un producto del panel.
 * Funciones puras para poder probarlas sin DOM.
 *
 * Al cargar, el formulario muestra el precio guardado tal cual: el campo `descuento` del producto
 * no es fiable (en BD hay productos con valores mayores que 100) y recalcular desde él reescribía el
 * precio al guardar cualquier cambio. El precio solo se recalcula cuando la persona edita el descuento.
 */

/** Precio con el porcentaje aplicado, siempre entre 0 y el precio original. */
function calcularPrecioDesdeDescuento(precioOriginal: number, descuento: number): number {
  const base = Number.isFinite(precioOriginal) && precioOriginal > 0 ? precioOriginal : 0;
  const pct = Math.min(100, Math.max(0, Number.isFinite(descuento) ? descuento : 0));
  if (!base || !pct) return base;
  const final = Math.round(base * (1 - pct / 100));
  return Math.min(base, Math.max(0, final));
}

export function parseNumero(str: string | undefined): number {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

/** Precio original y precio de venta de una presentación tal como se cargan en el formulario. */
export function preciosFilaDesdePresentacion(
  pr: { precio: string; precioOriginal?: string },
): { precioOriginal: string; precio: string } {
  const base = parseNumero(pr.precioOriginal ?? pr.precio);
  return { precioOriginal: String(base || '0'), precio: String(parseNumero(pr.precio)) };
}

/** Recalcula el precio de venta de cada fila cuando la persona cambia el descuento. */
export function recalcularPreciosPorDescuento<T extends { precioOriginal: string; precio: string }>(
  filas: T[],
  descuentoStr: string,
): T[] {
  const descuentoNum = parseFloat(descuentoStr) || 0;
  return filas.map((pr) => {
    const base = parseFloat(pr.precioOriginal) || 0;
    return { ...pr, precio: String(calcularPrecioDesdeDescuento(base, descuentoNum)) };
  });
}
