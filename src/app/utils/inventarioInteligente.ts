import type { Producto } from '../services/productos';
import type { LineaVentaProducto } from './inventarioVentasOnline';
import { agregarSerieTemporal, filtrarLineasDesdeFecha, filtrarLineasPorProducto, promedioUnidadesPorDia } from './inventarioVentasOnline';

/** Separa categoría / subcategoría si el texto usa separadores habituales; si no hay sub, devuelve sub vacía. */
export function parseCategoriaSub(categoria: string): { categoriaPrincipal: string; subcategoria: string } {
  const s = (categoria || '').trim();
  const separadores = [' > ', '>', ' / ', '|', ' — ', ' – ', ' - '];
  for (const sep of separadores) {
    const idx = s.indexOf(sep);
    if (idx !== -1) {
      const a = s.slice(0, idx).trim();
      const b = s.slice(idx + sep.length).trim();
      if (a && b) return { categoriaPrincipal: a, subcategoria: b };
    }
  }
  return { categoriaPrincipal: s || 'Sin categoría', subcategoria: '' };
}

/** Guarda en BD el mismo formato que entiende `parseCategoriaSub` (p. ej. `Cabello > Shampoos`). */
export function serializarCategoriaSub(categoriaPrincipal: string, subcategoria: string): string {
  const cat = (categoriaPrincipal || '').trim();
  const sub = (subcategoria || '').trim();
  if (!cat) return '';
  if (!sub) return cat;
  return `${cat} > ${sub}`;
}

export interface MovimientoInventario {
  id: string;
  fechaIso: string;
  tipo: 'salida' | 'entrada';
  concepto: string;
  cantidad: number;
  referencia?: string;
}

/** Salidas reales desde pedidos online. Entradas de almacén requieren API dedicada en backend. */
export function movimientosSalidaDesdeVentas(
  lineas: LineaVentaProducto[],
  productoId: string | number
): MovimientoInventario[] {
  return filtrarLineasPorProducto(lineas, productoId)
    .sort((a, b) => new Date(b.fechaIso).getTime() - new Date(a.fechaIso).getTime())
    .map((l, i) => ({
      id: `salida-${l.pedidoId}-${l.productoId}-${i}`,
      fechaIso: l.fechaIso,
      tipo: 'salida' as const,
      concepto: `Venta (pedido #${l.pedidoId})`,
      cantidad: l.cantidad,
      referencia: l.nombreProducto ?? undefined,
    }));
}

export type TendenciaConsumo = 'alta' | 'baja' | 'estable';

export function tendenciaDesdeSerieDiaria(valores: number[]): TendenciaConsumo {
  const n = valores.length;
  if (n < 4) return 'estable';
  const mid = Math.floor(n / 2);
  const a = valores.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const b = valores.slice(mid).reduce((s, v) => s + v, 0) / (n - mid);
  if (a <= 0 && b <= 0) return 'estable';
  const base = Math.max(a, 0.0001);
  if (b > base * 1.2) return 'alta';
  if (b < base * 0.8) return 'baja';
  return 'estable';
}

export function puntoReorden(unidadesPorDia: number, leadTimeDias: number, stockSeguridad: number): number {
  return Math.ceil(Math.max(0, unidadesPorDia) * Math.max(0, leadTimeDias) + Math.max(0, stockSeguridad));
}

export function stockProyectadoLineal(stockActual: number, unidadesPorDia: number, dias: number): number {
  return Math.max(0, stockActual - Math.max(0, unidadesPorDia) * Math.max(0, dias));
}

export function etiquetaTendencia(t: TendenciaConsumo): string {
  if (t === 'alta') return 'Alta';
  if (t === 'baja') return 'Baja';
  return 'Estable';
}

export interface ParticipacionPastel {
  etiqueta: string;
  valor: number;
  color: string;
}

const COLORES_PASTEL = [
  '#4A7BA7',
  '#6E7D57',
  '#D98E04',
  '#590C0C',
  '#8B5A8C',
  '#2A6F6F',
  '#C45C3E',
  '#5C6BC0',
];

export function participacionPorProducto(
  productos: Producto[],
  lineas: LineaVentaProducto[],
  filtroSub: (p: Producto) => boolean
): ParticipacionPastel[] {
  const map = new Map<string, number>();
  for (const l of lineas) {
    const key = String(l.productoId).trim();
    const pr = productos.find((x) => String(x.id) === key);
    if (!pr || !filtroSub(pr)) continue;
    map.set(key, (map.get(key) ?? 0) + l.cantidad);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  if (total <= 0) return [];
  let i = 0;
  return [...map.entries()]
    .map(([id, u]) => {
      const pr = productos.find((x) => String(x.id) === id);
      return {
        etiqueta: pr?.nombre ?? `#${id}`,
        valor: u,
        color: COLORES_PASTEL[i++ % COLORES_PASTEL.length],
      };
    })
    .sort((a, b) => b.valor - a.valor);
}

export function unidadesVendidasProducto(lineas: LineaVentaProducto[], productoId: string | number): number {
  return filtrarLineasPorProducto(lineas, productoId).reduce((s, l) => s + l.cantidad, 0);
}

/** Forma mínima para construir consumo desde `listarMovimientosInventario` cuando no hay pedidos online. */
export type MovimientoConsumoLite = {
  tipo: string;
  cantidad: number;
  creadoEn: string;
};

/**
 * Convierte salidas (y ajustes negativos) de inventario en pseudo-líneas de venta para reutilizar `agregarSerieTemporal`.
 */
export function lineasSalidaDesdeMovimientosInventario(
  movimientos: MovimientoConsumoLite[],
  productoId: string | number,
  desde: Date
): LineaVentaProducto[] {
  const t0 = desde.getTime();
  const out: LineaVentaProducto[] = [];
  let seq = 0;
  for (const m of movimientos) {
    const tipo = String(m.tipo || '').toLowerCase();
    const raw = Number(m.cantidad) || 0;
    let unidades = 0;
    if (tipo === 'salida') unidades = Math.abs(raw);
    else if (tipo === 'ajuste' && raw < 0) unidades = Math.abs(raw);
    if (unidades <= 0) continue;
    const d = new Date(m.creadoEn);
    if (Number.isNaN(d.getTime()) || d.getTime() < t0) continue;
    seq += 1;
    out.push({
      productoId,
      cantidad: unidades,
      subtotal: 0,
      fechaIso: m.creadoEn,
      pedidoId: -seq,
      nombreProducto: null,
    });
  }
  return out;
}

/**
 * Líneas del producto en la ventana de pedidos; si no hay ninguna, cae a salidas del historial de inventario.
 */
export function lineasConsumoDetalleProductoEnVentana(
  lineasVentana: LineaVentaProducto[],
  movimientos: MovimientoConsumoLite[],
  productoId: string | number,
  desde: Date
): { lineas: LineaVentaProducto[]; fuente: 'pedidos' | 'movimientos' } {
  const desdeLineas = filtrarLineasPorProducto(lineasVentana, productoId);
  if (desdeLineas.length > 0) return { lineas: desdeLineas, fuente: 'pedidos' };
  const fromMov = lineasSalidaDesdeMovimientosInventario(movimientos, productoId, desde);
  return { lineas: fromMov, fuente: 'movimientos' };
}

export function serieConsumoProducto(
  lineas: LineaVentaProducto[],
  productoId: string | number,
  desde: Date,
  granularidad: 'dia' | 'semana' | 'mes'
) {
  const filtradas = filtrarLineasPorProducto(filtrarLineasDesdeFecha(lineas, desde), productoId);
  return agregarSerieTemporal(filtradas, granularidad);
}

export function promedioDiarioProducto(lineas: LineaVentaProducto[], productoId: string | number, desde: Date): number {
  const filtradas = filtrarLineasPorProducto(filtrarLineasDesdeFecha(lineas, desde), productoId);
  return promedioUnidadesPorDia(filtradas);
}
