/**
 * Servicio de usuarios y roles para admin.
 * Endpoints: GET /api/usuarios, GET /api/usuarios/roles, POST /api/usuarios,
 * PUT /api/usuarios/:id, PATCH /api/usuarios/:id/estado, PATCH /api/usuarios/:id/rol
 */

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { validatePassword } from '../utils/security';
import { esTelefonoMexicoValido, mensajeTelefonoInvalido, normalizarTelefonoRegistro, telefonoSinLada } from '../utils/phone';
import type { SlugDocumentoLegal } from '../utils/documentosLegales';

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
  const id = String(raw.id ?? '');
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
export async function getUsuarios(q?: string, incluirInactivos = false): Promise<Usuario[]> {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (incluirInactivos) sp.set('incluirInactivos', 'true');
  const query = sp.toString() ? `?${sp.toString()}` : '';
  const res = await apiClient.get<unknown>(`/api/usuarios${query}`, BASE());
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
      (obj.id != null && obj.email ? (obj as unknown as ApiUsuarioRaw) : null);
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

/** Tipos de cabello que acepta el backend (enum TipoCabello). */
export const TIPOS_CABELLO = [
  { value: 'liso', label: 'Liso' },
  { value: 'ondulado', label: 'Ondulado' },
  { value: 'rizado', label: 'Rizado' },
] as const;

/** Roles que se pueden asignar al editar un usuario: incluye cliente para no mostrar otro rol por defecto. */
const ROLES_EDICION = ['cliente', 'admin', 'estilista', 'empleado', 'becario'] as const;

const OPCIONES_ROL_EDICION_POR_DEFECTO = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'admin', label: 'Administrador' },
  { value: 'estilista', label: 'Estilista' },
  { value: 'empleado', label: 'Empleado' },
  { value: 'becario', label: 'Becado' },
];

/** Opciones del Select de rol en la edición de usuario (catálogo del backend o lista por defecto). */
export function opcionesRolEdicion(roles: RolCatalogoItem[]): Array<{ value: string; label: string }> {
  const filtrados = roles.filter((r) => (ROLES_EDICION as readonly string[]).includes(r.valor));
  if (filtrados.length === 0) return OPCIONES_ROL_EDICION_POR_DEFECTO;
  return filtrados.map((r) => ({ value: r.valor, label: r.nombre === 'Becario' ? 'Becado' : r.nombre }));
}

/** Datos que captura el formulario de alta de usuario del admin. */
export interface DatosAltaUsuario {
  nombre: string;
  email: string;
  password: string;
  telefono: string;
  fechaNacimiento: string;
  pregunta: string;
  respuesta: string;
  tipoCabello: string;
  /** La persona leyó y aceptó los Términos y condiciones (el backend rechaza el alta sin esto). */
  aceptaTerminos: boolean;
  /** La persona leyó y aceptó el aviso de privacidad (el backend rechaza el alta sin esto). */
  aceptaAviso: boolean;
}

export const MENSAJE_FALTA_TERMINOS_ALTA = 'Confirma que la persona leyó y aceptó los Términos y condiciones.';
export const MENSAJE_FALTA_AVISO_ALTA = 'Confirma que la persona leyó y aceptó el aviso de privacidad.';

/** Mensaje de cada casilla legal sin marcar en el alta del admin, para mostrarlo junto a la casilla. */
export function erroresConsentimientoAlta(
  d: Pick<DatosAltaUsuario, 'aceptaTerminos' | 'aceptaAviso'>,
): Partial<Record<'aceptaTerminos' | 'aceptaAviso', string>> {
  return {
    ...(d.aceptaTerminos ? {} : { aceptaTerminos: MENSAJE_FALTA_TERMINOS_ALTA }),
    ...(d.aceptaAviso ? {} : { aceptaAviso: MENSAJE_FALTA_AVISO_ALTA }),
  };
}

export type CampoAlta = 'nombre' | 'email' | 'password' | 'telefono' | 'pregunta' | 'respuesta' | 'tipoCabello';

/**
 * Mensaje de cada campo del alta que falta o no es válido, para marcarlo junto al campo (aria-invalid). Teléfono,
 * nombre, email y contraseña son obligatorios (el backend los exige). Fecha de nacimiento y tipo de cabello son
 * opcionales por minimización (CreateUsuarioDto); si se elige un tipo de cabello, debe ser del backend. La pregunta
 * de seguridad es opcional, pero si se usa van las dos partes. La contraseña sigue la regla del registro.
 */
export function erroresCamposAlta(d: DatosAltaUsuario): Partial<Record<CampoAlta, string>> {
  const errores: Partial<Record<CampoAlta, string>> = {};
  if (!d.nombre.trim()) errores.nombre = 'Escribe el nombre completo.';
  if (!d.email.trim()) errores.email = 'Escribe el email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errores.email = 'Escribe un email válido.';
  if (!d.telefono.trim()) errores.telefono = 'El teléfono es obligatorio.';
  else if (!esTelefonoMexicoValido(d.telefono)) errores.telefono = mensajeTelefonoInvalido();
  if (d.pregunta.trim() && !d.respuesta.trim()) errores.respuesta = 'Escribe la respuesta de la pregunta de seguridad.';
  if (!d.pregunta.trim() && d.respuesta.trim()) errores.pregunta = 'Elige una pregunta de seguridad para esa respuesta.';
  if (d.tipoCabello && !TIPOS_CABELLO.some((t) => t.value === d.tipoCabello)) errores.tipoCabello = 'Elige un tipo de cabello de la lista.';
  if (!d.password) {
    errores.password = 'Escribe la contraseña.';
  } else {
    const v = validatePassword(d.password, {
      nombre: d.nombre.trim(),
      email: d.email.trim().toLowerCase(),
      telefono: normalizarTelefonoRegistro(d.telefono),
      fechaNacimiento: d.fechaNacimiento,
      preguntaSeguridad: { respuesta: d.respuesta.trim() },
    });
    if (!v.valid) errores.password = v.errors?.[0] ?? v.message ?? 'La contraseña no cumple los requisitos.';
  }
  return errores;
}

/**
 * Valida el alta de usuario del admin para el aviso de arriba: el primer problema o null. Cada campo además se
 * marca con erroresCamposAlta. La fecha de nacimiento y el tipo de cabello son opcionales (minimización).
 */
export function validarAltaUsuario(d: DatosAltaUsuario): string | null {
  const campos = erroresCamposAlta(d);
  if (!d.nombre.trim() || !d.email.trim() || !d.password) return 'Nombre, email y contraseña son obligatorios.';
  for (const campo of ['email', 'telefono', 'respuesta', 'pregunta', 'tipoCabello'] as const) {
    if (campos[campo]) return campos[campo];
  }
  const casillas = erroresConsentimientoAlta(d);
  if (casillas.aceptaTerminos) return casillas.aceptaTerminos;
  if (casillas.aceptaAviso) return casillas.aceptaAviso;
  return campos.password ?? null;
}

export interface PerfilCapilarAlta {
  tipoCabello?: string;
  tieneAlergias?: true;
  alergias?: string;
  tratamientosQuimicos?: true;
  tratamientos?: string;
}

/**
 * Perfil capilar del alta con solo lo capturado (minimización): sin tipo de cabello elegido no se manda, las
 * alergias van con "Tiene alergias" marcada y texto, los tratamientos con su casilla. undefined si no hay nada.
 */
export function perfilCapilarAlta(d: {
  tipoCabello: string;
  tieneAlergias: boolean;
  alergias: string;
  tratamientosQuimicos: boolean;
  tratamientos: string;
}): PerfilCapilarAlta | undefined {
  const perfil: PerfilCapilarAlta = {};
  if (d.tipoCabello.trim()) perfil.tipoCabello = d.tipoCabello.trim();
  const alergias = d.tieneAlergias ? d.alergias.trim() : '';
  if (alergias) {
    perfil.tieneAlergias = true;
    perfil.alergias = alergias;
  }
  if (d.tratamientosQuimicos) {
    perfil.tratamientosQuimicos = true;
    if (d.tratamientos.trim()) perfil.tratamientos = d.tratamientos.trim();
  }
  return Object.keys(perfil).length > 0 ? perfil : undefined;
}

/** Contrato del backend: el personal solo puede poner recibePromociones en false (true da 400). */
export const NOTA_PROMOCIONES_PANEL = 'Solo la persona puede activar las promociones, desde su perfil.';

/** recibePromociones al guardar desde el panel: solo se manda si el personal las quitó (true → false), nunca true. */
export function cuerpoPromocionesPanel(guardado: boolean, actual: boolean): { recibePromociones?: false } {
  return guardado && !actual ? { recibePromociones: false } : {};
}

/**
 * Teléfono al editar un usuario desde admin: el backend exige 10 dígitos, así que se manda sin lada
 * ni espacios; vacío se guarda como null y lo que no es un número de México se rechaza aquí.
 */
export function telefonoEdicionUsuario(valor: string): { telefono: string | null } | { error: string } {
  if (!valor.trim()) return { telefono: null };
  if (!esTelefonoMexicoValido(valor)) return { error: mensajeTelefonoInvalido() };
  return { telefono: telefonoSinLada(valor) };
}

/** Payload para crear usuario desde admin. Lo que no se captura no se envía. */
export interface CrearUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  /** No enviar si el backend rechaza "rol" en el POST; asignar rol después con PATCH /api/usuarios/:id/rol */
  rol?: RolValor | string;
  telefono?: string;
  fechaNacimiento?: string;
  preguntaSeguridad?: { pregunta: string; respuesta: string };
  perfilCapilar?: { tipoCabello?: string; tieneAlergias?: boolean; alergias?: string; tratamientosQuimicos?: boolean; tratamientos?: string };
  aceptaTerminos?: boolean;
  aceptaAvisoPrivacidad?: boolean;
  recibePromociones?: boolean;
  /** Versión de cada documento que la persona aceptó (registro DOCUMENTOS_LEGALES). */
  documentos?: { slug: SlugDocumentoLegal; version: string; hash: string }[];
  /** Usuarios creados por admin deben poder iniciar sesión sin verificación de correo */
  confirmado?: boolean;
  /** Obligatorio (true) si perfilCapilar.alergias trae texto. No se guarda. */
  consienteDatosSensibles?: boolean;
}

/**
 * Crear usuario. POST /api/usuarios/registro (admin).
 * Solo se envía lo que el admin capturó: nunca valores inventados (una respuesta de seguridad por
 * defecto permitiría cambiar la contraseña de la cuenta con el endpoint público de recuperación).
 */
export async function createUsuario(payload: CrearUsuarioPayload): Promise<Usuario> {
  const { nombre, email, password, telefono, fechaNacimiento, preguntaSeguridad, perfilCapilar } = payload;

  const body: Record<string, unknown> = {
    nombre,
    email,
    password,
    confirmado: payload.confirmado ?? true, // Usuarios creados por admin pueden iniciar sesión sin verificación
  };
  if (telefono?.trim()) body.telefono = telefono.trim();
  if (fechaNacimiento) {
    body.fechaNacimiento = fechaNacimiento.includes('T') ? fechaNacimiento : `${fechaNacimiento}T00:00:00.000Z`;
  }
  if (preguntaSeguridad?.pregunta.trim() && preguntaSeguridad.respuesta.trim()) {
    body.preguntaSeguridad = { pregunta: preguntaSeguridad.pregunta.trim(), respuesta: preguntaSeguridad.respuesta.trim() };
  }
  // Solo lo capturado: un tipo de cabello vacío o un booleano sin marcar no viajan, y las alergias nunca se descartan.
  const perfil = perfilCapilar
    ? perfilCapilarAlta({
        tipoCabello: perfilCapilar.tipoCabello ?? '',
        tieneAlergias: perfilCapilar.tieneAlergias === true || Boolean(perfilCapilar.alergias?.trim()),
        alergias: perfilCapilar.alergias ?? '',
        tratamientosQuimicos: perfilCapilar.tratamientosQuimicos === true,
        tratamientos: perfilCapilar.tratamientos ?? '',
      })
    : undefined;
  if (perfil) body.perfilCapilar = perfil;
  if (payload.aceptaTerminos !== undefined) body.aceptaTerminos = payload.aceptaTerminos;
  if (payload.aceptaAvisoPrivacidad !== undefined) body.aceptaAvisoPrivacidad = payload.aceptaAvisoPrivacidad;
  if (payload.documentos?.length) body.documentos = payload.documentos;
  if (payload.recibePromociones !== undefined) body.recibePromociones = payload.recibePromociones;
  if (payload.consienteDatosSensibles !== undefined) body.consienteDatosSensibles = payload.consienteDatosSensibles;
  // No enviar dirección embebida: DireccionUsuario se gestiona aparte tras crear el usuario.
  // No enviar "rol" si el backend lo rechaza en el POST; asignar rol después con PATCH /api/usuarios/:id/rol

  const res = await apiClient.post<Record<string, unknown>>(
    '/api/usuarios/registro',
    body,
    BASE()
  );
  const obj = res && typeof res === 'object' ? res as Record<string, unknown> : null;
  if (!obj) throw new Error('El API no devolvió el usuario creado');

  const data =
    (obj.data && typeof obj.data === 'object' ? obj.data as ApiUsuarioRaw : null) ??
    (obj.user && typeof obj.user === 'object' ? obj.user as ApiUsuarioRaw : null) ??
    (obj.usuario && typeof obj.usuario === 'object' ? obj.usuario as ApiUsuarioRaw : null) ??
    (obj.id != null && obj.email ? (obj as unknown as ApiUsuarioRaw) : null);

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
  fechaNacimiento?: string | null;
  foto?: string | null;
  recibePromociones?: boolean;
  tipoCabello?: string | null;
  colorNatural?: string | null;
  colorActual?: string | null;
  productosUsados?: string | null;
  alergias?: string | null;
  /** Obligatorio (true) si las alergias cambian a un texto nuevo: el personal confirma que la persona aceptó. No se guarda. */
  consienteDatosSensibles?: boolean;
  /** Pantalla desde la que se editó (evidencia de consentimientos). Opcional, máximo 300; sin él el backend guarda /admin/usuarios-roles. */
  rutaOrigen?: string;
}

/** Límite de rutaOrigen en PUT /usuarios/:id y /usuarios/:id/perfil. */
export const MAX_RUTA_ORIGEN_EDICION = 300;

/** rutaOrigen de una edición del panel, recortada al límite del backend. */
export function rutaOrigenEdicion(ruta: string): string {
  return ruta.slice(0, MAX_RUTA_ORIGEN_EDICION);
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
    id: String(raw.id ?? ''),
    calle: raw.calle != null ? String(raw.calle) : undefined,
    coloniaBarrio: raw.coloniaBarrio != null ? String(raw.coloniaBarrio) : raw.colonia_barrio != null ? String(raw.colonia_barrio) : undefined,
    municipioAlcaldia: raw.municipioAlcaldia != null ? String(raw.municipioAlcaldia) : raw.municipio_alcaldia != null ? String(raw.municipio_alcaldia) : undefined,
    estado: raw.estado != null ? String(raw.estado) : undefined,
    codigoPostal: raw.codigoPostal != null ? String(raw.codigoPostal) : raw.codigo_postal != null ? String(raw.codigo_postal) : undefined,
    esPrincipal: raw.esPrincipal === true || raw.es_principal === true,
  };
}

/**
 * Llamada secundaria tolerante a fallos: su resultado alimenta widgets opcionales
 * de la ficha de cliente, así que un error (403 incluido) nunca debe expulsar al
 * usuario de la pantalla completa — solo degradar a un arreglo vacío.
 */
async function tryGetArray(endpoint: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await apiClient.get<unknown>(endpoint, {
      customBase: BASE(),
      skip500Redirect: true,
      skip403Redirect: true,
    });
    return toArray(res);
  } catch {
    return [];
  }
}

/**
 * Datos secundarios de la ficha de cliente: notificaciones y direcciones. Los pedidos no se piden aquí
 * (/api/pedidos exige caja:lectura y da 403 a otros roles): las fichas usan el historial de compras
 * del cliente. `pedidos` se conserva vacío por compatibilidad con quien lea el tipo.
 */
export async function getUsuarioDatosRelacionados(id: string): Promise<UsuarioDatosRelacionados> {
  const [notificacionesDirectas, notificacionesTodas, direccionesDirectas] = await Promise.all([
    tryGetArray(`/api/notificaciones?usuarioId=${encodeURIComponent(id)}`),
    tryGetArray('/api/notificaciones'),
    tryGetArray(`/api/direcciones-usuario?usuarioId=${encodeURIComponent(id)}`),
  ]);

  const notificacionesBase = notificacionesDirectas.length > 0 ? notificacionesDirectas : notificacionesTodas.filter((n) => {
    const usuarioId = n.usuarioId ?? n.usuario_id;
    return usuarioId != null && String(usuarioId) === id;
  });

  const direccionesBase = direccionesDirectas;

  return {
    pedidos: [],
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
