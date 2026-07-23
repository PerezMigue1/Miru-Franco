'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface RegistroAsistenciaApi {
  id: number;
  fecha: string;
  horaEntrada: string;
  horaSalida?: string | null;
  cerradoAutomatico: boolean;
  usuarioId: string;
  usuarioNombre?: string | null;
  corregidoPorId?: string | null;
  corregidoPorNombre?: string | null;
  creadoEn?: string;
}

export interface CorregirAsistenciaPayload {
  horaEntrada?: string;
  horaSalida?: string;
}

interface ListadoResp {
  success?: boolean;
  count?: number;
  data?: unknown[];
}

function s(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function normalizar(x: unknown): RegistroAsistenciaApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const usuario = (r.usuario ?? {}) as Record<string, unknown>;
  const corregidoPor = (r.corregidoPor ?? r.corregido_por ?? {}) as Record<string, unknown>;
  return {
    id: n(r.id),
    fecha: s(r.fecha),
    horaEntrada: s(r.horaEntrada ?? r.hora_entrada),
    horaSalida: s(r.horaSalida ?? r.hora_salida) || null,
    cerradoAutomatico: Boolean(r.cerradoAutomatico ?? r.cerrado_automatico),
    usuarioId: s(r.usuarioId ?? r.usuario_id),
    usuarioNombre: s(usuario.nombre) || null,
    corregidoPorId: s(r.corregidoPorId ?? r.corregido_por_id) || null,
    corregidoPorNombre: s(corregidoPor.nombre) || null,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

function unwrapArray(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const o = res as ListadoResp;
  return Array.isArray(o?.data) ? o.data : [];
}

/** El empleado marca su propia entrada/salida — sin parámetros, el backend decide cuál según el estado del día. */
export async function marcarAsistencia(): Promise<RegistroAsistenciaApi> {
  const res = await apiClient.post<unknown>('/api/asistencia/marcar', {}, getBackendBaseUrl());
  const o = (res as Record<string, unknown>)?.data ?? res;
  const registro = normalizar(o);
  if (!registro) throw new Error('No se pudo registrar la marca');
  return registro;
}

/** Las marcas del propio empleado autenticado. */
export async function listarMiAsistencia(): Promise<RegistroAsistenciaApi[]> {
  const res = await apiClient.get<unknown>('/api/asistencia/mia', getBackendBaseUrl());
  return unwrapArray(res).map(normalizar).filter((x): x is RegistroAsistenciaApi => Boolean(x));
}

/** Todas las marcas — gestión de la jefa/admin (requiere `asistencia:gestionar`). */
export async function listarAsistencia(): Promise<RegistroAsistenciaApi[]> {
  const res = await apiClient.get<unknown>('/api/asistencia', getBackendBaseUrl());
  return unwrapArray(res).map(normalizar).filter((x): x is RegistroAsistenciaApi => Boolean(x));
}

export async function corregirAsistencia(
  id: number,
  payload: CorregirAsistenciaPayload
): Promise<RegistroAsistenciaApi> {
  const res = await apiClient.patch<unknown>(`/api/asistencia/${id}`, payload, getBackendBaseUrl());
  const o = (res as Record<string, unknown>)?.data ?? res;
  const registro = normalizar(o);
  if (!registro) throw new Error('No se pudo corregir el registro');
  return registro;
}
