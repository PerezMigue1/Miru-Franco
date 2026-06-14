'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export type EstadoQueja = 'abierta' | 'en_proceso' | 'resuelta' | 'cerrada';

export interface QuejaApi {
  id: number;
  asunto: string;
  descripcion: string;
  estado: EstadoQueja;
  usuarioId?: string | null;
  clienteNombre?: string | null;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface CrearQuejaPayload {
  asunto: string;
  descripcion: string;
  usuarioId?: string;
}

interface ListadoQuejasResp {
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

function normalizarQueja(x: unknown): QuejaApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const estadoRaw = s(r.estado).toLowerCase();
  const estadosValidos: EstadoQueja[] = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];
  const estado: EstadoQueja = estadosValidos.includes(estadoRaw as EstadoQueja)
    ? (estadoRaw as EstadoQueja)
    : 'abierta';
  return {
    id: Number(n(r.id, 0) ?? 0),
    asunto: s(r.asunto),
    descripcion: s(r.descripcion),
    estado,
    usuarioId: s(r.usuarioId ?? r.usuario_id) || null,
    clienteNombre: s(r.clienteNombre ?? r.cliente_nombre) || null,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
    actualizadoEn: s(r.actualizadoEn ?? r.actualizado_en) || undefined,
  };
}

export interface ListarQuejasParams {
  estado?: string;
  page?: number;
  limit?: number;
}

export async function listarQuejas(
  params?: ListarQuejasParams
): Promise<{ data: QuejaApi[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.estado) sp.set('estado', params.estado);
  sp.set('page', String(params?.page ?? 1));
  sp.set('limit', String(params?.limit ?? 50));
  const endpoint = `/api/quejas?${sp.toString()}`;
  const res = await apiClient.get<ListadoQuejasResp>(endpoint, { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarQueja).filter((q): q is QuejaApi => Boolean(q))
    : Array.isArray(res)
    ? (res as unknown[]).map(normalizarQueja).filter((q): q is QuejaApi => Boolean(q))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function listarQuejasPorCliente(clienteId: string): Promise<QuejaApi[]> {
  const res = await apiClient.get<unknown>(`/api/quejas/cliente/${clienteId}`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[]).map(normalizarQueja).filter((q): q is QuejaApi => Boolean(q));
}

export async function obtenerQueja(id: number): Promise<QuejaApi | null> {
  const res = await apiClient.get<unknown>(`/api/quejas/${id}`, { customBase: getBackendBaseUrl() });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  return normalizarQueja(obj);
}

export async function crearQueja(payload: CrearQuejaPayload): Promise<QuejaApi> {
  const res = await apiClient.post<unknown>('/api/quejas', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const queja = normalizarQueja(obj);
  if (!queja) throw new Error('No se pudo crear la queja');
  return queja;
}

export async function actualizarQueja(
  id: number,
  payload: { estado?: EstadoQueja; asunto?: string; descripcion?: string }
): Promise<QuejaApi> {
  const res = await apiClient.patch<unknown>(`/api/quejas/${id}`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const queja = normalizarQueja(obj);
  if (!queja) throw new Error('No se pudo actualizar la queja');
  return queja;
}
