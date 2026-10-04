'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

/** Comisión fija por servicio (monto que gana el personal con recibe_comisiones al participar). */
export interface ComisionServicioApi {
  servicioId: number;
  nombre: string;
  precio: number;
  comision: { monto: number; activo: boolean } | null;
}

export interface PersonalComisionApi {
  id: string;
  nombre: string;
  rol: string;
  recibeComisiones: boolean;
}

export interface DetalleComisionApi {
  fecha: string;
  folio: string;
  servicio: string;
  comision: number;
}

export interface PersonaComisionApi {
  usuarioId: string;
  nombre: string;
  totalComision: number;
  servicios: number;
  detalle: DetalleComisionApi[];
}

export interface ReporteComisionesApi {
  total: number;
  personas: PersonaComisionApi[];
}

const num = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const txt = (v: unknown) => (v == null ? '' : String(v));
const datos = (res: unknown): unknown => ((res as Record<string, unknown>)?.data ?? res);

export async function listarComisionesServicio(): Promise<ComisionServicioApi[]> {
  const arr = datos(await apiClient.get<unknown>('/api/comisiones/servicios', { customBase: getBackendBaseUrl() }));
  return (Array.isArray(arr) ? arr : []).map((x) => {
    const r = (x ?? {}) as Record<string, unknown>;
    const c = r.comision as Record<string, unknown> | null;
    return {
      servicioId: num(r.servicioId),
      nombre: txt(r.nombre),
      precio: num(r.precio),
      comision: c ? { monto: num(c.monto), activo: c.activo !== false } : null,
    };
  });
}

export async function guardarComisionServicio(servicioId: number, payload: { monto: number; activo: boolean }): Promise<void> {
  await apiClient.put<unknown>(`/api/comisiones/servicios/${servicioId}`, payload, getBackendBaseUrl());
}

export async function quitarComisionServicio(servicioId: number): Promise<void> {
  await apiClient.delete<unknown>(`/api/comisiones/servicios/${servicioId}`, getBackendBaseUrl());
}

export async function listarPersonalComisiones(): Promise<PersonalComisionApi[]> {
  const arr = datos(await apiClient.get<unknown>('/api/comisiones/personal', { customBase: getBackendBaseUrl() }));
  return (Array.isArray(arr) ? arr : []).map((x) => {
    const r = (x ?? {}) as Record<string, unknown>;
    return { id: txt(r.id), nombre: txt(r.nombre) || 'Sin nombre', rol: txt(r.rol), recibeComisiones: r.recibeComisiones === true };
  });
}

export async function cambiarRecibeComisiones(usuarioId: string, recibeComisiones: boolean): Promise<void> {
  await apiClient.put<unknown>(`/api/comisiones/personal/${usuarioId}`, { recibeComisiones }, getBackendBaseUrl());
}

/** GET /api/reportes/comisiones — con comisiones:configurar trae a todo el personal; con ver_propias, solo lo propio. */
export async function obtenerReporteComisiones(desde?: string, hasta?: string): Promise<ReporteComisionesApi> {
  const sp = new URLSearchParams();
  if (desde) sp.set('desde', desde);
  if (hasta) sp.set('hasta', hasta);
  const q = sp.toString();
  const res = datos(await apiClient.get<unknown>(`/api/reportes/comisiones${q ? `?${q}` : ''}`, { customBase: getBackendBaseUrl() })) as Record<string, unknown>;
  const personas = Array.isArray(res?.personas) ? (res.personas as unknown[]) : [];
  return {
    total: num(res?.total),
    personas: personas.map((x) => {
      const r = (x ?? {}) as Record<string, unknown>;
      const detalle = Array.isArray(r.detalle) ? (r.detalle as unknown[]) : [];
      return {
        usuarioId: txt(r.usuarioId),
        nombre: txt(r.nombre) || 'Sin nombre',
        totalComision: num(r.totalComision),
        servicios: num(r.servicios),
        detalle: detalle.map((d) => {
          const o = (d ?? {}) as Record<string, unknown>;
          return { fecha: txt(o.fecha), folio: txt(o.folio), servicio: txt(o.servicio), comision: num(o.comision) };
        }),
      };
    }),
  };
}
