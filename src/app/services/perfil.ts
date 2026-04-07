/**
 * Perfil de usuario alineado con Prisma (`Usuario`, `DireccionUsuario`).
 *
 * Rutas esperadas en el backend (ajusta si tu API usa otros paths):
 * - GET/PATCH `/api/auth/me` — cuerpo usuario con campos del modelo `Usuario` (y opcional `direcciones`).
 * - GET/POST `/api/direcciones-usuario`
 * - PUT o PATCH + DELETE `/api/direcciones-usuario/:id` (front: PUT primero, si 405 → PATCH)
 */

import { normalizarUrlImagenExterna } from '../utils/normalizarUrlImagen';
import { normalizarUsuarioAlmacenado, resolverNombreParaMostrar } from '../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../utils/userStorageSync';
import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

const BASE = () => getBackendBaseUrl();

/** Coincide con enum `TipoCabello` en schema.prisma */
export type TipoCabelloValor = 'liso' | 'ondulado' | 'rizado';

/** Coincide con enum `TipoDomicilio` en schema.prisma */
export type TipoDomicilioValor = 'casa' | 'trabajo';

/** Tabla `direcciones_usuario` */
export interface DireccionUsuarioDTO {
  id: string;
  calle: string;
  codigoPostal: string;
  estado: string;
  municipioAlcaldia: string;
  localidad: string;
  coloniaBarrio: string;
  numeroInterior?: string | null;
  indicaciones?: string | null;
  tipoDomicilio: TipoDomicilioValor;
  contactoNombreApellido: string;
  contactoTelefono: string;
  esPrincipal: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

/** Campos de `Usuario` relevantes para el perfil (sin password). */
export interface PerfilUsuarioCompleto {
  id: string;
  nombre: string;
  /** Si el API envía apellidos aparte (opcional). */
  apellidos?: string | null;
  email: string;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  rol?: string;
  foto?: string | null;
  tipoCabello?: TipoCabelloValor | null;
  colorNatural?: string | null;
  colorActual?: string | null;
  productosUsados?: string | null;
  alergias?: string | null;
  aceptaAvisoPrivacidad?: boolean;
  recibePromociones?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
  direcciones?: DireccionUsuarioDTO[];
}

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (v != null && String(v).length > 0) return String(v);
  }
  return undefined;
}

function pickBool(raw: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'boolean') return v;
  }
  return undefined;
}

/** Extrae objeto usuario de respuestas típicas `{ data }`, `{ user }`, `{ usuario }`. */
export function unwrapUsuarioPayload(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null;
  const o = res as Record<string, unknown>;
  const inner =
    (o.data && typeof o.data === 'object' && !Array.isArray(o.data) ? (o.data as Record<string, unknown>) : null) ??
    (o.user && typeof o.user === 'object' ? (o.user as Record<string, unknown>) : null) ??
    (o.usuario && typeof o.usuario === 'object' ? (o.usuario as Record<string, unknown>) : null);
  if (inner && (inner.id != null || inner._id != null)) return inner;
  if (o.id != null || o._id != null) return o;
  return null;
}

function normalizarTipoCabello(v: unknown): TipoCabelloValor | null {
  const s = String(v ?? '').toLowerCase();
  if (s === 'liso' || s === 'lacio') return 'liso';
  if (s === 'ondulado') return 'ondulado';
  if (s === 'rizado') return 'rizado';
  return null;
}

function normalizarTipoDomicilio(v: unknown): TipoDomicilioValor {
  const s = String(v ?? '').toLowerCase();
  return s === 'trabajo' ? 'trabajo' : 'casa';
}

function normalizarDireccion(raw: Record<string, unknown>): DireccionUsuarioDTO | null {
  const id = String(raw.id ?? raw._id ?? '');
  if (!id) return null;
  return {
    id,
    calle: String(raw.calle ?? ''),
    codigoPostal: String(raw.codigoPostal ?? raw.codigo_postal ?? ''),
    estado: String(raw.estado ?? ''),
    municipioAlcaldia: String(raw.municipioAlcaldia ?? raw.municipio_alcaldia ?? ''),
    localidad: String(raw.localidad ?? ''),
    coloniaBarrio: String(raw.coloniaBarrio ?? raw.colonia_barrio ?? ''),
    numeroInterior: raw.numeroInterior != null ? String(raw.numeroInterior) : raw.numero_interior != null ? String(raw.numero_interior) : null,
    indicaciones: raw.indicaciones != null ? String(raw.indicaciones) : null,
    tipoDomicilio: normalizarTipoDomicilio(raw.tipoDomicilio ?? raw.tipo_domicilio),
    contactoNombreApellido: String(raw.contactoNombreApellido ?? raw.contacto_nombre_apellido ?? ''),
    contactoTelefono: String(raw.contactoTelefono ?? raw.contacto_telefono ?? ''),
    esPrincipal: raw.esPrincipal === true || raw.es_principal === true,
    creadoEn: pickStr(raw, 'creadoEn', 'creado_en'),
    actualizadoEn: pickStr(raw, 'actualizadoEn', 'actualizado_en'),
  };
}

/** Normaliza respuesta API → `PerfilUsuarioCompleto` (camelCase y snake_case). */
export function normalizarPerfilUsuario(raw: Record<string, unknown>): PerfilUsuarioCompleto {
  const id = String(raw.id ?? raw._id ?? '');
  let direcciones: DireccionUsuarioDTO[] | undefined;
  const dirRaw = raw.direcciones ?? raw.DireccionUsuario;
  if (Array.isArray(dirRaw)) {
    direcciones = dirRaw
      .map((d) => (d && typeof d === 'object' ? normalizarDireccion(d as Record<string, unknown>) : null))
      .filter((d): d is DireccionUsuarioDTO => d != null);
  }

  const fecha =
    raw.fechaNacimiento ?? raw.fecha_nacimiento ?? raw.birthDate;
  let fechaNacimiento: string | null = null;
  if (fecha instanceof Date) {
    fechaNacimiento = fecha.toISOString().slice(0, 10);
  } else if (fecha != null) {
    const s = String(fecha);
    fechaNacimiento = s.includes('T') ? s.slice(0, 10) : s.slice(0, 10);
  }

  const apellidosRaw = pickStr(raw, 'apellidos', 'apellidoPaterno', 'apellido_paterno', 'apellidoMaterno', 'apellido_materno');

  return {
    id,
    nombre: resolverNombreParaMostrar(raw) || String(raw.nombre ?? raw.name ?? ''),
    apellidos: apellidosRaw ?? null,
    email: String(raw.email ?? ''),
    telefono: raw.telefono != null ? String(raw.telefono) : null,
    fechaNacimiento,
    rol: pickStr(raw, 'rol', 'role'),
    foto: (() => {
      const r = pickStr(
        raw,
        'foto',
        'avatarUrl',
        'avatar',
        'photo',
        'avatar_url',
        'picture',
        'image'
      );
      if (!r) return null;
      const n = normalizarUrlImagenExterna(r);
      return n || null;
    })(),
    tipoCabello: normalizarTipoCabello(raw.tipoCabello ?? raw.tipo_cabello),
    colorNatural: raw.colorNatural != null ? String(raw.colorNatural) : raw.color_natural != null ? String(raw.color_natural) : null,
    colorActual: raw.colorActual != null ? String(raw.colorActual) : raw.color_actual != null ? String(raw.color_actual) : null,
    productosUsados:
      raw.productosUsados != null
        ? String(raw.productosUsados)
        : raw.productos_usados != null
          ? String(raw.productos_usados)
          : null,
    alergias: raw.alergias != null ? String(raw.alergias) : null,
    aceptaAvisoPrivacidad: pickBool(raw, 'aceptaAvisoPrivacidad', 'acepta_aviso_privacidad'),
    recibePromociones: pickBool(raw, 'recibePromociones', 'recibe_promociones'),
    creadoEn: pickStr(raw, 'creadoEn', 'creado_en'),
    actualizadoEn: pickStr(raw, 'actualizadoEn', 'actualizado_en'),
    direcciones,
  };
}

export interface ActualizarMiPerfilPayload {
  nombre?: string;
  telefono?: string | null;
  /** URL pública (p. ej. Cloudinary) */
  foto?: string | null;
  /** ISO date `YYYY-MM-DD` o completo */
  fechaNacimiento?: string | null;
  tipoCabello?: TipoCabelloValor | null;
  colorNatural?: string | null;
  colorActual?: string | null;
  productosUsados?: string | null;
  alergias?: string | null;
  aceptaAvisoPrivacidad?: boolean;
  recibePromociones?: boolean;
}

/**
 * Claves permitidas en PATCH `/api/auth/me` según el DTO del backend (ValidationPipe whitelist).
 * Campos de perfil capilar / aviso de privacidad se omiten en la petición hasta que el API los exponga en el DTO.
 */
function cuerpoPatchAuthMe(payload: ActualizarMiPerfilPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.nombre !== undefined) body.nombre = payload.nombre;
  if (payload.telefono !== undefined) body.telefono = payload.telefono;
  if (payload.foto !== undefined) body.foto = payload.foto;
  if (payload.recibePromociones !== undefined) body.recibePromociones = payload.recibePromociones;
  if (payload.fechaNacimiento !== undefined) {
    const v = payload.fechaNacimiento;
    if (v && !String(v).includes('T')) {
      body.fechaNacimiento = `${v}T12:00:00.000Z`;
    } else {
      body.fechaNacimiento = v;
    }
  }
  return body;
}

export async function getMiPerfil(): Promise<PerfilUsuarioCompleto> {
  const res = await apiClient.get<unknown>('/api/auth/me', BASE());
  const obj = unwrapUsuarioPayload(res);
  if (!obj) throw new Error('No se pudo leer el perfil');
  return normalizarPerfilUsuario(obj);
}

export async function patchMiPerfil(payload: ActualizarMiPerfilPayload): Promise<PerfilUsuarioCompleto> {
  const body = cuerpoPatchAuthMe(payload);
  const res = await apiClient.patch<unknown>('/api/auth/me', body, BASE());
  const obj = unwrapUsuarioPayload(res);
  if (!obj) throw new Error('El servidor no devolvió el perfil actualizado');
  return normalizarPerfilUsuario(obj);
}

/** Sincroniza `user` en localStorage tras actualizar el perfil (foto, nombre, etc.). */
export function mergePerfilEnLocalStorage(updated: PerfilUsuarioCompleto, fotoFallback?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('user');
    const cur = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const fotoMerged = normalizarUrlImagenExterna(
      String(updated.foto ?? fotoFallback ?? cur.foto ?? cur.picture ?? '')
    );
    const merged = {
      ...cur,
      id: updated.id,
      nombre: (updated.nombre && String(updated.nombre).trim()) || resolverNombreParaMostrar(cur) || '',
      email: updated.email || String(cur.email ?? ''),
      telefono: updated.telefono ?? cur.telefono ?? '',
      foto: fotoMerged,
      picture: cur.picture,
      rol: updated.rol ?? cur.rol ?? cur.role,
      role: updated.rol ?? cur.role ?? cur.rol,
    };
    localStorage.setItem('user', JSON.stringify(normalizarUsuarioAlmacenado(merged)));
  } catch {
    /* ignore */
  }
  emitMiruUserStorageUpdated();
}

export type CrearDireccionUsuarioPayload = Omit<DireccionUsuarioDTO, 'id' | 'creadoEn' | 'actualizadoEn'>;

/**
 * Cuerpo JSON para el API: solo **camelCase** (igual que el modelo Prisma en TypeScript).
 * No mezclar con snake_case en el mismo body: Nest suele usar `forbidNonWhitelisted` y rechaza claves extra.
 */
export function bodyDireccionParaApi(p: CrearDireccionUsuarioPayload | Partial<CrearDireccionUsuarioPayload>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.calle !== undefined) out.calle = p.calle;
  if (p.codigoPostal !== undefined) out.codigoPostal = p.codigoPostal;
  if (p.estado !== undefined) out.estado = p.estado;
  if (p.municipioAlcaldia !== undefined) out.municipioAlcaldia = p.municipioAlcaldia;
  if (p.localidad !== undefined) out.localidad = p.localidad;
  if (p.coloniaBarrio !== undefined) out.coloniaBarrio = p.coloniaBarrio;
  if (p.numeroInterior !== undefined) out.numeroInterior = p.numeroInterior;
  if (p.indicaciones !== undefined) out.indicaciones = p.indicaciones;
  if (p.tipoDomicilio !== undefined) out.tipoDomicilio = p.tipoDomicilio;
  if (p.contactoNombreApellido !== undefined) out.contactoNombreApellido = p.contactoNombreApellido;
  if (p.contactoTelefono !== undefined) out.contactoTelefono = p.contactoTelefono;
  if (p.esPrincipal !== undefined) out.esPrincipal = p.esPrincipal;
  return out;
}

function direccionFromUpdateResponse(res: unknown): DireccionUsuarioDTO | null {
  if (!res || typeof res !== 'object') return null;
  const o = res as Record<string, unknown>;
  if (Object.keys(o).length === 0) return null;
  const raw =
    (o.data && typeof o.data === 'object' ? o.data : null) ??
    (o.direccion && typeof o.direccion === 'object' ? o.direccion : null) ??
    (o.id != null || o._id != null ? o : null);
  if (raw && typeof raw === 'object') {
    return normalizarDireccion(raw as Record<string, unknown>);
  }
  return null;
}

export async function listarDireccionesUsuario(opciones?: { usuarioId?: string }): Promise<DireccionUsuarioDTO[]> {
  const q = opciones?.usuarioId ? `?usuarioId=${encodeURIComponent(opciones.usuarioId)}` : '';
  const res = await apiClient.get<unknown>(`/api/direcciones-usuario${q}`, BASE());
  if (Array.isArray(res)) {
    return res
      .map((d) => (d && typeof d === 'object' ? normalizarDireccion(d as Record<string, unknown>) : null))
      .filter((d): d is DireccionUsuarioDTO => d != null);
  }
  const o = res as Record<string, unknown>;
  const list = o.data ?? o.direcciones;
  if (Array.isArray(list)) {
    return list
      .map((d) => (d && typeof d === 'object' ? normalizarDireccion(d as Record<string, unknown>) : null))
      .filter((d): d is DireccionUsuarioDTO => d != null);
  }
  return [];
}

export async function crearDireccionUsuario(payload: CrearDireccionUsuarioPayload): Promise<DireccionUsuarioDTO> {
  const res = await apiClient.post<unknown>('/api/direcciones-usuario', bodyDireccionParaApi(payload), BASE());
  const o = res as Record<string, unknown>;
  const raw =
    (o.data && typeof o.data === 'object' ? o.data : null) ??
    (o.direccion && typeof o.direccion === 'object' ? o.direccion : null) ??
    o;
  if (raw && typeof raw === 'object') {
    const d = normalizarDireccion(raw as Record<string, unknown>);
    if (d) return d;
  }
  throw new Error('No se pudo crear la dirección');
}

export async function actualizarDireccionUsuario(
  id: string,
  payload: Partial<CrearDireccionUsuarioPayload>
): Promise<DireccionUsuarioDTO> {
  const body = bodyDireccionParaApi(payload);

  async function resolverTrasExito(res: unknown): Promise<DireccionUsuarioDTO> {
    const d = direccionFromUpdateResponse(res);
    if (d) return d;
    const list = await listarDireccionesUsuario();
    const found = list.find((x) => x.id === id);
    if (found) return found;
    throw new Error('La dirección se guardó pero el servidor no devolvió el registro. Recarga la página.');
  }

  try {
    const res = await apiClient.put<unknown>(`/api/direcciones-usuario/${id}`, body, BASE());
    return resolverTrasExito(res);
  } catch (e1) {
    const status = (e1 as Error & { status?: number }).status;
    if (status === 405) {
      const res = await apiClient.patch<unknown>(`/api/direcciones-usuario/${id}`, body, BASE());
      return resolverTrasExito(res);
    }
    throw e1;
  }
}

export async function eliminarDireccionUsuario(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/direcciones-usuario/${id}`, BASE());
}
