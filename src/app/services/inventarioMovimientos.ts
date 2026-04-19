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
    usuarioNombre: s(r.usuarioNombre) || null,
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

