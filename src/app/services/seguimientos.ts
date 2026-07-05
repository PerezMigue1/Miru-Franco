'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface SeguimientoApi {
  id: number;
  usuarioId: string;
  clienteNombre?: string | null;
  citaId?: number | null;
  notas: string;
  fechaContacto: string;
  satisfaccion?: number | null;
  requiereAccion: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface CrearSeguimientoPayload {
  usuarioId: string;
  citaId?: number;
  notas: string;
  fechaContacto: string;
  satisfaccion?: number;
  requiereAccion: boolean;
}

interface ListadoSeguimientosResp {
  success?: boolean;
  count?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  data?: unknown[];
}

function s(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function n(v: unknown, d: number | null = null): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function normalizarSeguimiento(x: unknown): SeguimientoApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  return {
    id: Number(n(r.id, 0) ?? 0),
    usuarioId: s(r.usuarioId ?? r.usuario_id),
    clienteNombre: s(r.clienteNombre ?? r.cliente_nombre) || null,
    citaId: n(r.citaId ?? r.cita_id),
    notas: s(r.notas),
    fechaContacto: s(r.fechaContacto ?? r.fecha_contacto),
    satisfaccion: n(r.satisfaccion),
    requiereAccion: r.requiereAccion === true || r.requiere_accion === true,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
    actualizadoEn: s(r.actualizadoEn ?? r.actualizado_en) || undefined,
  };
}

export interface ListarSeguimientosParams {
  clienteId?: string;
  requiereAccion?: boolean;
  page?: number;
  limit?: number;
}

export async function listarSeguimientos(
  params?: ListarSeguimientosParams
): Promise<{ data: SeguimientoApi[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.clienteId) sp.set('clienteId', params.clienteId);
  if (params?.requiereAccion !== undefined) sp.set('requiereAccion', String(params.requiereAccion));
  sp.set('page', String(params?.page ?? 1));
  sp.set('limit', String(params?.limit ?? 50));
  const endpoint = `/api/seguimientos?${sp.toString()}`;
  const res = await apiClient.get<ListadoSeguimientosResp>(endpoint, { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarSeguimiento).filter((s): s is SeguimientoApi => Boolean(s))
    : Array.isArray(res)
    ? (res as unknown[]).map(normalizarSeguimiento).filter((s): s is SeguimientoApi => Boolean(s))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function listarSeguimientosPorCliente(clienteId: string): Promise<SeguimientoApi[]> {
  const res = await apiClient.get<unknown>(`/api/seguimientos/cliente/${clienteId}`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[]).map(normalizarSeguimiento).filter((s): s is SeguimientoApi => Boolean(s));
}

export async function obtenerSeguimiento(id: number): Promise<SeguimientoApi | null> {
  const res = await apiClient.get<unknown>(`/api/seguimientos/${id}`, { customBase: getBackendBaseUrl() });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  return normalizarSeguimiento(obj);
}

export async function crearSeguimiento(payload: CrearSeguimientoPayload): Promise<SeguimientoApi> {
  const res = await apiClient.post<unknown>('/api/seguimientos', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const seg = normalizarSeguimiento(obj);
  if (!seg) throw new Error('No se pudo crear el seguimiento');
  return seg;
}

export async function actualizarSeguimiento(
  id: number,
  payload: Partial<CrearSeguimientoPayload>
): Promise<SeguimientoApi> {
  const res = await apiClient.put<unknown>(`/api/seguimientos/${id}`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const seg = normalizarSeguimiento(obj);
  if (!seg) throw new Error('No se pudo actualizar el seguimiento');
  return seg;
}
