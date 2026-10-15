import { getEstadoColor, type BadgeVariant } from '../../../utils/categoryColors';

/** Lo mínimo de un producto que usa el listado del inventario. */
type ProductoInventario = {
  nombre: string;
  categoria?: string;
  marca?: string;
  disponible: boolean;
  /** Borrado lógico: false = desactivado. Sin el campo cuenta como activo. */
  activo?: boolean;
};

export type FiltroInventario = {
  busqueda: string;
  /** 'all' = todas las categorías. */
  categoria: string;
  /** "Mostrar inactivos": suma los productos desactivados al listado. */
  mostrarInactivos: boolean;
};

const esActivo = (p: { activo?: boolean }) => p.activo !== false;

/** Productos activos: los KPIs y el descuento global no cuentan a los desactivados. */
export function productosActivos<T extends { activo?: boolean }>(productos: T[]): T[] {
  return productos.filter(esActivo);
}

/**
 * Listado del inventario: por defecto solo activos (disponibles o no); con "Mostrar inactivos"
 * también los desactivados. Búsqueda por nombre, categoría o marca, y filtro de categoría.
 */
export function filtrarProductosInventario<T extends ProductoInventario>(productos: T[], filtro: FiltroInventario): T[] {
  const q = filtro.busqueda.toLowerCase();
  return productos.filter((p) => {
    const texto = `${p.nombre} ${p.categoria ?? ''} ${p.marca ?? ''}`.toLowerCase();
    const coincideBusqueda = !q || texto.includes(q);
    const coincideCategoria = filtro.categoria === 'all' || p.categoria === filtro.categoria;
    const coincideEstado = filtro.mostrarInactivos || esActivo(p);
    return coincideBusqueda && coincideCategoria && coincideEstado;
  });
}

/**
 * Insignia de estado de la tarjeta: "Inactivo" si está desactivado; si no, su disponibilidad.
 * El inactivo va con insignia de aviso y la tarjeta atenuada: con la insignia oro, en claro se
 * confundía con "Disponible".
 */
export function insigniaEstadoProducto(p: { activo?: boolean; disponible: boolean }): { texto: string; variante: BadgeVariant; atenuada: boolean } {
  if (!esActivo(p)) return { texto: 'Inactivo', variante: 'warning', atenuada: true };
  return { texto: p.disponible ? 'Disponible' : 'No disponible', variante: getEstadoColor(p.disponible), atenuada: false };
}
