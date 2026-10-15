'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { diaEnMexico, hoyEnMexico } from '../utils/fechaSoloDia';
import type { ConsentimientoRegistrado } from './consentimientos';

/**
 * Derechos ARCO (backend-miru src/arco): la titular abre solicitudes, descarga sus datos y se opone a las
 * promociones; el panel las responde y ejecuta las cancelaciones. Plazos en días hábiles: respuesta en 20 desde
 * la recepción y efectividad en 15 desde la respuesta (los calcula el backend).
 */
export type TipoArco = 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion' | 'revocacion';
export type EstadoArco = 'recibida' | 'en_proceso' | 'respondida' | 'atendida' | 'rechazada';
/** Estados a los que el panel puede mover una solicitud (PATCH). */
export type EstadoArcoRespuesta = Exclude<EstadoArco, 'recibida'>;

export interface SolicitudArco {
  id: number;
  folio: string;
  tipo: TipoArco;
  descripcion: string | null;
  estado: EstadoArco;
  creadaEn: string;
  venceRespuesta: string;
  respuesta: string | null;
  respondidaEn: string | null;
  venceEfectividad: string | null;
  atendidaEn: string | null;
}

export interface SolicitudArcoAdmin extends SolicitudArco {
  usuario: { id: string; nombre: string; email: string; telefono: string | null } | null;
  atendidaPor: { id: string; nombre: string } | null;
  vencida: boolean;
}

/** GET /arco/mis-datos: las secciones del contrato y las que el backend agregue (decimales como texto). */
export interface MisDatos {
  generadoEn: string;
  perfil: Record<string, unknown>;
  direcciones?: Record<string, unknown>[];
  pedidos?: Record<string, unknown>[];
  citas?: Record<string, unknown>[];
  consentimientos?: ConsentimientoRegistrado[];
  solicitudesArco?: SolicitudArco[];
  [seccion: string]: unknown;
}

// Sin redirigir a /403 ni a /500: las pantallas de privacidad muestran el error junto a la acción.
const opciones = () => ({ customBase: getBackendBaseUrl(), skip403Redirect: true, skip500Redirect: true });

function datoDe<T>(res: unknown): T | undefined {
  return (res as { data?: T } | null)?.data;
}

function listaDe<T>(res: unknown): T[] {
  const data = datoDe<unknown>(res);
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function crearSolicitudArco(entrada: { tipo: TipoArco; descripcion?: string }): Promise<SolicitudArco> {
  const descripcion = entrada.descripcion?.trim();
  const cuerpo = descripcion ? { tipo: entrada.tipo, descripcion } : { tipo: entrada.tipo };
  const res = await apiClient.post<unknown>('/api/arco/solicitudes', cuerpo, opciones());
  return datoDe<SolicitudArco>(res) as SolicitudArco;
}

/** Solicitudes propias, la más reciente primero. */
export async function misSolicitudesArco(): Promise<SolicitudArco[]> {
  return listaDe<SolicitudArco>(await apiClient.get<unknown>('/api/arco/mias', opciones()));
}

export async function obtenerMisDatos(): Promise<MisDatos> {
  const datos = datoDe<MisDatos>(await apiClient.get<unknown>('/api/arco/mis-datos', opciones()));
  if (!datos || typeof datos !== 'object' || !datos.perfil) {
    throw new Error('No pudimos leer tus datos. Intenta de nuevo en unos minutos.');
  }
  return datos;
}

/** Archivo JSON descargable con todo lo que devolvió el backend, fechado con el día de México. */
export function archivoMisDatos(datos: MisDatos | Record<string, unknown>): { nombre: string; tipo: string; contenido: string } {
  const generado = typeof datos.generadoEn === 'string' ? datos.generadoEn : null;
  const dia = diaEnMexico(generado) ?? hoyEnMexico();
  return {
    nombre: `mis-datos-miru-franco-${dia}.json`,
    tipo: 'application/json',
    contenido: JSON.stringify(datos, null, 2),
  };
}

/** Oposición a las promociones: el backend la aplica de inmediato y la registra como atendida. */
export async function oponerseAPromociones(): Promise<SolicitudArco> {
  const res = await apiClient.post<unknown>('/api/arco/oposicion', { finalidad: 'promociones' }, opciones());
  return datoDe<SolicitudArco>(res) as SolicitudArco;
}

export interface PaginaSolicitudesArco {
  filas: SolicitudArcoAdmin[];
  total: number;
  page: number;
  totalPages: number;
}

const LIMITE_BANDEJA = 20;

/** Bandeja del panel, ordenada por vencimiento de respuesta (la más urgente primero). */
export async function listarSolicitudesArco(filtros: {
  estado?: EstadoArco;
  vencidas?: boolean;
  page?: number;
}): Promise<PaginaSolicitudesArco> {
  const params = new URLSearchParams();
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.vencidas !== undefined) params.set('vencidas', String(filtros.vencidas));
  params.set('page', String(filtros.page ?? 1));
  params.set('limit', String(LIMITE_BANDEJA));
  const res = (await apiClient.get<unknown>(`/api/arco/solicitudes?${params.toString()}`, opciones())) as {
    total?: number;
    page?: number;
    totalPages?: number;
  } | null;
  return {
    filas: listaDe<SolicitudArcoAdmin>(res),
    total: Number(res?.total ?? 0),
    page: Number(res?.page ?? filtros.page ?? 1),
    totalPages: Math.max(1, Number(res?.totalPages ?? 1)),
  };
}

export const MENSAJE_FALTA_RESPUESTA = 'Escribe la respuesta para la titular.';
export const MAX_RESPUESTA_ARCO = 5000;

/** Estados que son una respuesta a la titular: no se guardan sin texto. */
export function exigeRespuesta(estado: EstadoArcoRespuesta): boolean {
  return estado === 'respondida' || estado === 'rechazada';
}

/** Consentimientos que el backend revoca al atender una solicitud de revocación (PATCH con `revocar`). */
export type ConsentimientoRevocableArco = 'promociones' | 'datos_salud' | 'fotos_resultado';

/**
 * PATCH /arco/solicitudes/:id. `revocar` es obligatorio y no vacío al marcar atendida una revocación (lo valida
 * la bandeja con validarRevocacion); vacío no se manda.
 */
export async function responderSolicitudArco(
  id: number,
  entrada: { estado: EstadoArcoRespuesta; respuesta?: string; revocar?: ConsentimientoRevocableArco[] },
): Promise<{ solicitud: SolicitudArcoAdmin; correoEnviado?: boolean }> {
  const respuesta = entrada.respuesta?.trim() ?? '';
  if (exigeRespuesta(entrada.estado) && !respuesta) throw new Error(MENSAJE_FALTA_RESPUESTA);
  const cuerpo: { estado: EstadoArcoRespuesta; respuesta?: string; revocar?: ConsentimientoRevocableArco[] } = {
    estado: entrada.estado,
  };
  if (respuesta) cuerpo.respuesta = respuesta;
  if (entrada.revocar?.length) cuerpo.revocar = entrada.revocar;
  const res = await apiClient.patch<unknown>(`/api/arco/solicitudes/${id}`, cuerpo, getBackendBaseUrl(), {
    skip403Redirect: true,
  });
  // correoEnviado viene en el nivel superior cuando el estado es respondida, atendida o rechazada.
  const correoEnviado = (res as { correoEnviado?: unknown } | null)?.correoEnviado;
  return {
    solicitud: datoDe<SolicitudArcoAdmin>(res) as SolicitudArcoAdmin,
    correoEnviado: typeof correoEnviado === 'boolean' ? correoEnviado : undefined,
  };
}

/**
 * Anonimiza la cuenta de una solicitud de cancelación (irreversible). Devuelve el mensaje del backend y si salió
 * el correo de confirmación a la titular (`data.correoEnviado`).
 */
export async function ejecutarCancelacionArco(id: number): Promise<{ mensaje: string; correoEnviado?: boolean }> {
  const res = (await apiClient.post<unknown>(`/api/arco/solicitudes/${id}/ejecutar-cancelacion`, undefined, opciones())) as {
    message?: string;
    data?: { correoEnviado?: unknown };
  } | null;
  const correoEnviado = res?.data?.correoEnviado;
  return {
    mensaje: res?.message ?? 'Cuenta anonimizada y solicitud atendida.',
    correoEnviado: typeof correoEnviado === 'boolean' ? correoEnviado : undefined,
  };
}
