/**
 * Métodos de pago guardados (perfil + checkout).
 * GET/PATCH/DELETE requieren Authorization: Bearer (apiClient).
 * POST: tras tokenizar en la pasarela (nunca PAN/CVV completos).
 *
 * Base: `${getRestApiBaseUrl()}/payments/metodos-pago`
 */

import { apiClient } from './client';
import { getRestApiBaseUrl } from './config';

const base = () => getRestApiBaseUrl();

/** Evita redirigir a /500 si el módulo payments falla o aún no está desplegado en el API. */
const clientOpts = () => ({ customBase: base(), skip500Redirect: true as const });

export interface MetodoPagoUsuario {
  id: string;
  proveedor: string;
  idExterno: string;
  ultimos4?: string | null;
  marca?: string | null;
  bancoNombre?: string | null;
  expMes?: number | null;
  expAnio?: number | null;
  tipoTarjeta?: 'credito' | 'debito' | string | null;
  esPredeterminada?: boolean;
  etiqueta?: string | null;
  activo?: boolean;
}

export interface CrearMetodoPagoUsuarioPayload {
  proveedor: string;
  idExterno: string;
  ultimos4: string;
  marca?: string;
  bancoNombre?: string;
  expMes?: number;
  expAnio?: number;
  tipoTarjeta?: 'credito' | 'debito';
  esPredeterminada?: boolean;
}

export interface ActualizarMetodoPagoUsuarioPayload {
  esPredeterminada?: boolean;
  etiqueta?: string | null;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function normalizarMetodo(raw: Record<string, unknown>): MetodoPagoUsuario {
  return {
    id: str(raw.id ?? raw._id),
    proveedor: str(raw.proveedor),
    idExterno: str(raw.idExterno ?? raw.id_externo),
    ultimos4: raw.ultimos4 != null ? str(raw.ultimos4) : raw.ultimos_4 != null ? str(raw.ultimos_4) : null,
    marca: raw.marca != null ? str(raw.marca) : null,
    bancoNombre:
      raw.bancoNombre != null ? str(raw.bancoNombre) : raw.banco_nombre != null ? str(raw.banco_nombre) : null,
    expMes: num(raw.expMes ?? raw.exp_mes),
    expAnio: num(raw.expAnio ?? raw.exp_anio),
    tipoTarjeta:
      raw.tipoTarjeta != null
        ? str(raw.tipoTarjeta)
        : raw.tipo_tarjeta != null
          ? str(raw.tipo_tarjeta)
          : null,
    esPredeterminada: raw.esPredeterminada === true || raw.es_predeterminada === true,
    etiqueta: raw.etiqueta != null ? str(raw.etiqueta) : null,
    activo: raw.activo !== false,
  };
}

function unwrapArray(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>;
    const d = o.data;
    if (Array.isArray(d)) return d as Record<string, unknown>[];
  }
  return [];
}

function unwrapOne(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null;
  const o = res as Record<string, unknown>;
  const d = o.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) return d as Record<string, unknown>;
  if (o.id != null) return o as Record<string, unknown>;
  return null;
}

/** Listado del usuario autenticado. Admin: `usuarioId` (UUID). */
export async function listarMetodosPagoUsuario(opciones?: {
  usuarioId?: string;
}): Promise<{ items: MetodoPagoUsuario[]; count?: number }> {
  const q = opciones?.usuarioId
    ? `?usuarioId=${encodeURIComponent(opciones.usuarioId)}`
    : '';
  const res = await apiClient.get<unknown>(`/payments/metodos-pago${q}`, clientOpts());
  const items = unwrapArray(res).map((r) => normalizarMetodo(r));
  const count =
    res && typeof res === 'object' && 'count' in res ? num((res as { count: unknown }).count) ?? undefined : undefined;
  return { items, count };
}

export async function obtenerMetodoPagoUsuario(id: string): Promise<MetodoPagoUsuario | null> {
  const res = await apiClient.get<unknown>(
    `/payments/metodos-pago/${encodeURIComponent(id)}`,
    clientOpts()
  );
  const o = unwrapOne(res);
  return o ? normalizarMetodo(o) : null;
}

export async function crearMetodoPagoUsuario(
  payload: CrearMetodoPagoUsuarioPayload
): Promise<MetodoPagoUsuario> {
  const res = await apiClient.post<unknown>(`/payments/metodos-pago`, payload, clientOpts());
  const o = unwrapOne(res);
  if (!o?.id) throw new Error('No se pudo registrar el método de pago');
  return normalizarMetodo(o);
}

export async function actualizarMetodoPagoUsuario(
  id: string,
  payload: ActualizarMetodoPagoUsuarioPayload
): Promise<MetodoPagoUsuario> {
  const res = await apiClient.patch<unknown>(
    `/payments/metodos-pago/${encodeURIComponent(id)}`,
    payload,
    base(),
    { skip500Redirect: true }
  );
  const o = unwrapOne(res);
  if (!o?.id) throw new Error('No se pudo actualizar el método de pago');
  return normalizarMetodo(o);
}

export async function eliminarMetodoPagoUsuario(id: string): Promise<void> {
  await apiClient.delete<void>(`/payments/metodos-pago/${encodeURIComponent(id)}`, clientOpts());
}
