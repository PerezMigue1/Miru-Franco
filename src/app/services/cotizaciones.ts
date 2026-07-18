'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export type EstadoCotizacion = 'pendiente' | 'confirmada' | 'cancelada';

export interface CotizacionApi {
  id: number;
  clienteNombre: string;
  clienteId?: string | null;
  paqueteId: number;
  paqueteTipoEvento?: string | null;
  paquetePrecioEspecial?: number | null;
  fechaEvento: string;
  cantidadPersonas?: number | null;
  monto: number;
  anticipo: number;
  estado: EstadoCotizacion;
  notas?: string | null;
  creadoEn?: string;
}

export interface CrearCotizacionPayload {
  clienteNombre: string;
  clienteId?: string;
  paqueteId: number;
  fechaEvento: string;
  cantidadPersonas?: number;
  monto: number;
  anticipo?: number;
  notas?: string;
}

export interface ActualizarCotizacionPayload extends Partial<CrearCotizacionPayload> {
  estado?: EstadoCotizacion;
}

interface ListadoCotizacionesResp {
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

function normalizarCotizacion(x: unknown): CotizacionApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const paquete = r.paquete as Record<string, unknown> | undefined;
  const estadoRaw = s(r.estado).toLowerCase();
  const estadosValidos: EstadoCotizacion[] = ['pendiente', 'confirmada', 'cancelada'];
  const estado: EstadoCotizacion = estadosValidos.includes(estadoRaw as EstadoCotizacion)
    ? (estadoRaw as EstadoCotizacion)
    : 'pendiente';
  return {
    id: Number(n(r.id, 0) ?? 0),
    clienteNombre: s(r.clienteNombre ?? r.cliente_nombre),
    clienteId: s(r.clienteId ?? r.cliente_id) || null,
    paqueteId: Number(n(r.paqueteId ?? r.paquete_id, 0) ?? 0),
    paqueteTipoEvento: s(paquete?.tipo_evento ?? paquete?.tipoEvento) || null,
    paquetePrecioEspecial: n(paquete?.precio_especial ?? paquete?.precioEspecial),
    fechaEvento: s(r.fechaEvento ?? r.fecha_evento),
    cantidadPersonas: n(r.cantidadPersonas ?? r.cantidad_personas),
    monto: Number(n(r.monto, 0) ?? 0),
    anticipo: Number(n(r.anticipo, 0) ?? 0),
    estado,
    notas: s(r.notas) || null,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

export async function listarCotizaciones(): Promise<{ data: CotizacionApi[]; total: number }> {
  const res = await apiClient.get<ListadoCotizacionesResp>('/api/cotizaciones', { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarCotizacion).filter((c): c is CotizacionApi => Boolean(c))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function crearCotizacion(payload: CrearCotizacionPayload): Promise<CotizacionApi> {
  const res = await apiClient.post<unknown>('/api/cotizaciones', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cotizacion = normalizarCotizacion(obj);
  if (!cotizacion) throw new Error('No se pudo crear la cotización');
  return cotizacion;
}

export async function actualizarCotizacion(
  id: number,
  payload: ActualizarCotizacionPayload
): Promise<CotizacionApi> {
  const res = await apiClient.put<unknown>(`/api/cotizaciones/${id}`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cotizacion = normalizarCotizacion(obj);
  if (!cotizacion) throw new Error('No se pudo actualizar la cotización');
  return cotizacion;
}
