'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface ResumenHorasExtraApi {
  usuarioId: string;
  nombre: string;
  minutosExtraTotal: number;
  horasExtra: string;
  tarifaConfigurada: boolean;
  montoTotal: number;
  registrosCerradosAutomaticos: number;
  registrosSinHorarioEsperado: number;
}

export interface TotalGeneralHorasExtra {
  minutosExtraTotal: number;
  horasExtra: string;
  montoTotal: number;
}

export interface ListadoHorasExtraApi {
  mes: string;
  data: ResumenHorasExtraApi[];
  totalGeneral: TotalGeneralHorasExtra;
}

function s(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function normalizarResumen(x: unknown): ResumenHorasExtraApi {
  const r = (x ?? {}) as Record<string, unknown>;
  return {
    usuarioId: s(r.usuarioId ?? r.usuario_id),
    nombre: s(r.nombre) || 'Empleado',
    minutosExtraTotal: n(r.minutosExtraTotal ?? r.minutos_extra_total),
    horasExtra: s(r.horasExtra ?? r.horas_extra) || '0h 0m',
    tarifaConfigurada: Boolean(r.tarifaConfigurada ?? r.tarifa_configurada),
    montoTotal: n(r.montoTotal ?? r.monto_total),
    registrosCerradosAutomaticos: n(r.registrosCerradosAutomaticos ?? r.registros_cerrados_automaticos),
    registrosSinHorarioEsperado: n(r.registrosSinHorarioEsperado ?? r.registros_sin_horario_esperado),
  };
}

/** Todas las horas extra del mes — gestión de la jefa/admin (requiere `asistencia:gestionar`). */
export async function listarHorasExtra(mes?: string): Promise<ListadoHorasExtraApi> {
  const qs = mes ? `?mes=${encodeURIComponent(mes)}` : '';
  const res = await apiClient.get<unknown>(`/api/horas-extra${qs}`, getBackendBaseUrl());
  const r = (res ?? {}) as Record<string, unknown>;
  const data = Array.isArray(r.data) ? r.data.map(normalizarResumen) : [];
  const totalRaw = (r.totalGeneral ?? r.total_general ?? {}) as Record<string, unknown>;
  return {
    mes: s(r.mes),
    data,
    totalGeneral: {
      minutosExtraTotal: n(totalRaw.minutosExtraTotal ?? totalRaw.minutos_extra_total),
      horasExtra: s(totalRaw.horasExtra ?? totalRaw.horas_extra) || '0h 0m',
      montoTotal: n(totalRaw.montoTotal ?? totalRaw.monto_total),
    },
  };
}

/** Las horas extra del propio empleado autenticado. */
export async function obtenerMisHorasExtra(mes?: string): Promise<ResumenHorasExtraApi> {
  const qs = mes ? `?mes=${encodeURIComponent(mes)}` : '';
  const res = await apiClient.get<unknown>(`/api/horas-extra/mias${qs}`, getBackendBaseUrl());
  const r = (res ?? {}) as Record<string, unknown>;
  return normalizarResumen(r.data ?? r);
}
