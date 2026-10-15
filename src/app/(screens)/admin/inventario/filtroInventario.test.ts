import { describe, expect, it } from 'vitest';
import { filtrarProductosInventario, insigniaEstadoProducto, productosActivos } from './filtroInventario';

/**
 * Inventario admin con borrado lógico: por defecto solo productos activos (disponibles o no);
 * "Mostrar inactivos" suma los desactivados. La insignia dice el estado de cada uno.
 */
const P = (id: number, extra: Partial<{ nombre: string; categoria: string; marca: string; activo: boolean; disponible: boolean }> = {}) => ({
  id,
  nombre: `Producto ${id}`,
  categoria: 'Cabello',
  marca: 'AVYNA',
  disponible: true,
  activo: true,
  ...extra,
});

const productos = [
  P(1),
  P(2, { disponible: false }),
  P(3, { activo: false }),
  P(4, { activo: false, nombre: 'Mascarilla QA', categoria: 'Tratamiento' }),
  P(5, { nombre: 'Shampoo morado' }),
];
const ids = (lista: { id: number }[]) => lista.map((p) => p.id);
const SIN_FILTROS = { busqueda: '', categoria: 'all', mostrarInactivos: false };

describe('filtrarProductosInventario', () => {
  it('sin "Mostrar inactivos" solo lista activos, disponibles o no', () => {
    expect(ids(filtrarProductosInventario(productos, SIN_FILTROS))).toEqual([1, 2, 5]);
  });

  it('con "Mostrar inactivos" suma los desactivados', () => {
    expect(ids(filtrarProductosInventario(productos, { ...SIN_FILTROS, mostrarInactivos: true }))).toEqual([1, 2, 3, 4, 5]);
  });

  it('la búsqueda y la categoría se siguen aplicando', () => {
    expect(ids(filtrarProductosInventario(productos, { ...SIN_FILTROS, busqueda: 'shampoo' }))).toEqual([5]);
    expect(ids(filtrarProductosInventario(productos, { ...SIN_FILTROS, categoria: 'Tratamiento', mostrarInactivos: true }))).toEqual([4]);
    expect(ids(filtrarProductosInventario(productos, { ...SIN_FILTROS, categoria: 'Tratamiento' }))).toEqual([]);
  });

  it('un producto sin el campo activo cuenta como activo', () => {
    const viejo = { id: 9, nombre: 'Sin campo', categoria: 'Cabello', marca: 'X', disponible: true };
    expect(ids(filtrarProductosInventario([viejo], SIN_FILTROS))).toEqual([9]);
  });
});

describe('productosActivos (KPIs y descuento global)', () => {
  it('deja fuera los desactivados', () => {
    expect(ids(productosActivos(productos))).toEqual([1, 2, 5]);
  });
});

describe('insigniaEstadoProducto', () => {
  // B14: en claro la insignia "Inactivo" (oro) se confundía con "Disponible" (verde): ahora es de aviso
  // y la tarjeta se atenúa.
  it('un desactivado dice "Inactivo" con insignia de aviso y tarjeta atenuada, aunque tenga presentaciones disponibles', () => {
    expect(insigniaEstadoProducto(P(3, { activo: false }))).toEqual({ texto: 'Inactivo', variante: 'warning', atenuada: true });
  });

  it('un activo dice si está disponible o no, sin atenuar', () => {
    expect(insigniaEstadoProducto(P(1))).toEqual({ texto: 'Disponible', variante: 'success', atenuada: false });
    expect(insigniaEstadoProducto(P(2, { disponible: false }))).toEqual({ texto: 'No disponible', variante: 'danger', atenuada: false });
  });
});
