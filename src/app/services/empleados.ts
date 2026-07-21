'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface EmpleadoApi {
  id: string;
  usuarioId: string;
  nombre?: string | null;
  email?: string | null;
  puesto?: string | null;
  especialidades?: string[];
  telefono?: string | null;
  fechaIngreso?: string | null;
  comisionPorcentaje?: number | null;
  activo: boolean;
  creadoEn?: string;
}

export interface CrearEmpleadoPayload {
  usuarioId: string;
  puesto?: string;
  especialidades?: string[];
  telefono?: string;
  fechaIngreso?: string;
  comisionPorcentaje?: number;
}

interface ListadoEmpleadosResp {
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

function normalizarEmpleado(x: unknown): EmpleadoApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const especialidades = Array.isArray(r.especialidades)
    ? (r.especialidades as unknown[]).map(String)
    : [];
  return {
    id: s(r.id),
    usuarioId: s(r.usuarioId ?? r.usuario_id),
    // El backend anida nombre/email en usuario; usarlo como respaldo (mismo patrón que citas.ts).
    nombre: s(r.nombre ?? (r.usuario as Record<string, unknown>)?.nombre) || null,
    email: s(r.email ?? (r.usuario as Record<string, unknown>)?.email) || null,
    puesto: s(r.puesto) || null,
    especialidades,
    telefono: s(r.telefono) || null,
    fechaIngreso: s(r.fechaIngreso ?? r.fecha_ingreso) || null,
    comisionPorcentaje: n(r.comisionPorcentaje ?? r.comision_porcentaje),
    activo: r.activo !== false,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

export interface ListarEmpleadosParams {
  page?: number;
  limit?: number;
  q?: string;
}

export async function listarEmpleados(
  params?: ListarEmpleadosParams
): Promise<{ data: EmpleadoApi[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  sp.set('page', String(params?.page ?? 1));
  sp.set('limit', String(params?.limit ?? 50));
  const endpoint = `/api/empleados?${sp.toString()}`;
  // skip403Redirect: un rol de staff sin empleados:lectura (ej. becario) debe degradar a lista
  // vacía en pantallas que solo usan esto para un selector secundario (Agenda, Gestión de citas),
  // no perder toda la página por un redirect global a /403.
  const res = await apiClient.get<ListadoEmpleadosResp>(endpoint, { customBase: getBackendBaseUrl(), skip403Redirect: true });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarEmpleado).filter((e): e is EmpleadoApi => Boolean(e))
    : Array.isArray(res)
    ? (res as unknown[]).map(normalizarEmpleado).filter((e): e is EmpleadoApi => Boolean(e))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function obtenerEmpleado(usuarioId: string): Promise<EmpleadoApi | null> {
  const res = await apiClient.get<unknown>(`/api/empleados/${usuarioId}`, { customBase: getBackendBaseUrl() });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  return normalizarEmpleado(obj);
}

export async function crearPerfilEmpleado(payload: CrearEmpleadoPayload): Promise<EmpleadoApi> {
  const res = await apiClient.post<unknown>('/api/empleados', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const emp = normalizarEmpleado(obj);
  if (!emp) throw new Error('No se pudo crear el perfil de empleado');
  return emp;
}

export async function actualizarEmpleado(
  usuarioId: string,
  payload: Partial<CrearEmpleadoPayload>
): Promise<EmpleadoApi> {
  const res = await apiClient.patch<unknown>(`/api/empleados/${usuarioId}`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const emp = normalizarEmpleado(obj);
  if (!emp) throw new Error('No se pudo actualizar el empleado');
  return emp;
}

export async function eliminarEmpleado(usuarioId: string): Promise<void> {
  await apiClient.delete<void>(`/api/empleados/${usuarioId}`, getBackendBaseUrl());
}
