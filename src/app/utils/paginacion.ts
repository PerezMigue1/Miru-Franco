/** Filas por página de las tablas que cargan la lista completa en el cliente (Clientes CRM, Usuarios). */
export const TAMANO_PAGINA_TABLA = 50;

/**
 * Página `pagina` (desde 1) de una lista ya cargada. Si la página no existe (la lista se acortó al
 * filtrar) se ajusta a la más cercana; sin filas queda una página vacía.
 */
export function paginar<T>(items: readonly T[], pagina: number, tamano = TAMANO_PAGINA_TABLA): { filas: T[]; pagina: number; totalPaginas: number } {
  const totalPaginas = Math.max(1, Math.ceil(items.length / tamano));
  const actual = Math.min(Math.max(1, Math.floor(pagina) || 1), totalPaginas);
  return { filas: items.slice((actual - 1) * tamano, actual * tamano), pagina: actual, totalPaginas };
}
