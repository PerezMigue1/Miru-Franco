'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface ProveedorApi {
  id: number;
  nombre: string;
  contacto?: string | null;
  productos?: string | null;
  direccion?: string | null;
  compras: number;
  ultimaCompra?: string | null;
  creadoEn?: string;
}

export interface CrearProveedorPayload {
  nombre: string;
  contacto?: string;
  productos?: string;
  direccion?: string;
}

interface ListadoProveedoresResp {
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

function normalizarProveedor(x: unknown): ProveedorApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  return {
    id: Number(n(r.id, 0) ?? 0),
    nombre: s(r.nombre),
    contacto: s(r.contacto) || null,
    productos: s(r.productos) || null,
    direccion: s(r.direccion) || null,
    compras: Number(n(r.compras, 0) ?? 0),
    ultimaCompra: s(r.ultimaCompra ?? r.ultima_compra) || null,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

export async function listarProveedores(): Promise<{ data: ProveedorApi[]; total: number }> {
  const res = await apiClient.get<ListadoProveedoresResp>('/api/proveedores', { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarProveedor).filter((p): p is ProveedorApi => Boolean(p))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function crearProveedor(payload: CrearProveedorPayload): Promise<ProveedorApi> {
  const res = await apiClient.post<unknown>('/api/proveedores', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const proveedor = normalizarProveedor(obj);
  if (!proveedor) throw new Error('No se pudo crear el proveedor');
  return proveedor;
}

export async function actualizarProveedor(
  id: number,
  payload: Partial<CrearProveedorPayload>
): Promise<ProveedorApi> {
  const res = await apiClient.put<unknown>(`/api/proveedores/${id}`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const proveedor = normalizarProveedor(obj);
  if (!proveedor) throw new Error('No se pudo actualizar el proveedor');
  return proveedor;
}

export async function eliminarProveedor(id: number): Promise<void> {
  await apiClient.delete(`/api/proveedores/${id}`, getBackendBaseUrl());
}
