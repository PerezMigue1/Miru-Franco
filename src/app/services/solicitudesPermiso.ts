'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export type TipoSolicitudPermiso = 'permiso' | 'vacaciones' | 'falta_justificada' | 'incapacidad';
export type EstadoSolicitudPermiso = 'pendiente' | 'aprobada' | 'rechazada';

export interface SolicitudPermisoApi {
  id: number;
  tipo: TipoSolicitudPermiso;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  estado: EstadoSolicitudPermiso;
  comentarioResolucion?: string | null;
  usuarioId: string;
  usuarioNombre?: string | null;
  resueltoPorId?: string | null;
  resueltoPorNombre?: string | null;
  creadoEn?: string;
}

export interface CrearSolicitudPermisoPayload {
  tipo: TipoSolicitudPermiso;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
}

export interface ResolverSolicitudPermisoPayload {
  estado: 'aprobada' | 'rechazada';
  comentarioResolucion?: string;
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

function normalizarSolicitud(x: unknown): SolicitudPermisoApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const usuario = (r.usuario ?? {}) as Record<string, unknown>;
  const resueltoPor = (r.resueltoPor ?? r.resuelto_por ?? {}) as Record<string, unknown>;
  return {
    id: n(r.id),
    tipo: (s(r.tipo) || 'permiso') as TipoSolicitudPermiso,
    fechaInicio: s(r.fechaInicio ?? r.fecha_inicio),
    fechaFin: s(r.fechaFin ?? r.fecha_fin),
    motivo: s(r.motivo),
    estado: (s(r.estado) || 'pendiente') as EstadoSolicitudPermiso,
    comentarioResolucion: s(r.comentarioResolucion ?? r.comentario_resolucion) || null,
    usuarioId: s(r.usuarioId ?? r.usuario_id),
    usuarioNombre: s(usuario.nombre) || null,
    resueltoPorId: s(r.resueltoPorId ?? r.resuelto_por_id) || null,
    resueltoPorNombre: s(resueltoPor.nombre) || null,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

function unwrapArray(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const o = res as ListadoResp;
  return Array.isArray(o?.data) ? o.data : [];
}

/** Todas las solicitudes — gestión de la jefa/admin (requiere `solicitudes:gestionar`). */
export async function listarSolicitudesPermiso(): Promise<SolicitudPermisoApi[]> {
  const res = await apiClient.get<unknown>('/api/solicitudes-permiso', getBackendBaseUrl());
  return unwrapArray(res).map(normalizarSolicitud).filter((x): x is SolicitudPermisoApi => Boolean(x));
}

/** Las solicitudes del propio empleado autenticado. */
export async function listarMisSolicitudesPermiso(): Promise<SolicitudPermisoApi[]> {
  const res = await apiClient.get<unknown>('/api/solicitudes-permiso/mias', getBackendBaseUrl());
  return unwrapArray(res).map(normalizarSolicitud).filter((x): x is SolicitudPermisoApi => Boolean(x));
}

export async function crearSolicitudPermiso(payload: CrearSolicitudPermisoPayload): Promise<SolicitudPermisoApi> {
  const res = await apiClient.post<unknown>('/api/solicitudes-permiso', payload, getBackendBaseUrl());
  const o = (res as Record<string, unknown>)?.data ?? res;
  const solicitud = normalizarSolicitud(o);
  if (!solicitud) throw new Error('No se pudo registrar la solicitud');
  return solicitud;
}

export async function resolverSolicitudPermiso(
  id: number,
  payload: ResolverSolicitudPermisoPayload
): Promise<SolicitudPermisoApi> {
  const res = await apiClient.patch<unknown>(`/api/solicitudes-permiso/${id}/resolver`, payload, getBackendBaseUrl());
  const o = (res as Record<string, unknown>)?.data ?? res;
  const solicitud = normalizarSolicitud(o);
  if (!solicitud) throw new Error('No se pudo resolver la solicitud');
  return solicitud;
}

export function etiquetaTipoSolicitud(tipo: string): string {
  const m: Record<string, string> = {
    permiso: 'Permiso',
    vacaciones: 'Vacaciones',
    falta_justificada: 'Falta justificada',
    incapacidad: 'Incapacidad',
  };
  return m[tipo] ?? tipo.replace(/_/g, ' ');
}

export function etiquetaEstadoSolicitud(estado: string): string {
  const m: Record<string, string> = {
    pendiente: 'Pendiente',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
  };
  return m[estado] ?? estado;
}

export type BadgeVariantSolicitud = 'default' | 'success' | 'warning' | 'danger' | 'info';

export function varianteBadgeEstadoSolicitud(estado: string): BadgeVariantSolicitud {
  switch (estado) {
    case 'aprobada':
      return 'success';
    case 'rechazada':
      return 'danger';
    case 'pendiente':
      return 'warning';
    default:
      return 'default';
  }
}
