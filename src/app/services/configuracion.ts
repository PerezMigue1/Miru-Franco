'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface ConfiguracionSalonApi {
  entradaLunesViernes: string;
  salidaLunesViernes: string;
  entradaSabado: string;
  salidaSabado: string;
  entradaDomingo: string | null;
  salidaDomingo: string | null;
  margenGraciaMinutos: number;
  tarifaHoraExtra: number;
  actualizadoEn?: string;
}

export interface ActualizarConfiguracionPayload {
  entradaLunesViernes?: string;
  salidaLunesViernes?: string;
  entradaSabado?: string;
  salidaSabado?: string;
  entradaDomingo?: string | null;
  salidaDomingo?: string | null;
  margenGraciaMinutos?: number;
  tarifaHoraExtra?: number;
}

function s(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function sn(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function normalizar(x: unknown): ConfiguracionSalonApi {
  const r = (x ?? {}) as Record<string, unknown>;
  return {
    entradaLunesViernes: s(r.entradaLunesViernes ?? r.entrada_lunes_viernes) || '09:00',
    salidaLunesViernes: s(r.salidaLunesViernes ?? r.salida_lunes_viernes) || '18:00',
    entradaSabado: s(r.entradaSabado ?? r.entrada_sabado) || '09:00',
    salidaSabado: s(r.salidaSabado ?? r.salida_sabado) || '18:00',
    entradaDomingo: sn(r.entradaDomingo ?? r.entrada_domingo),
    salidaDomingo: sn(r.salidaDomingo ?? r.salida_domingo),
    margenGraciaMinutos: n(r.margenGraciaMinutos ?? r.margen_gracia_minutos),
    tarifaHoraExtra: n(r.tarifaHoraExtra ?? r.tarifa_hora_extra),
    actualizadoEn: s(r.actualizadoEn ?? r.actualizado_en) || undefined,
  };
}

export async function obtenerConfiguracionSalon(): Promise<ConfiguracionSalonApi> {
  const res = await apiClient.get<unknown>('/api/configuracion', getBackendBaseUrl());
  const o = (res as Record<string, unknown>)?.data ?? res;
  return normalizar(o);
}

export async function actualizarConfiguracionSalon(
  payload: ActualizarConfiguracionPayload
): Promise<ConfiguracionSalonApi> {
  const res = await apiClient.put<unknown>('/api/configuracion', payload, getBackendBaseUrl());
  const o = (res as Record<string, unknown>)?.data ?? res;
  return normalizar(o);
}
