'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export type EstadoCita =
  | 'pendiente'
  | 'confirmada'
  | 'en_curso'
  | 'completada'
  | 'cancelada'
  | 'reprogramada'
  | 'no_asistio';

export interface CitaApi {
  id: number;
  clienteId: string;
  clienteNombre?: string | null;
  especialistaId: string;
  especialistaNombre?: string | null;
  servicioId: number;
  servicioNombre?: string | null;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  estado: EstadoCita;
  notas?: string | null;
  motivoCancelacion?: string | null;
  creadoEn?: string;
}

export interface CrearCitaPayload {
  clienteId: string;
  especialistaId: string;
  servicioId: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  notas?: string;
}

interface ListadoCitasResp {
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

function normalizarCita(x: unknown): CitaApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const estadoRaw = s(r.estado).toLowerCase();
  const estadosValidos: EstadoCita[] = [
    'pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada', 'reprogramada', 'no_asistio',
  ];
  const estado: EstadoCita = estadosValidos.includes(estadoRaw as EstadoCita)
    ? (estadoRaw as EstadoCita)
    : 'pendiente';
  return {
    id: Number(n(r.id, 0) ?? 0),
    clienteId: s(r.clienteId ?? r.cliente_id),
    clienteNombre: s(r.clienteNombre ?? r.cliente_nombre) || null,
    especialistaId: s(r.especialistaId ?? r.especialista_id),
    especialistaNombre: s(r.especialistaNombre ?? r.especialista_nombre) || null,
    servicioId: Number(n(r.servicioId ?? r.servicio_id, 0) ?? 0),
    servicioNombre: s(r.servicioNombre ?? r.servicio_nombre) || null,
    fechaHoraInicio: s(r.fechaHoraInicio ?? r.fecha_hora_inicio),
    fechaHoraFin: s(r.fechaHoraFin ?? r.fecha_hora_fin),
    estado,
    notas: s(r.notas) || null,
    motivoCancelacion: s(r.motivoCancelacion ?? r.motivo_cancelacion) || null,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

export interface ListarCitasParams {
  desde?: string;
  hasta?: string;
  estado?: string;
  especialistaId?: string;
  page?: number;
  limit?: number;
}

export async function listarCitas(
  params?: ListarCitasParams
): Promise<{ data: CitaApi[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.desde) sp.set('desde', params.desde);
  if (params?.hasta) sp.set('hasta', params.hasta);
  if (params?.estado) sp.set('estado', params.estado);
  if (params?.especialistaId) sp.set('especialistaId', params.especialistaId);
  sp.set('page', String(params?.page ?? 1));
  sp.set('limit', String(params?.limit ?? 50));
  const endpoint = `/api/citas?${sp.toString()}`;
  const res = await apiClient.get<ListadoCitasResp>(endpoint, { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarCita).filter((c): c is CitaApi => Boolean(c))
    : Array.isArray(res)
    ? (res as unknown[]).map(normalizarCita).filter((c): c is CitaApi => Boolean(c))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function listarCitasDelDia(fecha?: string): Promise<CitaApi[]> {
  const sp = new URLSearchParams();
  if (fecha) sp.set('fecha', fecha);
  const res = await apiClient.get<unknown>(`/api/citas/dia?${sp.toString()}`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[]).map(normalizarCita).filter((c): c is CitaApi => Boolean(c));
}

export async function listarCalendario(desde: string, hasta: string): Promise<CitaApi[]> {
  const sp = new URLSearchParams({ desde, hasta });
  const res = await apiClient.get<unknown>(`/api/citas/calendario?${sp.toString()}`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[]).map(normalizarCita).filter((c): c is CitaApi => Boolean(c));
}

export async function obtenerCita(id: number): Promise<CitaApi | null> {
  const res = await apiClient.get<unknown>(`/api/citas/${id}`, { customBase: getBackendBaseUrl() });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  return normalizarCita(obj);
}

export async function crearCita(payload: CrearCitaPayload): Promise<CitaApi> {
  const res = await apiClient.post<unknown>('/api/citas', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo crear la cita');
  return cita;
}

export async function actualizarCita(
  id: number,
  payload: Partial<CrearCitaPayload>
): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo actualizar la cita');
  return cita;
}

export async function checkInCita(id: number): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}/check-in`, {}, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo hacer check-in');
  return cita;
}

export async function checkOutCita(id: number): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}/check-out`, {}, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo hacer check-out');
  return cita;
}

export async function reprogramarCita(
  id: number,
  payload: { fechaHoraInicio: string; fechaHoraFin: string }
): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}/reprogramar`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo reprogramar la cita');
  return cita;
}

export async function cancelarCita(
  id: number,
  payload: { motivoCancelacion: string }
): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}/cancelar`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo cancelar la cita');
  return cita;
}

export async function registrarMateriales(
  citaId: number,
  payload: { presentacionId: number; cantidad: number; motivo?: string }
): Promise<void> {
  await apiClient.post<unknown>(`/api/citas/${citaId}/materiales`, payload, getBackendBaseUrl());
}
