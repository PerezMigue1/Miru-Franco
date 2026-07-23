'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface ClienteApi {
  id: string;
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  activo: boolean;
  creadoEn?: string;
}

interface ListadoClientesResp {
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

function normalizarCliente(x: unknown): ClienteApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  return {
    id: s(r.id),
    nombre: s(r.nombre) || null,
    email: s(r.email) || null,
    telefono: s(r.telefono) || null,
    activo: r.activo !== false,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

export interface ListarClientesParams {
  q?: string;
  page?: number;
  limit?: number;
  incluirInactivos?: boolean;
}

export async function listarClientes(
  params?: ListarClientesParams
): Promise<{ data: ClienteApi[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.incluirInactivos) sp.set('incluirInactivos', 'true');
  sp.set('page', String(params?.page ?? 1));
  sp.set('limit', String(params?.limit ?? 50));
  const endpoint = `/api/clientes?${sp.toString()}`;
  const res = await apiClient.get<ListadoClientesResp>(endpoint, { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarCliente).filter((c): c is ClienteApi => Boolean(c))
    : Array.isArray(res)
    ? (res as unknown[]).map(normalizarCliente).filter((c): c is ClienteApi => Boolean(c))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function obtenerCliente(id: string): Promise<ClienteApi | null> {
  const res = await apiClient.get<unknown>(`/api/clientes/${id}`, { customBase: getBackendBaseUrl() });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  return normalizarCliente(obj);
}

export async function historialComprasCliente(id: string): Promise<unknown[]> {
  const res = await apiClient.get<unknown>(`/api/clientes/${id}/historial-compras`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return arr as unknown[];
}

export async function historialCitasCliente(id: string): Promise<unknown[]> {
  const res = await apiClient.get<unknown>(`/api/clientes/${id}/historial-citas`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return arr as unknown[];
}

export interface VariablesClusteringCliente {
  frecuencia_total: number;
  productos_totales: number;
  servicios_comprados: number;
  gasto_total: number;
  ticket_promedio: number;
  proporcion_online: number;
  recencia_dias: number;
}

export interface ModeloClusteringApi {
  nombre: string;
  algoritmo: string;
  filasEntrenamiento: number;
  fechaCorte: string;
  silhouette: number;
}

export interface SegmentacionClienteApi {
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteActivo: boolean;
  calculadoEn: string;
  cluster: number;
  segmento: string;
  accionSugerida: string;
  distanciaCentroide: number;
  variables: VariablesClusteringCliente;
  modelo: ModeloClusteringApi;
  datosOrigen: {
    comprasOnline: number;
    comprasLocales: number;
    productosOnline: number;
    productosLocales: number;
    serviciosComprados: number;
    gastoOnline: number;
    gastoLocal: number;
    fechaUltimaCompraOnline: string | null;
    fechaUltimaCompraLocal: string | null;
  };
}

export interface SegmentacionClientesApi {
  data: SegmentacionClienteApi[];
  resumen: Record<string, number>;
  modelo: ModeloClusteringApi | null;
}

export async function listarSegmentacionClientes(
  incluirInactivos = true
): Promise<SegmentacionClientesApi> {
  const res = await apiClient.get<{
    data?: SegmentacionClienteApi[];
    resumen?: Record<string, number>;
    modelo?: ModeloClusteringApi;
  }>(
    `/api/clientes/segmentacion?incluirInactivos=${String(incluirInactivos)}`,
    { customBase: getBackendBaseUrl() }
  );
  const data = Array.isArray(res?.data) ? res.data : [];
  return {
    data,
    resumen: res?.resumen ?? {},
    modelo: res?.modelo ?? data[0]?.modelo ?? null,
  };
}

export async function obtenerSegmentacionCliente(
  id: string
): Promise<SegmentacionClienteApi> {
  const res = await apiClient.get<{
    data?: SegmentacionClienteApi;
  }>(
    `/api/clientes/${encodeURIComponent(id)}/segmentacion`,
    { customBase: getBackendBaseUrl() }
  );
  if (!res?.data) {
    throw new Error('El backend no devolvió la segmentación del cliente.');
  }
  return res.data;
}
