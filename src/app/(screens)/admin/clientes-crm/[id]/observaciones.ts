'use client';

import { apiClient } from '../../../../services/client';
import { getBackendBaseUrl } from '../../../../services/config';
import { fechaCortaEnMexico } from '../../../../utils/fechaSoloDia';

/**
 * Observaciones del CRM sobre una clienta (GET/POST /api/clientes/:id/observaciones).
 * Las usan la ficha de admin y la de operación. Un 403 se muestra en la ficha, sin mandar a /403.
 */
export interface ObservacionCliente {
  id: number;
  texto: string;
  creadoEn: string;
  /** Nombre de quien la escribió. */
  autor: string;
}

export const MAX_CARACTERES_OBSERVACION = 1000;

/** Mismas reglas que el backend: obligatoria y como máximo 1000 caracteres. null si está bien. */
export function validarTextoObservacion(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return 'Escribe la observación.';
  if (limpio.length > MAX_CARACTERES_OBSERVACION) {
    return `La observación puede tener como máximo ${MAX_CARACTERES_OBSERVACION} caracteres.`;
  }
  return null;
}

/** Fecha de la observación como dd/mm/aaaa (día en México). */
export function fechaObservacion(creadoEn: string): string {
  return fechaCortaEnMexico(creadoEn) ?? 'Sin fecha';
}

function normalizar(x: unknown): ObservacionCliente | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const autor = r.autor && typeof r.autor === 'object' ? (r.autor as Record<string, unknown>) : null;
  return {
    id: Number(r.id),
    texto: String(r.texto ?? ''),
    creadoEn: String(r.creadoEn ?? ''),
    autor: autor?.nombre ? String(autor.nombre) : 'Personal del salón',
  };
}

const ruta = (clienteId: string) => `/api/clientes/${encodeURIComponent(clienteId)}/observaciones`;

export async function listarObservacionesCliente(clienteId: string): Promise<ObservacionCliente[]> {
  const res = await apiClient.get<{ data?: unknown[] }>(ruta(clienteId), {
    customBase: getBackendBaseUrl(),
    skip403Redirect: true,
  });
  const lista = Array.isArray(res?.data) ? res.data : [];
  return lista.map(normalizar).filter((o): o is ObservacionCliente => o !== null);
}

export async function crearObservacionCliente(clienteId: string, texto: string): Promise<ObservacionCliente> {
  const error = validarTextoObservacion(texto);
  if (error) throw new Error(error);
  const res = await apiClient.post<{ data?: unknown }>(
    ruta(clienteId),
    { texto: texto.trim() },
    { customBase: getBackendBaseUrl(), skip403Redirect: true },
  );
  const nueva = normalizar(res?.data);
  if (!nueva) throw new Error('No pudimos guardar la observación. Intenta de nuevo.');
  return nueva;
}
