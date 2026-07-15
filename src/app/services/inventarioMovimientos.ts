'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export type TipoMovimientoInventario = 'entrada' | 'salida' | 'ajuste';

export interface InventarioMovimientoApi {
  id: string;
  tipo: TipoMovimientoInventario;
  motivo: string;
  cantidad: number;
  stockAntes: number | null;
  stockDespues: number | null;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  creadoEn: string;
  presentacionId?: number | null;
  productoId?: number | null;
  productoNombre?: string | null;
  tamanio?: string | null;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
}

interface ListadoMovimientosResp {
  success?: boolean;
  count?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  data?: unknown[];
}

export interface ListarMovimientosParams {
  productoId?: number | string;
  presentacionId?: number;
  desde?: string;
  hasta?: string;
  tipo?: TipoMovimientoInventario;
  page?: number;
  limit?: number;
  sort?: 'creadoEn:asc' | 'creadoEn:desc';
}

function n(v: unknown, d: number | null = null): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function s(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function normalizarMovimiento(x: unknown): InventarioMovimientoApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const tipoRaw = s(r.tipo).toLowerCase();
  const tipo: TipoMovimientoInventario =
    tipoRaw === 'entrada' || tipoRaw === 'salida' || tipoRaw === 'ajuste' ? tipoRaw : 'salida';
  return {
    id: String(r.id ?? ''),
    tipo,
    motivo: s(r.motivo) || 'sin_motivo',
    cantidad: Number(n(r.cantidad, 0) ?? 0),
    stockAntes: n(r.stockAntes),
    stockDespues: n(r.stockDespues),
    referenciaTipo: s(r.referenciaTipo) || null,
    referenciaId: s(r.referenciaId) || null,
    creadoEn: s(r.creadoEn),
    presentacionId: n(r.presentacionId),
    productoId: n(r.productoId),
    productoNombre: s(r.productoNombre) || null,
    tamanio: s(r.tamanio) || null,
    usuarioId: s(r.usuarioId) || null,
    // listarMovimientosInventario manda usuarioNombre plano (SQL); obtenerKardex lo anida en usuario.nombre.
    usuarioNombre: s(r.usuarioNombre) || s((r.usuario as Record<string, unknown> | undefined)?.nombre) || null,
  };
}

export async function listarMovimientosInventario(
  params: ListarMovimientosParams
): Promise<{ data: InventarioMovimientoApi[]; total: number }> {
  const sp = new URLSearchParams();
  if (params.productoId != null) sp.set('productoId', String(params.productoId));
  if (params.presentacionId != null) sp.set('presentacionId', String(params.presentacionId));
  if (params.desde) sp.set('desde', params.desde);
  if (params.hasta) sp.set('hasta', params.hasta);
  if (params.tipo) sp.set('tipo', params.tipo);
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 80));
  sp.set('sort', params.sort ?? 'creadoEn:desc');
  const endpoint = `/api/inventario/movimientos?${sp.toString()}`;
  const res = await apiClient.get<ListadoMovimientosResp>(endpoint, { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarMovimiento).filter((m): m is InventarioMovimientoApi => Boolean(m))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

// --- Funciones adicionales de inventario ---

export async function registrarEntrada(payload: {
  presentacionId: number;
  cantidad: number;
  motivo?: string;
}): Promise<InventarioMovimientoApi> {
  const res = await apiClient.post<unknown>('/api/inventario/entradas', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const mov = normalizarMovimiento(obj);
  if (!mov) throw new Error('No se pudo registrar la entrada');
  return mov;
}

export async function registrarSalida(payload: {
  presentacionId: number;
  cantidad: number;
  motivo?: string;
}): Promise<InventarioMovimientoApi> {
  const res = await apiClient.post<unknown>('/api/inventario/salidas', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const mov = normalizarMovimiento(obj);
  if (!mov) throw new Error('No se pudo registrar la salida');
  return mov;
}

export async function registrarAjuste(payload: {
  presentacionId: number;
  stockReal: number;
  motivo: string;
}): Promise<InventarioMovimientoApi> {
  const res = await apiClient.post<unknown>('/api/inventario/ajustes', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const mov = normalizarMovimiento(obj);
  if (!mov) throw new Error('No se pudo registrar el ajuste');
  return mov;
}

export async function conteoFisico(payload: {
  items: Array<{ presentacionId: number; stockReal: number }>;
  motivo?: string;
}): Promise<void> {
  await apiClient.post<unknown>('/api/inventario/conteo-fisico', payload, getBackendBaseUrl());
}

export interface KardexItemApi {
  id: string;
  tipo: TipoMovimientoInventario;
  motivo: string;
  cantidad: number;
  stockAntes: number | null;
  stockDespues: number | null;
  creadoEn: string;
}

export async function obtenerKardex(presentacionId: number): Promise<KardexItemApi[]> {
  const res = await apiClient.get<unknown>(`/api/inventario/kardex/${presentacionId}`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[])
    .map(normalizarMovimiento)
    .filter((m): m is InventarioMovimientoApi => Boolean(m))
    .map((m) => ({
      id: m.id,
      tipo: m.tipo,
      motivo: m.motivo,
      cantidad: m.cantidad,
      stockAntes: m.stockAntes,
      stockDespues: m.stockDespues,
      creadoEn: m.creadoEn,
    }));
}

export interface AlertaStockApi {
  presentacionId: number;
  productoNombre: string | null;
  tamanio: string | null;
  stockActual: number;
  umbral: number;
}

/** Extrae el nombre del producto, ya sea plano (`productoNombre`) o anidado (`producto.nombre`, forma real del backend). */
function nombreProducto(r: Record<string, unknown>): string | null {
  if (typeof r.productoNombre === 'string' && r.productoNombre) return r.productoNombre;
  if (typeof r.producto_nombre === 'string' && r.producto_nombre) return r.producto_nombre;
  const producto = r.producto;
  if (producto && typeof producto === 'object') {
    const nombre = (producto as Record<string, unknown>).nombre;
    if (typeof nombre === 'string' && nombre) return nombre;
  }
  return null;
}

export async function obtenerAlertasStock(umbral?: number): Promise<AlertaStockApi[]> {
  const sp = new URLSearchParams();
  if (umbral != null) sp.set('umbral', String(umbral));
  const res = await apiClient.get<unknown>(`/api/inventario/alertas-stock?${sp.toString()}`, { customBase: getBackendBaseUrl() });
  const resObj = (res && typeof res === 'object') ? (res as Record<string, unknown>) : {};
  const umbralRespuesta = Number(n(resObj.umbral, umbral ?? 0) ?? 0);
  const arr = Array.isArray(res) ? res : Array.isArray(resObj.data) ? (resObj.data as unknown[]) : [];
  return (arr as unknown[]).map((x) => {
    const r = (x || {}) as Record<string, unknown>;
    return {
      // El backend identifica la presentación con `id`, no `presentacionId`.
      presentacionId: Number(n(r.presentacionId ?? r.presentacion_id ?? r.id, 0) ?? 0),
      productoNombre: nombreProducto(r),
      tamanio: s(r.tamanio) || null,
      stockActual: Number(n(r.stockActual ?? r.stock_actual ?? r.stock, 0) ?? 0),
      umbral: Number(n(r.umbral, umbralRespuesta) ?? umbralRespuesta),
    };
  });
}

export interface CaducidadApi {
  presentacionId: number;
  productoNombre: string | null;
  tamanio: string | null;
  stock: number;
  fechaCaducidad: string | null;
  diasRestantes: number;
  vencida: boolean;
}

export async function obtenerCaducidades(dias?: number): Promise<CaducidadApi[]> {
  const sp = new URLSearchParams();
  if (dias != null) sp.set('dias', String(dias));
  const res = await apiClient.get<unknown>(`/api/inventario/caducidades?${sp.toString()}`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[]).map((x) => {
    const r = (x || {}) as Record<string, unknown>;
    const fechaCad = s(r.fechaCaducidad ?? r.fecha_caducidad) || null;
    // El backend ya calcula diasRestantes/vencida; se usa ese valor y solo se recalcula si faltara.
    const diasRestantes = typeof r.diasRestantes === 'number'
      ? r.diasRestantes
      : fechaCad
        ? Math.round((new Date(fechaCad).getTime() - Date.now()) / 86400000)
        : 0;
    return {
      // El backend identifica la presentación con `id`, no `presentacionId`.
      presentacionId: Number(n(r.presentacionId ?? r.presentacion_id ?? r.id, 0) ?? 0),
      productoNombre: nombreProducto(r),
      tamanio: s(r.tamanio) || null,
      stock: Number(n(r.stock ?? r.stockActual ?? r.stock_actual, 0) ?? 0),
      fechaCaducidad: fechaCad,
      diasRestantes,
      vencida: r.vencida === true || diasRestantes < 0,
    };
  });
}

