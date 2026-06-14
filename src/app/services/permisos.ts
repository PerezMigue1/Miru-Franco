'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface PermisoApi {
  id: number | string;
  clave: string;
  descripcion?: string | null;
  modulo?: string | null;
}

export interface PermisoRolApi {
  rol: string;
  claves: string[];
}

function s(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function normalizarPermiso(x: unknown): PermisoApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  return {
    id: r.id != null ? r.id as string | number : s(r.clave),
    clave: s(r.clave),
    descripcion: s(r.descripcion) || null,
    modulo: s(r.modulo) || null,
  };
}

export async function listarPermisos(): Promise<PermisoApi[]> {
  const res = await apiClient.get<unknown>('/api/permisos', { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[]).map(normalizarPermiso).filter((p): p is PermisoApi => Boolean(p));
}

export async function obtenerPermisosPorRol(rol: string): Promise<PermisoRolApi> {
  const res = await apiClient.get<unknown>(`/api/permisos/rol/${rol}`, { customBase: getBackendBaseUrl() });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const r = obj as Record<string, unknown>;
  const claves = Array.isArray(r?.claves) ? (r.claves as unknown[]).map(String) : [];
  return { rol: s(r?.rol) || rol, claves };
}

export async function actualizarPermisosPorRol(
  rol: string,
  claves: string[]
): Promise<PermisoRolApi> {
  const res = await apiClient.put<unknown>(`/api/permisos/rol/${rol}`, { claves }, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const r = obj as Record<string, unknown>;
  const clavesResp = Array.isArray(r?.claves) ? (r.claves as unknown[]).map(String) : claves;
  return { rol, claves: clavesResp };
}
