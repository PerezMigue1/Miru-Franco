/**
 * Servicio de usuarios y roles para admin.
 * Endpoints: GET /api/usuarios, GET /api/usuarios/roles, POST /api/usuarios,
 * PUT /api/usuarios/:id, PATCH /api/usuarios/:id/estado, PATCH /api/usuarios/:id/rol
 */

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

/** Valores de rol en BD (alineado con backend ROLES_DB). */
export const ROLES_VALORES = ['cliente', 'becario', 'empleado', 'estilista', 'admin'] as const;
export type RolValor = (typeof ROLES_VALORES)[number];

/** Usuario tal como puede venir del backend (id uuid, rol string, activo, etc.). */
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  rol: string;
  activo: boolean;
  confirmado?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
  ultimaActividad?: string | null;
  /** Backend puede enviar _id en lugar de id */
  _id?: string;
}

/** Item del catálogo de roles (GET /api/usuarios/roles). */
export interface RolCatalogoItem {
  id: number;
  valor: RolValor;
  nombre: string;
  descripcion: string;
  permisos: string;
}

type ApiUsuarioRaw = Record<string, unknown> & {
  id?: string;
  _id?: string;
  nombre?: string;
  email?: string;
  telefono?: string | null;
  rol?: string;
  role?: string | { valor?: string; nombre?: string; name?: string }; // string o objeto anidado
  Rol?: string | { valor?: string; nombre?: string; name?: string }; // backend puede enviar "Rol" con mayúscula
  activo?: boolean;
  confirmado?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
  ultimaActividad?: string | null;
};

function extraerRol(raw: ApiUsuarioRaw): string {
  const r = raw.rol ?? raw.role ?? raw.Rol;
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object' && !Array.isArray(r)) {
    const v = (r as { valor?: string; nombre?: string; name?: string }).valor
      ?? (r as { nombre?: string }).nombre
      ?? (r as { name?: string }).name;
    if (typeof v === 'string') return v;
  }
  return 'cliente';
}

function normalizarUsuario(raw: ApiUsuarioRaw): Usuario {
  const id = String(raw.id ?? raw._id ?? '');
  const rolBruto = extraerRol(raw);
  const rol = String(rolBruto).toLowerCase().trim() || 'cliente';
  return {
    id,
    nombre: String(raw.nombre ?? ''),
    email: String(raw.email ?? ''),
    telefono: raw.telefono != null ? String(raw.telefono) : undefined,
    rol,
    activo: raw.activo !== false,
    confirmado: raw.confirmado === true,
    creadoEn: raw.creadoEn != null ? String(raw.creadoEn) : undefined,
    actualizadoEn: raw.actualizadoEn != null ? String(raw.actualizadoEn) : undefined,
    ultimaActividad: raw.ultimaActividad != null ? String(raw.ultimaActividad) : undefined,
  };
}

const BASE = () => getBackendBaseUrl();

/**
 * Lista de usuarios (admin). GET /api/usuarios
 * Acepta: array, { data: [] }, { data: {...} } (un solo usuario), { usuarios: [] }, { users: [] }
 */
export async function getUsuarios(): Promise<Usuario[]> {
  const res = await apiClient.get<unknown>('/api/usuarios', BASE());
  let list: ApiUsuarioRaw[] = [];
  if (Array.isArray(res)) {
    list = res as ApiUsuarioRaw[];
  } else if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>;
    if (Array.isArray(o.data)) {
      list = o.data as ApiUsuarioRaw[];
    } else if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
      const inner = o.data as Record<string, unknown>;
      if (Array.isArray(inner.users)) list = inner.users as ApiUsuarioRaw[];
      else if (Array.isArray(inner.usuarios)) list = inner.usuarios as ApiUsuarioRaw[];
      else list = [o.data as ApiUsuarioRaw]; // un solo usuario en data
    } else if (Array.isArray(o.usuarios)) {
      list = o.usuarios as ApiUsuarioRaw[];
    } else if (Array.isArray(o.users)) {
      list = o.users as ApiUsuarioRaw[];
    }
  }
  return list.map(normalizarUsuario);
}

/**
 * Obtener un usuario por id. GET /api/usuarios/:id (admin).
 * Sirve para completar el rol si el listado no lo incluye.
 */
export async function getUsuarioById(id: string): Promise<Usuario> {
  const res = await apiClient.get<unknown>(`/api/usuarios/${id}`, BASE());
  const obj = res && typeof res === 'object' ? res as Record<string, unknown> : null;
  if (!obj) throw new Error('El API no devolvió el usuario');
  const data =
    (obj.data && typeof obj.data === 'object' ? obj.data as ApiUsuarioRaw : null) ??
    (obj.user && typeof obj.user === 'object' ? obj.user as ApiUsuarioRaw : null) ??
    (obj.usuario && typeof obj.usuario === 'object' ? obj.usuario as ApiUsuarioRaw : null) ??
    ((obj.id != null || obj._id != null) && obj.email ? (obj as unknown as ApiUsuarioRaw) : null);
  if (data && typeof data === 'object') return normalizarUsuario(data);
  throw new Error('El API no devolvió el usuario');
}

/**
 * Catálogo de roles. GET /api/usuarios/roles (público)
 */
export async function getRoles(): Promise<RolCatalogoItem[]> {
  const res = await apiClient.get<unknown>('/api/usuarios/roles', BASE());
  let list: RolCatalogoItem[] = [];
  if (Array.isArray(res)) {
    list = res as RolCatalogoItem[];
  } else if (res && typeof res === 'object' && Array.isArray((res as { data?: unknown }).data)) {
    list = (res as { data: RolCatalogoItem[] }).data;
  } else if (res && typeof res === 'object' && Array.isArray((res as { roles?: unknown }).roles)) {
    list = (res as { roles: RolCatalogoItem[] }).roles;
  }
  return list;
}

/** Payload mínimo para crear usuario desde admin. El backend puede exigir más campos (mismos que registro). */
export interface CrearUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  /** No enviar si el backend rechaza "rol" en el POST; asignar rol después con PATCH /api/usuarios/:id/rol */
  rol?: RolValor | string;
  telefono?: string;
  fechaNacimiento?: string;
  preguntaSeguridad?: { pregunta: string; respuesta: string };
  direccion?: { calle: string; numero: string; colonia: string; codigoPostal: string; referencia?: string };
  perfilCapilar?: { tipoCabello: string; tieneAlergias: boolean; alergias?: string; tratamientosQuimicos: boolean; tratamientos?: string };
  aceptaAvisoPrivacidad?: boolean;
  recibePromociones?: boolean;
  /** Usuarios creados por admin deben poder iniciar sesión sin verificación de correo */
  confirmado?: boolean;
}

/**
 * Crear usuario. POST /api/usuarios (admin).
 * Si el backend exige los mismos campos que el registro, se envían valores por defecto para los no proporcionados.
 */
export async function createUsuario(payload: CrearUsuarioPayload): Promise<Usuario> {
  const {
    nombre,
    email,
    password,
    telefono = '',
    fechaNacimiento = '2000-01-01',
    preguntaSeguridad = { pregunta: '¿Cuál es el nombre de tu mascota favorita?', respuesta: 'Por definir' },
    direccion = { calle: 'Por definir', numero: 'S/N', colonia: 'Por definir', codigoPostal: '00000', referencia: '' },
    perfilCapilar = { tipoCabello: 'liso', tieneAlergias: false, tratamientosQuimicos: false },
    aceptaAvisoPrivacidad = true,
    recibePromociones = false,
  } = payload;

  const body: Record<string, unknown> = {
    nombre,
    email,
    password,
    telefono: telefono || 'Por definir',
    fechaNacimiento: fechaNacimiento.includes('T') ? fechaNacimiento : `${fechaNacimiento}T00:00:00.000Z`,
    preguntaSeguridad,
    direccion,
    perfilCapilar,
    aceptaAvisoPrivacidad: Boolean(aceptaAvisoPrivacidad),
    recibePromociones: Boolean(recibePromociones),
    confirmado: payload.confirmado ?? true, // Usuarios creados por admin pueden iniciar sesión sin verificación
  };
  // No enviar "rol" si el backend lo rechaza en el POST; asignar rol después con PATCH /api/usuarios/:id/rol

  const res = await apiClient.post<Record<string, unknown>>(
    '/api/usuarios',
    body,
    BASE()
  );
  const obj = res && typeof res === 'object' ? res as Record<string, unknown> : null;
  if (!obj) throw new Error('El API no devolvió el usuario creado');

  const data =
    (obj.data && typeof obj.data === 'object' ? obj.data as ApiUsuarioRaw : null) ??
    (obj.user && typeof obj.user === 'object' ? obj.user as ApiUsuarioRaw : null) ??
    (obj.usuario && typeof obj.usuario === 'object' ? obj.usuario as ApiUsuarioRaw : null) ??
    ((obj.id != null || obj._id != null) && obj.email ? (obj as unknown as ApiUsuarioRaw) : null);

  if (data && typeof data === 'object') return normalizarUsuario(data);
  throw new Error('El API no devolvió el usuario creado');
}

/** Payload para actualizar usuario (PUT /api/usuarios/:id). */
export interface ActualizarUsuarioPayload {
  nombre?: string;
  email?: string;
  telefono?: string | null;
  rol?: RolValor | string;
  activo?: boolean;
  /** Algunos backends permiten cambiar contraseña en PUT (opcional). */
  password?: string;
}

/**
 * Actualizar usuario. PUT /api/usuarios/:id (admin)
 */
export async function updateUsuario(id: string, payload: ActualizarUsuarioPayload): Promise<Usuario> {
  const res = await apiClient.put<{ data?: ApiUsuarioRaw; user?: ApiUsuarioRaw }>(
    `/api/usuarios/${id}`,
    payload,
    BASE()
  );
  const data = (res as { data?: ApiUsuarioRaw }).data ?? (res as { user?: ApiUsuarioRaw }).user;
  if (data && typeof data === 'object') return normalizarUsuario(data);
  throw new Error('El API no devolvió el usuario actualizado');
}

/**
 * Activar/desactivar usuario. PATCH /api/usuarios/:id/estado (admin)
 * skip403Redirect: no redirigir a /403 para mostrar el error en la misma página
 */
export async function patchUsuarioEstado(id: string, activo: boolean): Promise<void> {
  await apiClient.patch<unknown>(`/api/usuarios/${id}/estado`, { activo }, BASE(), { skip403Redirect: true });
}

/**
 * Cambiar solo el rol. PATCH /api/usuarios/:id/rol (admin)
 * skip403Redirect: no redirigir a /403 para mostrar el error en la misma página
 */
export async function patchUsuarioRol(id: string, rol: RolValor | string): Promise<void> {
  await apiClient.patch<unknown>(`/api/usuarios/${id}/rol`, { rol }, BASE(), { skip403Redirect: true });
}
