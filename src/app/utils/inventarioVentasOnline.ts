import {
  listarPedidos,
  listarPedidoItems,
  type EstadoPedidoUi,
  type PedidoApi,
} from '../services/ecommerce';

/** Pedidos que se consideran venta efectiva para inventario (excluye borrador, pendiente sin pago y cancelados). */
export const ESTADOS_PEDIDO_CONTABLES_VENTA: EstadoPedidoUi[] = [
  'pagado',
  'preparando',
  'enviado',
  'entregado',
];

export interface LineaVentaProducto {
  /** Coincide con `Producto.id` del catálogo (número o string según backend). */
  productoId: number | string;
  cantidad: number;
  subtotal: number;
  /** Fecha del pedido (ISO). */
  fechaIso: string;
  pedidoId: number;
  nombreProducto: string | null;
}

export interface SerieTemporalPunto {
  clave: string;
  etiqueta: string;
  unidades: number;
  monto: number;
}

function fechaValida(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function filtrarLineasPorProducto(lineas: LineaVentaProducto[], productoId: string | number): LineaVentaProducto[] {
  const key = String(productoId ?? '').trim();
  if (!key) return [];
  return lineas.filter((l) => String(l.productoId).trim() === key);
}

export function filtrarLineasDesdeFecha(lineas: LineaVentaProducto[], desde: Date): LineaVentaProducto[] {
  const t0 = desde.getTime();
  return lineas.filter((l) => {
    const d = fechaValida(l.fechaIso);
    return d != null && d.getTime() >= t0;
  });
}

/** Líneas cuyo `fechaIso` cae en [inicio, fin] (inclusivo, por instante de tiempo). */
export function filtrarLineasRangoFechasInclusivo(
  lineas: LineaVentaProducto[],
  inicio: Date,
  fin: Date,
): LineaVentaProducto[] {
  const t0 = inicio.getTime();
  const t1 = fin.getTime();
  return lineas.filter((l) => {
    const d = fechaValida(l.fechaIso);
    return d != null && d.getTime() >= t0 && d.getTime() <= t1;
  });
}

function claveDia(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function claveMes(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** Año y número de semana ISO (para agrupar). */
function claveSemanaISO(d: Date): { clave: string; etiqueta: string } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const y = date.getUTCFullYear();
  const clave = `${y}-W${String(weekNo).padStart(2, '0')}`;
  const etiqueta = `Sem. ${weekNo} ${y}`;
  return { clave, etiqueta };
}

type Granularidad = 'dia' | 'semana' | 'mes';

export function agregarSerieTemporal(
  lineas: LineaVentaProducto[],
  granularidad: Granularidad
): SerieTemporalPunto[] {
  const map = new Map<string, { etiqueta: string; unidades: number; monto: number }>();

  for (const l of lineas) {
    const d = fechaValida(l.fechaIso);
    if (!d) continue;
    let clave: string;
    let etiqueta: string;
    if (granularidad === 'dia') {
      clave = claveDia(d);
      etiqueta = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(d);
    } else if (granularidad === 'mes') {
      clave = claveMes(d);
      etiqueta = new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(d);
    } else {
      const s = claveSemanaISO(d);
      clave = s.clave;
      etiqueta = s.etiqueta;
    }
    const prev = map.get(clave) ?? { etiqueta, unidades: 0, monto: 0 };
    prev.unidades += l.cantidad;
    prev.monto += l.subtotal;
    map.set(clave, prev);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, v]) => ({
      clave,
      etiqueta: v.etiqueta,
      unidades: v.unidades,
      monto: v.monto,
    }));
}

/** Promedio simple de unidades por día en el rango observado (días con al menos un dato o span calendario). */
export function promedioUnidadesPorDia(lineasFiltradas: LineaVentaProducto[]): number {
  if (lineasFiltradas.length === 0) return 0;
  const fechas = lineasFiltradas
    .map((l) => fechaValida(l.fechaIso))
    .filter((d): d is Date => d != null)
    .map((d) => d.getTime());
  const minT = Math.min(...fechas);
  const maxT = Math.max(...fechas);
  const diasSpan = Math.max(1, Math.ceil((maxT - minT) / (86400000)) + 1);
  const totalU = lineasFiltradas.reduce((s, l) => s + l.cantidad, 0);
  return totalU / diasSpan;
}

export function proyeccionDemandaUnidades(promedioDiario: number, dias: number): number {
  return Math.round(promedioDiario * dias * 100) / 100;
}

/**
 * Descarga líneas de pedidos online con fecha del pedido. Llama a `/api/pedidos/:id/items` en lotes.
 */
export async function cargarLineasVentasDesdePedidosOnline(opts?: {
  estadosIncluir?: EstadoPedidoUi[];
}): Promise<{ lineas: LineaVentaProducto[]; pedidosAnalizados: number; error?: string }> {
  const estados = opts?.estadosIncluir ?? ESTADOS_PEDIDO_CONTABLES_VENTA;
  try {
    const pedidos = await listarPedidos();
    const contables: PedidoApi[] = pedidos.filter((p) => estados.includes(p.estado));
    const lineas: LineaVentaProducto[] = [];
    const chunk = 6;
    for (let i = 0; i < contables.length; i += chunk) {
      const slice = contables.slice(i, i + chunk);
      const itemsPorPedido = await Promise.all(slice.map((ped) => listarPedidoItems(ped.id)));
      itemsPorPedido.forEach((items, j) => {
        const ped = slice[j];
        const fechaIso = ped.creadoEn || ped.actualizadoEn || new Date().toISOString();
        for (const it of items) {
          lineas.push({
            productoId: it.productoId,
            cantidad: it.cantidad,
            subtotal: it.subtotal,
            fechaIso,
            pedidoId: ped.id,
            nombreProducto: it.nombreProducto ?? null,
          });
        }
      });
    }
    return { lineas, pedidosAnalizados: contables.length };
  } catch (e) {
    return {
      lineas: [],
      pedidosAnalizados: 0,
      error: e instanceof Error ? e.message : 'No se pudieron cargar los pedidos de la tienda.',
    };
  }
}
