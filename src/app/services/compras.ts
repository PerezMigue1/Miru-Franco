'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface CompraItemApi {
  id: number;
  presentacionId: number;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  presentacionTamanio?: string | null;
  productoNombre?: string | null;
}

export interface CompraApi {
  id: number;
  proveedorId: number;
  proveedorNombre?: string | null;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  fecha: string;
  total: number;
  notas?: string | null;
  items: CompraItemApi[];
  creadoEn?: string;
}

export interface CrearCompraItemPayload {
  presentacionId: number;
  cantidad: number;
  costoUnitario: number;
}

export interface CrearCompraPayload {
  proveedorId: number;
  fecha?: string;
  notas?: string;
  items: CrearCompraItemPayload[];
}

interface ListadoComprasResp {
  success?: boolean;
  count?: number;
  data?: unknown[];
}

function s(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function n(v: unknown, d: number | null = null): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function normalizarItem(x: unknown): CompraItemApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const presentacion = r.presentacion as Record<string, unknown> | undefined;
  const producto = presentacion?.producto as Record<string, unknown> | undefined;
  return {
    id: Number(n(r.id, 0) ?? 0),
    presentacionId: Number(n(r.presentacionId ?? r.presentacion_id, 0) ?? 0),
    cantidad: Number(n(r.cantidad, 0) ?? 0),
    costoUnitario: Number(n(r.costoUnitario ?? r.costo_unitario, 0) ?? 0),
    subtotal: Number(n(r.subtotal, 0) ?? 0),
    presentacionTamanio: s(presentacion?.tamanio) || null,
    productoNombre: s(producto?.nombre) || null,
  };
}

function normalizarCompra(x: unknown): CompraApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const proveedor = r.proveedor as Record<string, unknown> | undefined;
  const usuario = r.usuario as Record<string, unknown> | undefined;
  const items = Array.isArray(r.items) ? r.items.map(normalizarItem).filter((i): i is CompraItemApi => Boolean(i)) : [];
  return {
    id: Number(n(r.id, 0) ?? 0),
    proveedorId: Number(n(r.proveedorId ?? r.proveedor_id, 0) ?? 0),
    proveedorNombre: s(r.proveedorNombre ?? proveedor?.nombre) || null,
    usuarioId: s(r.usuarioId ?? r.usuario_id) || null,
    usuarioNombre: s(usuario?.nombre) || null,
    fecha: s(r.fecha),
    total: Number(n(r.total, 0) ?? 0),
    notas: s(r.notas) || null,
    items,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

export async function listarCompras(): Promise<{ data: CompraApi[]; total: number }> {
  const res = await apiClient.get<ListadoComprasResp>('/api/compras', { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarCompra).filter((c): c is CompraApi => Boolean(c))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function crearCompra(payload: CrearCompraPayload): Promise<CompraApi> {
  const res = await apiClient.post<unknown>('/api/compras', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const compra = normalizarCompra(obj);
  if (!compra) throw new Error('No se pudo registrar la compra');
  return compra;
}
