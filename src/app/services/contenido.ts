import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { mensajeDeError } from '../utils/errorRed';
import { textoRespuestaFallida } from '../utils/errorServidor';

/**
 * Contenido público administrable (Admin > Contenido en el backend: promociones, preguntas frecuentes y equipo).
 * Las funciones públicas usan fetch con `next: { revalidate: 60 }` para poder llamarse desde componentes de servidor:
 * lo que publica el admin se ve en un minuto, sin deploy. Nunca lanzan: con error devuelven lista vacía y el mensaje
 * (la pantalla muestra un estado vacío honesto, nunca datos inventados). Las de administración usan apiClient y lanzan.
 */

/** Resultado de una lectura pública: nunca lanza. */
export interface ListaPublica<T> {
  data: T[];
  error: string | null;
}

export interface PromocionPublica {
  id: number;
  titulo: string;
  descripcion: string;
  imagenUrl: string | null;
  /** Ruta interna del sitio ("/cliente/servicios-citas"), o null. */
  enlace: string | null;
  /** Día 'AAAA-MM-DD' en hora de México, o null (sin fecha). */
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  /** Se muestra como banner en el inicio. */
  destacada: boolean;
}

export interface PreguntaFrecuente {
  id: number;
  pregunta: string;
  respuesta: string;
}

/** Integrante del equipo en el sitio: solo lo que se publica (sin contacto ni datos laborales). */
export interface IntegranteEquipo {
  nombre: string;
  puesto: string;
  foto: string | null;
  bio: string | null;
}

export interface PromocionAdmin extends PromocionPublica {
  activa: boolean;
  orden: number;
}

export interface DatosPromocion {
  titulo?: string;
  descripcion?: string;
  imagenUrl?: string | null;
  enlace?: string | null;
  vigenteDesde?: string | null;
  vigenteHasta?: string | null;
  activa?: boolean;
  destacada?: boolean;
  orden?: number;
}

export interface PreguntaAdmin extends PreguntaFrecuente {
  orden: number;
  visible: boolean;
}

export interface DatosPregunta {
  pregunta?: string;
  respuesta?: string;
  orden?: number;
  visible?: boolean;
}

/** Perfil de empleado activo con lo que se publica de él en "Nuestro equipo". */
export interface PerfilEquipoAdmin {
  id: number;
  nombre: string;
  puesto: string;
  usuarioActivo: boolean;
  mostrarEnSitio: boolean;
  fotoPublica: string | null;
  bioPublica: string | null;
  ordenPublico: number;
}

export interface DatosPerfilPublico {
  mostrarEnSitio?: boolean;
  fotoPublica?: string | null;
  bioPublica?: string | null;
  ordenPublico?: number;
}

const esTexto = (v: unknown): v is string => typeof v === 'string';
const esTextoONulo = (v: unknown): v is string | null => v === null || typeof v === 'string';

/**
 * GET público con revalidación corta (sirve en componentes de servidor y en el navegador). Sin cookies: el contenido
 * es el mismo para todas las personas y así se puede guardar en caché.
 */
export async function leerListaPublica<T>(ruta: string, normalizar: (item: unknown) => T | null): Promise<ListaPublica<T>> {
  const url = `${getBackendBaseUrl()}${ruta}`;
  try {
    // Etiqueta: POST /api/revalidar la vacía al momento cuando el personal guarda (la de 60 s queda de respaldo).
    const res = await fetch(url, { next: { revalidate: 60, tags: ['contenido-publico'] } } as RequestInit);
    if (!res.ok) return { data: [], error: textoRespuestaFallida(res.status, await res.text(), url) };
    const cuerpo = (await res.json()) as { data?: unknown } | unknown[];
    const lista = Array.isArray(cuerpo) ? cuerpo : Array.isArray((cuerpo as { data?: unknown })?.data) ? ((cuerpo as { data: unknown[] }).data) : [];
    return { data: lista.map(normalizar).filter((x): x is T => x !== null), error: null };
  } catch (e) {
    return { data: [], error: mensajeDeError(e, 'No se pudo cargar el contenido.') };
  }
}

function promocionPublica(item: unknown): PromocionPublica | null {
  const p = item as Record<string, unknown> | null;
  if (!p || typeof p.id !== 'number' || !esTexto(p.titulo) || !esTexto(p.descripcion)) return null;
  return {
    id: p.id,
    titulo: p.titulo,
    descripcion: p.descripcion,
    imagenUrl: esTexto(p.imagenUrl) ? p.imagenUrl : null,
    enlace: esTexto(p.enlace) ? p.enlace : null,
    vigenteDesde: esTexto(p.vigenteDesde) ? p.vigenteDesde : null,
    vigenteHasta: esTexto(p.vigenteHasta) ? p.vigenteHasta : null,
    destacada: p.destacada === true,
  };
}

function preguntaPublica(item: unknown): PreguntaFrecuente | null {
  const p = item as Record<string, unknown> | null;
  if (!p || typeof p.id !== 'number' || !esTexto(p.pregunta) || !esTexto(p.respuesta)) return null;
  return { id: p.id, pregunta: p.pregunta, respuesta: p.respuesta };
}

function integrante(item: unknown): IntegranteEquipo | null {
  const p = item as Record<string, unknown> | null;
  if (!p || !esTexto(p.nombre) || !esTexto(p.puesto)) return null;
  return { nombre: p.nombre, puesto: p.puesto, foto: esTextoONulo(p.foto) ? p.foto : null, bio: esTextoONulo(p.bio) ? p.bio : null };
}

/** Promociones activas y vigentes hoy (hora de México), en el orden que eligió el admin. */
export function listarPromocionesActivas(): Promise<ListaPublica<PromocionPublica>> {
  return leerListaPublica('/api/contenido/promociones', promocionPublica);
}

/** Preguntas frecuentes visibles, ordenadas. */
export function listarPreguntasFrecuentes(): Promise<ListaPublica<PreguntaFrecuente>> {
  return leerListaPublica('/api/contenido/preguntas-frecuentes', preguntaPublica);
}

/** "Nuestro equipo": nombre, puesto, foto y presentación de quien el admin marcó para el sitio. */
export function listarEquipoPublico(): Promise<ListaPublica<IntegranteEquipo>> {
  return leerListaPublica('/api/contenido/equipo', integrante);
}

// ---------------------------------------------------------------- Administración (solo admin)

const opciones = () => ({ customBase: getBackendBaseUrl(), skip403Redirect: true });
const datos = <T>(res: unknown): T => (res as { data: T }).data;
const lista = <T>(res: unknown): T[] => {
  const d = (res as { data?: unknown } | null)?.data;
  return Array.isArray(d) ? (d as T[]) : [];
};

export async function listarPromocionesAdmin(): Promise<PromocionAdmin[]> {
  return lista<PromocionAdmin>(await apiClient.get<unknown>('/api/contenido/admin/promociones', opciones()));
}

export async function crearPromocion(cuerpo: DatosPromocion): Promise<PromocionAdmin> {
  return datos<PromocionAdmin>(await apiClient.post<unknown>('/api/contenido/admin/promociones', cuerpo, opciones()));
}

export async function actualizarPromocion(id: number, cambios: DatosPromocion): Promise<PromocionAdmin> {
  return datos<PromocionAdmin>(await apiClient.patch<unknown>(`/api/contenido/admin/promociones/${id}`, cambios, getBackendBaseUrl(), { skip403Redirect: true }));
}

export async function eliminarPromocion(id: number): Promise<void> {
  await apiClient.delete<unknown>(`/api/contenido/admin/promociones/${id}`, opciones());
}

export async function ordenarPromociones(ids: number[]): Promise<void> {
  await apiClient.put<unknown>('/api/contenido/admin/promociones/orden', { ids }, opciones());
}

export async function listarPreguntasAdmin(): Promise<PreguntaAdmin[]> {
  return lista<PreguntaAdmin>(await apiClient.get<unknown>('/api/contenido/admin/preguntas-frecuentes', opciones()));
}

export async function crearPregunta(cuerpo: DatosPregunta): Promise<PreguntaAdmin> {
  return datos<PreguntaAdmin>(await apiClient.post<unknown>('/api/contenido/admin/preguntas-frecuentes', cuerpo, opciones()));
}

export async function actualizarPregunta(id: number, cambios: DatosPregunta): Promise<PreguntaAdmin> {
  return datos<PreguntaAdmin>(
    await apiClient.patch<unknown>(`/api/contenido/admin/preguntas-frecuentes/${id}`, cambios, getBackendBaseUrl(), { skip403Redirect: true }),
  );
}

export async function eliminarPregunta(id: number): Promise<void> {
  await apiClient.delete<unknown>(`/api/contenido/admin/preguntas-frecuentes/${id}`, opciones());
}

export async function ordenarPreguntas(ids: number[]): Promise<void> {
  await apiClient.put<unknown>('/api/contenido/admin/preguntas-frecuentes/orden', { ids }, opciones());
}

export async function listarEquipoAdmin(): Promise<PerfilEquipoAdmin[]> {
  return lista<PerfilEquipoAdmin>(await apiClient.get<unknown>('/api/contenido/admin/equipo', opciones()));
}

export async function actualizarPerfilPublico(id: number, cambios: DatosPerfilPublico): Promise<PerfilEquipoAdmin> {
  return datos<PerfilEquipoAdmin>(await apiClient.patch<unknown>(`/api/contenido/admin/equipo/${id}`, cambios, getBackendBaseUrl(), { skip403Redirect: true }));
}

export async function ordenarEquipo(ids: number[]): Promise<void> {
  await apiClient.put<unknown>('/api/contenido/admin/equipo/orden', { ids }, opciones());
}
