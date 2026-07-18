'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export type EstadoVentaLocal = 'pendiente' | 'pagada' | 'cancelada';

export interface VentaLocalItemApi {
  presentacionId?: number | null;
  servicioId?: number | null;
  cantidad: number;
  precioUnitario: number;
  subtotal?: number;
}

export interface VentaLocalApi {
  id: number;
  estado: EstadoVentaLocal;
  items: VentaLocalItemApi[];
  metodoPago: string;
  clienteId?: string | null;
  descuento?: number | null;
  notas?: string | null;
  total?: number | null;
  creadoEn?: string;
}

export interface CrearVentaPayload {
  items: Array<{
    presentacionId?: number;
    servicioId?: number;
    cantidad: number;
    precioUnitario: number;
  }>;
  metodoPago: string;
  clienteId?: string;
  descuento?: number;
  notas?: string;
}

export interface CorteApi {
  id: number;
  efectivoInicial: number;
  efectivoFinal?: number | null;
  totalVentas?: number | null;
  estado: string;
  notas?: string | null;
  creadoEn?: string;
  cerradoEn?: string | null;
}

interface ListadoVentasResp {
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

function normalizarItem(x: unknown): VentaLocalItemApi {
  const r = (x || {}) as Record<string, unknown>;
  return {
    presentacionId: n(r.presentacionId ?? r.presentacion_id),
    servicioId: n(r.servicioId ?? r.servicio_id),
    cantidad: Number(n(r.cantidad, 1) ?? 1),
    precioUnitario: Number(n(r.precioUnitario ?? r.precio_unitario, 0) ?? 0),
    subtotal: n(r.subtotal) ?? undefined,
  };
}

function normalizarVenta(x: unknown): VentaLocalApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const estadoRaw = s(r.estado).toLowerCase();
  // 'pendiente' es el default real del backend (schema.prisma: EstadoVentaLocal @default(pendiente)),
  // nunca se inventa un estado que el backend no pueda enviar.
  const estadosValidos: EstadoVentaLocal[] = ['pendiente', 'pagada', 'cancelada'];
  const estado: EstadoVentaLocal = estadosValidos.includes(estadoRaw as EstadoVentaLocal)
    ? (estadoRaw as EstadoVentaLocal)
    : 'pendiente';
  const items = Array.isArray(r.items) ? (r.items as unknown[]).map(normalizarItem) : [];
  return {
    id: Number(n(r.id, 0) ?? 0),
    estado,
    items,
    metodoPago: s(r.metodoPago ?? r.metodo_pago),
    clienteId: s(r.clienteId ?? r.cliente_id) || null,
    descuento: n(r.descuento),
    notas: s(r.notas) || null,
    total: n(r.total),
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

function normalizarCorte(x: unknown): CorteApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  return {
    id: Number(n(r.id, 0) ?? 0),
    efectivoInicial: Number(n(r.efectivoInicial ?? r.efectivo_inicial, 0) ?? 0),
    efectivoFinal: n(r.efectivoFinal ?? r.efectivo_final),
    totalVentas: n(r.totalVentas ?? r.total_ventas),
    estado: s(r.estado) || 'abierto',
    notas: s(r.notas) || null,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
    cerradoEn: s(r.cerradoEn ?? r.cerrado_en) || null,
  };
}

export interface ListarVentasParams {
  desde?: string;
  hasta?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

export async function listarVentas(
  params?: ListarVentasParams
): Promise<{ data: VentaLocalApi[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.desde) sp.set('desde', params.desde);
  if (params?.hasta) sp.set('hasta', params.hasta);
  if (params?.estado) sp.set('estado', params.estado);
  sp.set('page', String(params?.page ?? 1));
  sp.set('limit', String(params?.limit ?? 50));
  const endpoint = `/api/pos/ventas?${sp.toString()}`;
  // skip403Redirect: estilista/becario no tienen permiso de POS y deben ver el error en la página,
  // no ser redirigidos globalmente a /403 (mismo patrón que auth.ts/usuarios.ts).
  const res = await apiClient.get<ListadoVentasResp>(endpoint, { customBase: getBackendBaseUrl(), skip403Redirect: true });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarVenta).filter((v): v is VentaLocalApi => Boolean(v))
    : Array.isArray(res)
    ? (res as unknown[]).map(normalizarVenta).filter((v): v is VentaLocalApi => Boolean(v))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function obtenerVenta(id: number): Promise<VentaLocalApi | null> {
  const res = await apiClient.get<unknown>(`/api/pos/ventas/${id}`, { customBase: getBackendBaseUrl() });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  return normalizarVenta(obj);
}

export async function crearVenta(payload: CrearVentaPayload): Promise<VentaLocalApi> {
  // skip403Redirect: mismo motivo que listarVentas — un rol sin permiso de POS debe ver
  // el error en el propio formulario, no ser redirigido globalmente a /403.
  const res = await apiClient.post<unknown>('/api/pos/ventas', payload, { customBase: getBackendBaseUrl(), skip403Redirect: true });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const venta = normalizarVenta(obj);
  if (!venta) throw new Error('No se pudo crear la venta');
  return venta;
}

export async function cancelarVenta(
  id: number,
  payload: { motivoCancelacion: string }
): Promise<VentaLocalApi> {
  const res = await apiClient.patch<unknown>(`/api/pos/ventas/${id}/cancelar`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const venta = normalizarVenta(obj);
  if (!venta) throw new Error('No se pudo cancelar la venta');
  return venta;
}

export async function obtenerTicket(id: number): Promise<VentaLocalApi | null> {
  try {
    const res = await apiClient.get<unknown>(`/api/pos/ventas/${id}/ticket`, { customBase: getBackendBaseUrl() });
    const obj = (res as Record<string, unknown>)?.data ?? res;
    return normalizarVenta(obj);
  } catch {
    return obtenerVenta(id);
  }
}

export interface ListarCortesParams {
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

export async function listarCortes(
  params?: ListarCortesParams
): Promise<{ data: CorteApi[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.desde) sp.set('desde', params.desde);
  if (params?.hasta) sp.set('hasta', params.hasta);
  sp.set('page', String(params?.page ?? 1));
  sp.set('limit', String(params?.limit ?? 50));
  const endpoint = `/api/pos/cortes?${sp.toString()}`;
  const res = await apiClient.get<ListadoVentasResp>(endpoint, { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarCorte).filter((c): c is CorteApi => Boolean(c))
    : Array.isArray(res)
    ? (res as unknown[]).map(normalizarCorte).filter((c): c is CorteApi => Boolean(c))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export interface ResumenVentasApi {
  totalVentas: number;
  totalMonto: number;
  porMetodo: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    mixto: number;
  };
}

/** GET /api/pos/resumen — los montos llegan como string (Decimal de Prisma serializado); se normalizan a number. */
export async function resumenVentas(desde?: string, hasta?: string): Promise<ResumenVentasApi> {
  const sp = new URLSearchParams();
  if (desde) sp.set('desde', desde);
  if (hasta) sp.set('hasta', hasta);
  const endpoint = `/api/pos/resumen?${sp.toString()}`;
  // skip403Redirect: estilista/becario no tienen permiso de POS; el dashboard de operación
  // ya maneja este rechazo con Promise.allSettled y muestra "No disponible para tu rol".
  const res = await apiClient.get<unknown>(endpoint, { customBase: getBackendBaseUrl(), skip403Redirect: true });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const r = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>;
  const metodo = (r.porMetodo && typeof r.porMetodo === 'object' ? r.porMetodo : {}) as Record<string, unknown>;
  return {
    totalVentas: n(r.totalVentas, 0) ?? 0,
    totalMonto: n(r.totalMonto, 0) ?? 0,
    porMetodo: {
      efectivo: n(metodo.efectivo, 0) ?? 0,
      tarjeta: n(metodo.tarjeta, 0) ?? 0,
      transferencia: n(metodo.transferencia, 0) ?? 0,
      mixto: n(metodo.mixto, 0) ?? 0,
    },
  };
}

export async function obtenerCorte(id: number): Promise<CorteApi | null> {
  const res = await apiClient.get<unknown>(`/api/pos/cortes/${id}`, { customBase: getBackendBaseUrl() });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  return normalizarCorte(obj);
}

export async function abrirCorte(payload: {
  efectivoInicial: number;
  notas?: string;
}): Promise<CorteApi> {
  const res = await apiClient.post<unknown>('/api/pos/cortes', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const corte = normalizarCorte(obj);
  if (!corte) throw new Error('No se pudo abrir el corte');
  return corte;
}
