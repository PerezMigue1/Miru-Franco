'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export type EstadoCita =
  | 'pendiente'
  | 'confirmada'
  | 'en_curso'
  | 'completada'
  | 'cancelada'
  | 'reprogramada'
  | 'no_asistio';

export type OrigenCita = 'en_linea' | 'mostrador' | 'sin_cita';

export interface CitaApi {
  id: number;
  /** null en citas sin cita de una persona sin cuenta (ver nombreInvitado). */
  clienteId: string | null;
  /** Nombre de la clienta registrada, o el de la invitada si no tiene cuenta. */
  clienteNombre?: string | null;
  telefonoInvitado?: string | null;
  origen?: OrigenCita;
  especialistaId: string;
  especialistaNombre?: string | null;
  servicioId: number;
  servicioNombre?: string | null;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  estado: EstadoCita;
  notas?: string | null;
  motivoCancelacion?: string | null;
  horaCheckIn?: string | null;
  horaCheckOut?: string | null;
  creadoEn?: string;
}

export interface CrearCitaPayload {
  clienteId: string;
  especialistaId: string;
  servicioId: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  notas?: string;
}

export type NivelRiesgoCancelacion = 'bajo' | 'medio' | 'alto';

export interface RiesgoCancelacionApi {
  citaId: number;
  probabilidadCancelacion: number;
  porcentajeCancelacion: number;
  prediccionCancelada: boolean;
  prediccion: 'cancelada' | 'no_cancelada';
  nivelRiesgo: NivelRiesgoCancelacion;
  accionSugerida: string;
  calculadoEn: string;
  modelo?: {
    nombre: string;
    algoritmo: string;
    umbral: number;
    filasEntrenamiento: number;
  };
}

interface ListadoCitasResp {
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

function normalizarCita(x: unknown): CitaApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const estadoRaw = s(r.estado).toLowerCase();
  const estadosValidos: EstadoCita[] = [
    'pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada', 'reprogramada', 'no_asistio',
  ];
  const estado: EstadoCita = estadosValidos.includes(estadoRaw as EstadoCita)
    ? (estadoRaw as EstadoCita)
    : 'pendiente';
  return {
    id: Number(n(r.id, 0) ?? 0),
    clienteId: s(r.clienteId ?? r.cliente_id) || null,
    // El backend anida el nombre en cliente/especialista/servicio; usarlo como respaldo. Sin cuenta: el de la invitada.
    clienteNombre:
      s(r.clienteNombre ?? r.cliente_nombre ?? (r.cliente as Record<string, unknown>)?.nombre ?? r.nombreInvitado ?? r.nombre_invitado) || null,
    telefonoInvitado: s(r.telefonoInvitado ?? r.telefono_invitado) || null,
    origen: (['en_linea', 'mostrador', 'sin_cita'] as const).find((o) => o === s(r.origen)) ?? 'en_linea',
    especialistaId: s(r.especialistaId ?? r.especialista_id),
    especialistaNombre: s(r.especialistaNombre ?? r.especialista_nombre ?? (r.especialista as Record<string, unknown>)?.nombre) || null,
    servicioId: Number(n(r.servicioId ?? r.servicio_id, 0) ?? 0),
    servicioNombre: s(r.servicioNombre ?? r.servicio_nombre ?? (r.servicio as Record<string, unknown>)?.nombre) || null,
    fechaHoraInicio: s(r.fechaHoraInicio ?? r.fecha_hora_inicio),
    fechaHoraFin: s(r.fechaHoraFin ?? r.fecha_hora_fin),
    estado,
    notas: s(r.notas) || null,
    motivoCancelacion: s(r.motivoCancelacion ?? r.motivo_cancelacion) || null,
    horaCheckIn: s(r.horaCheckIn ?? r.hora_check_in) || null,
    horaCheckOut: s(r.horaCheckOut ?? r.hora_check_out) || null,
    creadoEn: s(r.creadoEn ?? r.creado_en) || undefined,
  };
}

export interface ListarCitasParams {
  desde?: string;
  hasta?: string;
  estado?: string;
  especialistaId?: string;
  page?: number;
  limit?: number;
  /** Campo de orden. Por defecto 'fechaHoraInicio' (asc). */
  orden?: 'fechaHoraInicio' | 'creadoEn';
}

export async function listarCitas(
  params?: ListarCitasParams
): Promise<{ data: CitaApi[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.desde) sp.set('desde', params.desde);
  if (params?.hasta) sp.set('hasta', params.hasta);
  if (params?.estado) sp.set('estado', params.estado);
  if (params?.especialistaId) sp.set('especialistaId', params.especialistaId);
  if (params?.orden) sp.set('orden', params.orden);
  sp.set('page', String(params?.page ?? 1));
  sp.set('limit', String(params?.limit ?? 50));
  const endpoint = `/api/citas?${sp.toString()}`;
  const res = await apiClient.get<ListadoCitasResp>(endpoint, { customBase: getBackendBaseUrl() });
  const data = Array.isArray(res?.data)
    ? res.data.map(normalizarCita).filter((c): c is CitaApi => Boolean(c))
    : Array.isArray(res)
    ? (res as unknown[]).map(normalizarCita).filter((c): c is CitaApi => Boolean(c))
    : [];
  return { data, total: Number(res?.count ?? data.length) };
}

export async function listarCitasDelDia(fecha?: string, especialistaId?: string): Promise<CitaApi[]> {
  const sp = new URLSearchParams();
  if (fecha) sp.set('fecha', fecha);
  if (especialistaId) sp.set('especialistaId', especialistaId);
  const res = await apiClient.get<unknown>(`/api/citas/dia?${sp.toString()}`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[]).map(normalizarCita).filter((c): c is CitaApi => Boolean(c));
}

export async function listarCalendario(desde: string, hasta: string, especialistaId?: string): Promise<CitaApi[]> {
  const sp = new URLSearchParams({ desde, hasta });
  if (especialistaId) sp.set('especialistaId', especialistaId);
  const res = await apiClient.get<unknown>(`/api/citas/calendario?${sp.toString()}`, { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[]).map(normalizarCita).filter((c): c is CitaApi => Boolean(c));
}

export async function obtenerCita(id: number): Promise<CitaApi | null> {
  const res = await apiClient.get<unknown>(`/api/citas/${id}`, { customBase: getBackendBaseUrl() });
  const obj = (res as Record<string, unknown>)?.data ?? res;
  return normalizarCita(obj);
}

export async function crearCita(payload: CrearCitaPayload): Promise<CitaApi> {
  const res = await apiClient.post<unknown>('/api/citas', payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo crear la cita');
  return cita;
}

/**
 * Calcula el riesgo en el backend. El frontend solo envía IDs: las 18
 * variables del modelo se construyen con datos reales de PostgreSQL.
 */
export async function predecirRiesgosCancelacion(
  citaIds: number[]
): Promise<RiesgoCancelacionApi[]> {
  if (citaIds.length === 0) return [];
  const res = await apiClient.post<unknown>(
    '/api/citas/riesgo-cancelacion',
    { citaIds },
    getBackendBaseUrl()
  );
  const arr = Array.isArray(res)
    ? res
    : Array.isArray((res as Record<string, unknown>)?.data)
      ? (res as { data: unknown[] }).data
      : [];

  return arr
    .map((elemento): RiesgoCancelacionApi | null => {
      if (!elemento || typeof elemento !== 'object') return null;
      const r = elemento as Record<string, unknown>;
      const citaId = Number(r.citaId);
      const probabilidad = Number(r.probabilidadCancelacion);
      const porcentaje = Number(r.porcentajeCancelacion);
      const nivel = s(r.nivelRiesgo).toLowerCase();
      if (
        !Number.isInteger(citaId) ||
        !Number.isFinite(probabilidad) ||
        !['bajo', 'medio', 'alto'].includes(nivel)
      ) {
        return null;
      }
      return {
        citaId,
        probabilidadCancelacion: probabilidad,
        porcentajeCancelacion: Number.isFinite(porcentaje)
          ? porcentaje
          : Number((probabilidad * 100).toFixed(1)),
        prediccionCancelada: Boolean(r.prediccionCancelada),
        prediccion: r.prediccion === 'cancelada' ? 'cancelada' : 'no_cancelada',
        nivelRiesgo: nivel as NivelRiesgoCancelacion,
        accionSugerida: s(r.accionSugerida),
        calculadoEn: s(r.calculadoEn),
        modelo:
          r.modelo && typeof r.modelo === 'object'
            ? {
                nombre: s((r.modelo as Record<string, unknown>).nombre),
                algoritmo: s((r.modelo as Record<string, unknown>).algoritmo),
                umbral: Number((r.modelo as Record<string, unknown>).umbral),
                filasEntrenamiento: Number(
                  (r.modelo as Record<string, unknown>).filasEntrenamiento
                ),
              }
            : undefined,
      };
    })
    .filter((riesgo): riesgo is RiesgoCancelacionApi => Boolean(riesgo));
}

export async function actualizarCita(
  id: number,
  payload: Partial<CrearCitaPayload>
): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo actualizar la cita');
  return cita;
}

export async function checkInCita(id: number): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}/check-in`, {}, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo hacer check-in');
  return cita;
}

export async function checkOutCita(id: number): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}/check-out`, {}, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo hacer check-out');
  return cita;
}

export async function reprogramarCita(
  id: number,
  payload: { fechaHoraInicio: string; fechaHoraFin: string }
): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}/reprogramar`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo reprogramar la cita');
  return cita;
}

export async function cancelarCita(
  id: number,
  payload: { motivoCancelacion: string }
): Promise<CitaApi> {
  const res = await apiClient.patch<unknown>(`/api/citas/${id}/cancelar`, payload, getBackendBaseUrl());
  const obj = (res as Record<string, unknown>)?.data ?? res;
  const cita = normalizarCita(obj);
  if (!cita) throw new Error('No se pudo cancelar la cita');
  return cita;
}

export async function registrarMateriales(
  citaId: number,
  payload: { presentacionId: number; cantidad: number; motivo?: string }
): Promise<void> {
  // El backend (MaterialesCitaDto) espera { materiales: [{ presentacionId, cantidad }] }.
  // Con forbidNonWhitelisted activo, enviar el objeto plano provoca 400.
  const body = { materiales: [{ presentacionId: payload.presentacionId, cantidad: payload.cantidad }] };
  await apiClient.post<unknown>(`/api/citas/${citaId}/materiales`, body, getBackendBaseUrl());
}

// --- Agendamiento público: especialistas + disponibilidad ---

export interface EspecialistaApi {
  id: string;
  nombre: string;
  foto?: string | null;
  puesto?: string | null;
  especialidades?: string[];
}

function normalizarEspecialista(x: unknown): EspecialistaApi | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const id = s(r.id);
  if (!id) return null;
  return {
    id,
    nombre: s(r.nombre) || 'Especialista',
    foto: r.foto != null ? s(r.foto) : null,
    puesto: r.puesto != null ? s(r.puesto) : null,
    especialidades: Array.isArray(r.especialidades) ? r.especialidades.map((e) => s(e)) : [],
  };
}

/** GET /api/citas/especialistas — para elegir a quién agendar. Nunca trae email/teléfono. */
export async function obtenerEspecialistas(): Promise<EspecialistaApi[]> {
  const res = await apiClient.get<unknown>('/api/citas/especialistas', { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? (res as Record<string, unknown[]>).data : [];
  return (arr as unknown[]).map(normalizarEspecialista).filter((e): e is EspecialistaApi => Boolean(e));
}

export interface SlotDisponible {
  inicio: string;
  fin: string;
  horaLocal: string;
}

export interface DisponibilidadApi {
  fecha: string;
  especialistaId: string;
  servicioId: number;
  duracionMinutos: number;
  abierto: boolean;
  motivo: string | null;
  slots: SlotDisponible[];
}

/**
 * GET /api/citas/disponibilidad — slots libres reales de un especialista, en una fecha,
 * para la duración del servicio elegido. `inicio`/`fin` de cada slot ya son ISO completos:
 * se mandan tal cual a `crearCita`, nunca se reconstruyen en el front (evita bugs de timezone).
 */
export async function obtenerDisponibilidad(params: {
  especialistaId: string;
  fecha: string;
  servicioId: number;
}): Promise<DisponibilidadApi> {
  const sp = new URLSearchParams({
    especialistaId: params.especialistaId,
    fecha: params.fecha,
    servicioId: String(params.servicioId),
  });
  const res = await apiClient.get<unknown>(`/api/citas/disponibilidad?${sp.toString()}`, { customBase: getBackendBaseUrl() });
  const r = (res ?? {}) as Record<string, unknown>;
  const slotsRaw = Array.isArray(r.slots) ? r.slots : [];
  return {
    fecha: s(r.fecha),
    especialistaId: s(r.especialistaId),
    servicioId: Number(n(r.servicioId, 0) ?? 0),
    duracionMinutos: Number(n(r.duracionMinutos, 0) ?? 0),
    abierto: Boolean(r.abierto),
    motivo: r.motivo != null ? s(r.motivo) : null,
    slots: slotsRaw.map((x) => {
      const sr = (x ?? {}) as Record<string, unknown>;
      return { inicio: s(sr.inicio), fin: s(sr.fin), horaLocal: s(sr.horaLocal) };
    }),
  };
}

// --- Atención sin cita (recepción) ---

export interface CrearCitaSinCitaPayload {
  /** Persona sin cuenta: nombre (y teléfono). Clienta registrada: clienteId. */
  nombre?: string;
  telefono?: string;
  clienteId?: string;
  servicioId: number;
  especialistaId: string;
  /** true: empieza a atenderse ya (queda en curso). */
  iniciarAhora?: boolean;
}

/** POST /api/citas/sin-cita — turno inmediato de alguien que llega sin cita. */
export async function crearCitaSinCita(payload: CrearCitaSinCitaPayload): Promise<CitaApi> {
  const res = await apiClient.post<unknown>('/api/citas/sin-cita', payload, getBackendBaseUrl());
  const cita = normalizarCita((res as Record<string, unknown>)?.data ?? res);
  if (!cita) throw new Error('No se pudo registrar el turno');
  return cita;
}

export interface PersonaPersonal {
  id: string;
  nombre: string;
  foto: string | null;
}

function listaPersonal(res: unknown): PersonaPersonal[] {
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? ((res as Record<string, unknown>).data as unknown[]) : [];
  return arr
    .map((x) => {
      const r = (x ?? {}) as Record<string, unknown>;
      return { id: s(r.id), nombre: s(r.nombre) || 'Sin nombre', foto: r.foto != null ? s(r.foto) : null };
    })
    .filter((p) => p.id);
}

/** GET /api/citas/especialistas-libres — quién puede hacer el servicio y está libre ahora. */
export async function especialistasLibres(servicioId: number): Promise<PersonaPersonal[]> {
  const res = await apiClient.get<unknown>(`/api/citas/especialistas-libres?servicioId=${servicioId}`, { customBase: getBackendBaseUrl() });
  return listaPersonal(res);
}

/** GET /api/citas/personal — personal activo que atiende (para elegir participantes al cobrar). */
export async function personalQueAtiende(): Promise<PersonaPersonal[]> {
  const res = await apiClient.get<unknown>('/api/citas/personal', { customBase: getBackendBaseUrl() });
  return listaPersonal(res);
}

/** GET /api/citas/por-cobrar — citas finalizadas que todavía no tienen venta. */
export async function citasPorCobrar(): Promise<CitaApi[]> {
  const res = await apiClient.get<unknown>('/api/citas/por-cobrar', { customBase: getBackendBaseUrl() });
  const arr = Array.isArray(res) ? res : Array.isArray((res as Record<string, unknown>)?.data) ? ((res as Record<string, unknown>).data as unknown[]) : [];
  return arr.map(normalizarCita).filter((c): c is CitaApi => Boolean(c));
}
