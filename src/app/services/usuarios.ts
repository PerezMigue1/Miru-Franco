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
  fechaNacimiento?: string | null;
  googleId?: string | null;
  foto?: string | null;
  rol: string;
  activo: boolean;
  confirmado?: boolean;
  aceptaAvisoPrivacidad?: boolean;
  recibePromociones?: boolean;
  resetPasswordExpires?: string | null;
  resetPasswordToken?: string | null;
  codigoOtp?: string | null;
  otpExpira?: string | null;
  intentosLoginFallidos?: number;
  cuentaBloqueadaHasta?: string | null;
  ultimoIntentoLogin?: string | null;
  tokensRevocadosDesde?: string | null;
  tipoCabello?: string | null;
  colorNatural?: string | null;
  colorActual?: string | null;
  productosUsados?: string | null;
  alergias?: string | null;
  preguntaSeguridad?: string | null;
  respuestaSeguridad?: string | null;
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
  fechaNacimiento?: string | null;
  googleId?: string | null;
  foto?: string | null;
  rol?: string;
  role?: string | { valor?: string; nombre?: string; name?: string }; // string o objeto anidado
  Rol?: string | { valor?: string; nombre?: string; name?: string }; // backend puede enviar "Rol" con mayúscula
  activo?: boolean;
  confirmado?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
  ultimaActividad?: string | null;
  aceptaAvisoPrivacidad?: boolean;
  recibePromociones?: boolean;
  resetPasswordExpires?: string | null;
  resetPasswordToken?: string | null;
  codigoOTP?: string | null;
  codigo_otp?: string | null;
  otpExpira?: string | null;
  otp_expira?: string | null;
  intentosLoginFallidos?: number;
  cuentaBloqueadaHasta?: string | null;
  ultimoIntentoLogin?: string | null;
  tokensRevocadosDesde?: string | null;
  tipoCabello?: string | null;
  colorNatural?: string | null;
  colorActual?: string | null;
  productosUsados?: string | null;
  alergias?: string | null;
  preguntaSeguridad?: string | null;
  respuestaSeguridad?: string | null;
  pregunta_seguridad?: string | null;
  respuesta_seguridad?: string | null;
  perfilCapilar?: {
    tipoCabello?: string | null;
    tipo_cabello?: string | null;
    colorNatural?: string | null;
    color_natural?: string | null;
    colorActual?: string | null;
    color_actual?: string | null;
    productosUsados?: string | null;
    productos_usados?: string | null;
    alergias?: string | null;
  } | null;
  perfil_capilar?: {
    tipoCabello?: string | null;
    tipo_cabello?: string | null;
    colorNatural?: string | null;
    color_natural?: string | null;
    colorActual?: string | null;
    color_actual?: string | null;
    productosUsados?: string | null;
    productos_usados?: string | null;
    alergias?: string | null;
  } | null;
  preguntaSeguridadObj?: { pregunta?: string | null; respuesta?: string | null } | null;
  pregunta_seguridad_obj?: { pregunta?: string | null; respuesta?: string | null } | null;
  creado_en?: string;
  actualizado_en?: string;
  ultima_actividad?: string | null;
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
  const perfilCapilar =
    (raw.perfilCapilar && typeof raw.perfilCapilar === 'object' ? raw.perfilCapilar : null)
    ?? (raw.perfil_capilar && typeof raw.perfil_capilar === 'object' ? raw.perfil_capilar : null);
  const preguntaSeguridadObj =
    (raw.preguntaSeguridadObj && typeof raw.preguntaSeguridadObj === 'object' ? raw.preguntaSeguridadObj : null)
    ?? (raw.pregunta_seguridad_obj && typeof raw.pregunta_seguridad_obj === 'object' ? raw.pregunta_seguridad_obj : null)
    ?? (raw.preguntaSeguridad && typeof raw.preguntaSeguridad === 'object'
      ? (raw.preguntaSeguridad as { pregunta?: string | null; respuesta?: string | null })
      : null);
  return {
    id,
    nombre: String(raw.nombre ?? ''),
    email: String(raw.email ?? ''),
    telefono: raw.telefono != null ? String(raw.telefono) : undefined,
    fechaNacimiento:
      raw.fechaNacimiento != null
        ? String(raw.fechaNacimiento)
        : raw.fecha_nacimiento != null
          ? String(raw.fecha_nacimiento)
          : undefined,
    googleId: raw.googleId != null ? String(raw.googleId) : raw.google_id != null ? String(raw.google_id) : undefined,
    foto: raw.foto != null ? String(raw.foto) : undefined,
    rol,
    activo: raw.activo !== false,
    confirmado: raw.confirmado === true,
    aceptaAvisoPrivacidad: raw.aceptaAvisoPrivacidad === true,
    recibePromociones: raw.recibePromociones === true,
    resetPasswordExpires:
      raw.resetPasswordExpires != null
        ? String(raw.resetPasswordExpires)
        : raw.reset_password_expires != null
          ? String(raw.reset_password_expires)
          : undefined,
    resetPasswordToken:
      raw.resetPasswordToken != null
        ? String(raw.resetPasswordToken)
        : raw.reset_password_token != null
          ? String(raw.reset_password_token)
          : undefined,
    codigoOtp:
      raw.codigoOTP != null
        ? String(raw.codigoOTP)
        : raw.codigo_otp != null
          ? String(raw.codigo_otp)
          : undefined,
    otpExpira:
      raw.otpExpira != null
        ? String(raw.otpExpira)
        : raw.otp_expira != null
          ? String(raw.otp_expira)
          : undefined,
    intentosLoginFallidos:
      typeof raw.intentosLoginFallidos === 'number'
        ? raw.intentosLoginFallidos
        : typeof raw.intentos_login_fallidos === 'number'
          ? raw.intentos_login_fallidos
          : undefined,
    cuentaBloqueadaHasta:
      raw.cuentaBloqueadaHasta != null
        ? String(raw.cuentaBloqueadaHasta)
        : raw.cuenta_bloqueada_hasta != null
          ? String(raw.cuenta_bloqueada_hasta)
          : undefined,
    ultimoIntentoLogin:
      raw.ultimoIntentoLogin != null
        ? String(raw.ultimoIntentoLogin)
        : raw.ultimo_intento_login != null
          ? String(raw.ultimo_intento_login)
          : undefined,
    tokensRevocadosDesde:
      raw.tokensRevocadosDesde != null
        ? String(raw.tokensRevocadosDesde)
        : raw.tokens_revocados_desde != null
          ? String(raw.tokens_revocados_desde)
          : undefined,
    tipoCabello:
      raw.tipoCabello != null
        ? String(raw.tipoCabello)
        : perfilCapilar?.tipoCabello != null
          ? String(perfilCapilar.tipoCabello)
          : perfilCapilar?.tipo_cabello != null
            ? String(perfilCapilar.tipo_cabello)
            : undefined,
    colorNatural:
      raw.colorNatural != null
        ? String(raw.colorNatural)
        : raw.color_natural != null
          ? String(raw.color_natural)
          : perfilCapilar?.colorNatural != null
            ? String(perfilCapilar.colorNatural)
            : perfilCapilar?.color_natural != null
              ? String(perfilCapilar.color_natural)
              : undefined,
    colorActual:
      raw.colorActual != null
        ? String(raw.colorActual)
        : raw.color_actual != null
          ? String(raw.color_actual)
          : perfilCapilar?.colorActual != null
            ? String(perfilCapilar.colorActual)
            : perfilCapilar?.color_actual != null
              ? String(perfilCapilar.color_actual)
              : undefined,
    productosUsados:
      raw.productosUsados != null
        ? String(raw.productosUsados)
        : raw.productos_usados != null
          ? String(raw.productos_usados)
          : perfilCapilar?.productosUsados != null
            ? String(perfilCapilar.productosUsados)
            : perfilCapilar?.productos_usados != null
              ? String(perfilCapilar.productos_usados)
          : undefined,
    alergias:
      raw.alergias != null
        ? String(raw.alergias)
        : perfilCapilar?.alergias != null
          ? String(perfilCapilar.alergias)
          : undefined,
    preguntaSeguridad:
      typeof raw.preguntaSeguridad === 'string'
        ? String(raw.preguntaSeguridad)
        : raw.pregunta_seguridad != null
          ? String(raw.pregunta_seguridad)
          : preguntaSeguridadObj?.pregunta != null
            ? String(preguntaSeguridadObj.pregunta)
          : undefined,
    respuestaSeguridad:
      raw.respuestaSeguridad != null
        ? String(raw.respuestaSeguridad)
        : raw.respuesta_seguridad != null
          ? String(raw.respuesta_seguridad)
          : preguntaSeguridadObj?.respuesta != null
            ? String(preguntaSeguridadObj.respuesta)
          : undefined,
    creadoEn: raw.creadoEn != null ? String(raw.creadoEn) : raw.creado_en != null ? String(raw.creado_en) : undefined,
    actualizadoEn: raw.actualizadoEn != null ? String(raw.actualizadoEn) : raw.actualizado_en != null ? String(raw.actualizado_en) : undefined,
    ultimaActividad:
      raw.ultimaActividad != null
        ? String(raw.ultimaActividad)
        : raw.ultima_actividad != null
          ? String(raw.ultima_actividad)
          : undefined,
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
  async function fetchAndNormalize(endpoint: string): Promise<Usuario | null> {
    const res = await apiClient.get<unknown>(endpoint, { customBase: BASE(), skip500Redirect: true });
    const obj = res && typeof res === 'object' ? res as Record<string, unknown> : null;
    if (!obj) return null;
    const data =
      (obj.data && typeof obj.data === 'object' ? obj.data as ApiUsuarioRaw : null) ??
      (obj.user && typeof obj.user === 'object' ? obj.user as ApiUsuarioRaw : null) ??
      (obj.usuario && typeof obj.usuario === 'object' ? obj.usuario as ApiUsuarioRaw : null) ??
      ((obj.id != null || obj._id != null) && obj.email ? (obj as unknown as ApiUsuarioRaw) : null);
    if (data && typeof data === 'object') return normalizarUsuario(data);
    return null;
  }

  try {
    const user = await fetchAndNormalize(`/api/usuarios/${id}/perfil`);
    if (user) return user;
  } catch {
    // fallback
  }

  try {
    const user = await fetchAndNormalize(`/api/usuarios/${id}`);
    if (user) return user;
  } catch {
    // handled below
  }

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
    perfilCapilar,
    aceptaAvisoPrivacidad: Boolean(aceptaAvisoPrivacidad),
    recibePromociones: Boolean(recibePromociones),
    confirmado: payload.confirmado ?? true, // Usuarios creados por admin pueden iniciar sesión sin verificación
  };
  // No enviar dirección embebida: DireccionUsuario se gestiona aparte tras crear el usuario.
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

export interface UsuarioPedidoRelacionado {
  id: number;
  estado: string;
  total: number;
  creadoEn?: string;
}

export interface UsuarioNotificacionRelacionada {
  id: string;
  tipo: string;
  titulo: string;
  leida: boolean;
  creadoEn?: string;
}

export interface UsuarioDireccionRelacionada {
  id: string;
  calle?: string;
  coloniaBarrio?: string;
  municipioAlcaldia?: string;
  estado?: string;
  codigoPostal?: string;
  esPrincipal?: boolean;
}

export interface UsuarioDatosRelacionados {
  pedidos: UsuarioPedidoRelacionado[];
  notificaciones: UsuarioNotificacionRelacionada[];
  direcciones: UsuarioDireccionRelacionada[];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((x): x is Record<string, unknown> => !!toRecord(x));
  const obj = toRecord(value);
  if (!obj) return [];
  const inner = obj.data ?? obj.items ?? obj.result ?? obj.pedidos ?? obj.notificaciones ?? obj.direcciones;
  if (Array.isArray(inner)) return inner.filter((x): x is Record<string, unknown> => !!toRecord(x));
  return [];
}

function normalizarPedidoRelacionado(raw: Record<string, unknown>): UsuarioPedidoRelacionado {
  return {
    id: Number(raw.id ?? 0),
    estado: String(raw.estado ?? 'desconocido'),
    total: Number(raw.total ?? 0),
    creadoEn: raw.creadoEn != null ? String(raw.creadoEn) : raw.creado_en != null ? String(raw.creado_en) : undefined,
  };
}

function normalizarNotificacionRelacionada(raw: Record<string, unknown>): UsuarioNotificacionRelacionada {
  return {
    id: String(raw.id ?? ''),
    tipo: String(raw.tipo ?? 'general'),
    titulo: String(raw.titulo ?? '(sin titulo)'),
    leida: Boolean(raw.leida),
    creadoEn: raw.creadoEn != null ? String(raw.creadoEn) : raw.creado_en != null ? String(raw.creado_en) : undefined,
  };
}

function normalizarDireccionRelacionada(raw: Record<string, unknown>): UsuarioDireccionRelacionada {
  return {
    id: String(raw.id ?? raw._id ?? ''),
    calle: raw.calle != null ? String(raw.calle) : undefined,
    coloniaBarrio: raw.coloniaBarrio != null ? String(raw.coloniaBarrio) : raw.colonia_barrio != null ? String(raw.colonia_barrio) : undefined,
    municipioAlcaldia: raw.municipioAlcaldia != null ? String(raw.municipioAlcaldia) : raw.municipio_alcaldia != null ? String(raw.municipio_alcaldia) : undefined,
    estado: raw.estado != null ? String(raw.estado) : undefined,
    codigoPostal: raw.codigoPostal != null ? String(raw.codigoPostal) : raw.codigo_postal != null ? String(raw.codigo_postal) : undefined,
    esPrincipal: raw.esPrincipal === true || raw.es_principal === true,
  };
}

async function tryGetArray(endpoint: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await apiClient.get<unknown>(endpoint, { customBase: BASE(), skip500Redirect: true });
    return toArray(res);
  } catch {
    return [];
  }
}

export async function getUsuarioDatosRelacionados(id: string): Promise<UsuarioDatosRelacionados> {
  const [pedidosDirectos, pedidosTodos, notificacionesDirectas, notificacionesTodas, direccionesDirectas] = await Promise.all([
    tryGetArray(`/api/pedidos?usuarioId=${encodeURIComponent(id)}`),
    tryGetArray('/api/pedidos'),
    tryGetArray(`/api/notificaciones?usuarioId=${encodeURIComponent(id)}`),
    tryGetArray('/api/notificaciones'),
    tryGetArray(`/api/direcciones-usuario?usuarioId=${encodeURIComponent(id)}`),
  ]);

  const pedidosBase = pedidosDirectos.length > 0 ? pedidosDirectos : pedidosTodos.filter((p) => {
    const usuarioId = p.usuarioId ?? p.usuario_id;
    return usuarioId != null && String(usuarioId) === id;
  });

  const notificacionesBase = notificacionesDirectas.length > 0 ? notificacionesDirectas : notificacionesTodas.filter((n) => {
    const usuarioId = n.usuarioId ?? n.usuario_id;
    return usuarioId != null && String(usuarioId) === id;
  });

  const direccionesBase = direccionesDirectas;

  return {
    pedidos: pedidosBase.map(normalizarPedidoRelacionado).filter((p) => Number.isFinite(p.id) && p.id > 0),
    notificaciones: notificacionesBase.map(normalizarNotificacionRelacionada).filter((n) => n.id.length > 0),
    direcciones: direccionesBase.map(normalizarDireccionRelacionada).filter((d) => d.id.length > 0),
  };
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
