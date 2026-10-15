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
  /** Claves de `permisos_rol` para el rol del usuario (ANY match; `'*'` = admin, pasa todo). */
  permisos?: string[];
  foto?: string | null;
  tipoCabello?: TipoCabelloValor | null;
  colorNatural?: string | null;
  colorActual?: string | null;
  productosUsados?: string | null;
  alergias?: string | null;
  aceptaAvisoPrivacidad?: boolean;
  recibePromociones?: boolean;
  /** Correo confirmado (código o Google); GET /auth/me lo manda como `confirmado`. */
  confirmado?: boolean;
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
    permisos: Array.isArray(raw.permisos) ? raw.permisos.map(String) : undefined,
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
    confirmado: pickBool(raw, 'confirmado'),
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
  /** Obligatorio (true) si alergias trae texto. No se guarda en la base. */
  consienteDatosSensibles?: boolean;
  recibePromociones?: boolean;
}

/**
 * Claves permitidas en PATCH `/api/auth/me` según el DTO del backend (ValidationPipe whitelist).
 * El perfil capilar va como campos directos (el DTO acepta null para borrarlos) y las alergias con su consentimiento.
 */
function cuerpoPatchAuthMe(payload: ActualizarMiPerfilPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.nombre !== undefined) body.nombre = payload.nombre;
  if (payload.telefono !== undefined) body.telefono = payload.telefono;
  if (payload.foto !== undefined) body.foto = payload.foto;
  if (payload.recibePromociones !== undefined) body.recibePromociones = payload.recibePromociones;
  if (payload.tipoCabello !== undefined) body.tipoCabello = payload.tipoCabello;
  if (payload.colorNatural !== undefined) body.colorNatural = payload.colorNatural;
  if (payload.colorActual !== undefined) body.colorActual = payload.colorActual;
  if (payload.productosUsados !== undefined) body.productosUsados = payload.productosUsados;
  // Alergias (dato de salud): viajan con el consentimiento expreso; el backend rechaza (400) alergias sin él.
  if (payload.alergias !== undefined) body.alergias = payload.alergias;
  if (payload.consienteDatosSensibles !== undefined) body.consienteDatosSensibles = payload.consienteDatosSensibles;
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

// ===== Cambio de correo (POST /api/auth/me/correo/solicitar y /confirmar) =====

const MENSAJE_CORREO_NO_ENVIADO =
  'No pudimos enviar el código a tu nuevo correo. Revisa que esté bien escrito o intenta de nuevo en unos minutos.';

/** Mismas reglas que el backend: formato válido y distinto al actual. null si está bien. */
export function validarCorreoNuevo(correo: string, correoActual?: string): string | null {
  const limpio = correo.trim().toLowerCase();
  if (!limpio) return 'Escribe tu correo nuevo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return 'Escribe un correo válido.';
  if (correoActual && limpio === correoActual.trim().toLowerCase()) {
    return 'El correo nuevo es igual al actual. Escribe uno distinto.';
  }
  return null;
}

/** El código que llega al correo nuevo: 6 dígitos. null si está bien. */
export function validarCodigoCambioCorreo(codigo: string): string | null {
  return /^\d{6}$/.test(codigo.trim()) ? null : 'El código tiene 6 dígitos.';
}

export const MENSAJE_FALTA_PASSWORD_CAMBIO_CORREO = 'Escribe tu contraseña actual para cambiar tu correo.';

/**
 * Campo "Contraseña actual" del cambio de correo según la cuenta (tienePassword de GET /auth/me): obligatorio con
 * contraseña, oculto en una cuenta solo de Google y, si no se pudo saber, visible con la ayuda para Google.
 */
export function campoPasswordCambioCorreo(tienePassword: boolean | null | undefined): {
  visible: boolean;
  obligatorio: boolean;
  ayuda: string | null;
} {
  if (tienePassword === true) return { visible: true, obligatorio: true, ayuda: null };
  if (tienePassword === false) return { visible: false, obligatorio: false, ayuda: null };
  return { visible: true, obligatorio: false, ayuda: 'Si entras solo con Google, déjala vacía.' };
}

/** Con contraseña en la cuenta no se envía vacía (mismo texto que el 400 del backend). null si se puede enviar. */
export function validarPasswordActualCambioCorreo(passwordActual: string, tienePassword: boolean | null | undefined): string | null {
  return tienePassword === true && !passwordActual.trim() ? MENSAJE_FALTA_PASSWORD_CAMBIO_CORREO : null;
}

/** Códigos del backend cuando falta o no coincide la contraseña actual (cambio de correo y pregunta de seguridad). */
export const CODIGOS_PASSWORD_ACTUAL = ['PASSWORD_ACTUAL_REQUERIDA', 'PASSWORD_ACTUAL_INCORRECTA'] as const;

/** `code` de un error del cliente (en el error o en su cuerpo `data`), o null. */
export function codigoDeErrorApi(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const { code, data } = error as { code?: unknown; data?: { code?: unknown } | null };
  const valor = typeof code === 'string' ? code : data?.code;
  return typeof valor === 'string' && valor ? valor : null;
}

/**
 * Junto a qué campo va un error del backend: por su code (PASSWORD_ACTUAL_REQUERIDA o _INCORRECTA) o, sin code,
 * por el texto; los de la contraseña junto a ella y el resto junto al correo.
 */
export function campoDelErrorCambioCorreo(error: unknown): 'password' | 'correo' {
  const codigo = codigoDeErrorApi(error);
  if (codigo) return (CODIGOS_PASSWORD_ACTUAL as readonly string[]).includes(codigo) ? 'password' : 'correo';
  const mensaje = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  return /contraseña/i.test(mensaje) ? 'password' : 'correo';
}

/**
 * Paso 1: envía un código de 6 dígitos al correo nuevo. `passwordActual` es obligatoria si la cuenta tiene
 * contraseña (el backend responde 400 si falta o no es correcta); una cuenta solo de Google no la manda.
 */
export async function solicitarCambioCorreo(
  correoNuevo: string,
  correoActual?: string,
  passwordActual?: string,
): Promise<{ mensaje: string; vigenciaMinutos: number }> {
  const error = validarCorreoNuevo(correoNuevo, correoActual);
  if (error) throw new Error(error);
  try {
    const res = await apiClient.post<{ message?: string; vigenciaMinutos?: number }>(
      '/api/auth/me/correo/solicitar',
      passwordActual ? { correoNuevo: correoNuevo.trim(), passwordActual } : { correoNuevo: correoNuevo.trim() },
      { customBase: BASE(), skip500Redirect: true },
    );
    return {
      mensaje: res?.message || 'Te enviamos un código a tu nuevo correo.',
      vigenciaMinutos: Number(res?.vigenciaMinutos ?? 15),
    };
  } catch (e) {
    // El cliente muestra un texto genérico ante cualquier 5xx: el 502 es "el correo no salió".
    if ((e as { status?: number })?.status === 502) throw new Error(MENSAJE_CORREO_NO_ENVIADO);
    throw e;
  }
}

/** Paso 2: confirma con el código y devuelve el correo nuevo de la cuenta. */
export async function confirmarCambioCorreo(codigo: string): Promise<string> {
  const error = validarCodigoCambioCorreo(codigo);
  if (error) throw new Error(error);
  const res = await apiClient.post<{ data?: { email?: string } }>(
    '/api/auth/me/correo/confirmar',
    { codigo: codigo.trim() },
    { customBase: BASE(), skip500Redirect: true },
  );
  const email = res?.data?.email;
  if (!email) throw new Error('No pudimos confirmar tu correo nuevo. Recarga la página.');
  return email;
}
