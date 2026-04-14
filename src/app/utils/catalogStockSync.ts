/**
 * El stock real vive en el backend (productoPresentacion.stock / disponible).
 * Tras crear o mutar pedidos de forma que el servidor ajuste inventario, se emite
 * este evento para que catálogo, fichas y paneles admin vuelvan a leer la API.
 */
export const MIRU_CATALOG_STOCK_CHANGED = 'miru-catalog-stock-changed';

export function emitCatalogStockChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MIRU_CATALOG_STOCK_CHANGED));
}
