'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { hoyEnMexico } from '../utils/fechaSoloDia';
import { textoRespuestaFallida } from '../utils/errorServidor';
import { mensajeDeError } from '../utils/errorRed';
import type { ConsentimientoRegistrado } from './consentimientos';

/**
 * Consulta del registro de consentimientos desde el panel (solo admin, PermisosGuard('*') en el backend).
 * La búsqueda coincide exacto con el id de la persona o del visitante, o contiene el nombre o el correo.
 */
export interface PersonaConsentimiento {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export type ConsentimientoAdmin = ConsentimientoRegistrado & { usuario: PersonaConsentimiento | null };

export interface PaginaConsentimientos {
  filas: ConsentimientoAdmin[];
  total: number;
  page: number;
  totalPages: number;
}

const opciones = () => ({ customBase: getBackendBaseUrl(), skip403Redirect: true });

export async function buscarConsentimientosAdmin(entrada: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<PaginaConsentimientos> {
  const params = new URLSearchParams();
  const q = entrada.q?.trim();
  if (q) params.set('q', q);
  params.set('page', String(entrada.page ?? 1));
  params.set('limit', String(entrada.limit ?? 20));
  const res = (await apiClient.get<unknown>(`/api/consentimientos/admin?${params.toString()}`, opciones())) as {
    data?: unknown;
    total?: number;
    page?: number;
    totalPages?: number;
  } | null;
  return {
    filas: Array.isArray(res?.data) ? (res.data as ConsentimientoAdmin[]) : [],
    total: Number(res?.total ?? 0),
    page: Number(res?.page ?? entrada.page ?? 1),
    totalPages: Math.max(1, Number(res?.totalPages ?? 1)),
  };
}

/** Tope de páginas al juntar el historial para el PDF (100 filas cada una). */
const MAX_PAGINAS_PDF = 50;
const FILAS_POR_PAGINA_PDF = 100;

export const MENSAJE_CONSTANCIA_DEMASIADO_GRANDE = `La búsqueda tiene más de ${MAX_PAGINAS_PDF * FILAS_POR_PAGINA_PDF} registros y la constancia no los incluiría todos. Busca a una sola persona por su nombre, correo o id y genera su constancia.`;

/**
 * Todas las filas de una búsqueda (para el PDF), de 100 en 100. Si pasan del tope, falla con
 * MENSAJE_CONSTANCIA_DEMASIADO_GRANDE: una constancia recortada diría que está completa sin estarlo.
 */
export async function todosLosConsentimientosAdmin(q: string): Promise<ConsentimientoAdmin[]> {
  const filas: ConsentimientoAdmin[] = [];
  for (let page = 1; page <= MAX_PAGINAS_PDF; page++) {
    const pagina = await buscarConsentimientosAdmin({ q, page, limit: FILAS_POR_PAGINA_PDF });
    if (pagina.totalPages > MAX_PAGINAS_PDF) throw new Error(MENSAJE_CONSTANCIA_DEMASIADO_GRANDE);
    filas.push(...pagina.filas);
    if (page >= pagina.totalPages || pagina.filas.length === 0) break;
  }
  return filas;
}

/**
 * CSV del backend (GET /consentimientos/admin/export) con la cookie de sesión. Sin persona, el de todas.
 * El backend neutraliza las fórmulas de los valores; aquí solo se descarga tal cual.
 */
export async function descargarConsentimientosCsv(
  usuarioId?: string,
  ahora: Date = new Date(),
): Promise<{ blob: Blob; nombre: string }> {
  const params = new URLSearchParams();
  if (usuarioId) params.set('usuarioId', usuarioId);
  params.set('formato', 'csv');
  const url = `${getBackendBaseUrl()}/api/consentimientos/admin/export?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: { 'X-Auth-Mode': 'cookie' } });
  } catch (e) {
    throw new Error(mensajeDeError(e, 'No se pudo descargar el CSV.'));
  }
  if (!res.ok) {
    throw new Error(textoRespuestaFallida(res.status, await res.text(), url));
  }
  const blob = await res.blob();
  const cabecera = res.headers.get('Content-Disposition');
  const nombre =
    cabecera?.match(/filename="?([^";\n]+)"?/)?.[1] ?? `consentimientos-${usuarioId ?? 'todos'}-${hoyEnMexico(ahora)}.csv`;
  return { blob, nombre };
}
