// Servicio de servicios para home y listados + CRUD admin
// Usa GET del backend (NEXT_PUBLIC_API_URL + /api/servicios)

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

/** Especialista asignado a un servicio (desde Prisma `ServicioEspecialista`). */
export interface ServicioEspecialistaUI {
  id: string | number;
  usuarioId: string;
  nombre?: string;
  rol?: string;
  avatarUrl?: string;
}

/** Producto asociado a un servicio (desde Prisma `ServicioProducto`). */
export interface ServicioProductoAsociadoUI {
  id: string | number;
  productoId: string | number;
  cantidadEstimada?: number;
  productoNombre?: string;
  productoMarca?: string;
  productoCategoria?: string;
}

/** Servicio alineado con el modelo Prisma (servicios). */
export interface Servicio {
  id: string | number;
  nombre: string;
  descripcion?: string;
  descripcionLarga?: string;
  /** Duración formateada para mostrar (ej. "45 min"). */
  duracion?: string;
  /** Duración en minutos, alineada con Prisma `duracionMinutos`. */
  duracionMinutos?: number;
  precio?: string;
  categoria?: string;
  /** Indica si el servicio requiere evaluación previa (Prisma `requiereEvaluacion`). */
  requiereEvaluacion?: boolean;
  imagen?: string;
  /** URLs de imágenes (desde Prisma: imagen Json, puede ser [] o ["url", ...]). */
  imagenes?: string[];
  /** Qué incluye el servicio (desde Prisma: incluye Json []). */
  incluye?: string[];
  /** Recomendaciones (desde Prisma: recomendaciones Json []). */
  recomendaciones?: string[];
  /** Especialistas que realizan este servicio (si el backend los incluye). */
  especialistas?: ServicioEspecialistaUI[];
  /** Productos asociados al servicio (si el backend los incluye). */
  productosAsociados?: ServicioProductoAsociadoUI[];
}

type ApiServicioRaw = Record<string, unknown> & {
  id?: string | number;
  _id?: string;
  nombre?: string;
  descripcion?: string;
  descripcion_larga?: string;
  descripcionLarga?: string;
  duracion?: string | number;
  duracion_minutos?: number;
  duracionMinutos?: number;
  precio?: number | string;
  categoria?: string;
  requiere_evaluacion?: boolean;
  requiereEvaluacion?: boolean;
  // Relaciones opcionales que el backend puede incluir
  especialistas?: (Record<string, unknown>)[];
  servicio_especialistas?: (Record<string, unknown>)[];
  productosAsociados?: (Record<string, unknown>)[];
  servicio_productos?: (Record<string, unknown>)[];
  /** Prisma: imagen Json @default("[]") → puede ser [] | string[] | objeto[] */
  imagen?: string | (string | Record<string, unknown>)[];
  imagenes?: (string | Record<string, unknown>)[];
  incluye?: (string | Record<string, unknown>)[];
  recomendaciones?: (string | Record<string, unknown>)[];
};

/** Extrae una URL en string desde un valor que puede ser string o objeto (ej. Cloudinary). */
function extraerUrlImagen(val: string | Record<string, unknown> | null | undefined): string | undefined {
  if (val == null) return undefined;
  if (typeof val === 'string') return val.trim() || undefined;
  if (typeof val === 'object' && val !== null) {
    const o = val as Record<string, unknown>;
    const url = (o.secure_url ?? o.url ?? o.src) as string | undefined;
    return typeof url === 'string' && url.trim() ? url : undefined;
  }
  return undefined;
}

/** Convierte un valor a string para listas incluye/recomendaciones. */
function aString(val: string | Record<string, unknown> | null | undefined): string | undefined {
  if (val == null) return undefined;
  if (typeof val === 'string') return val.trim() || undefined;
  if (typeof val === 'object' && val !== null && typeof (val as Record<string, unknown>).texto === 'string') {
    return (val as Record<string, unknown>).texto as string;
  }
  return undefined;
}

function normalizarServicio(raw: ApiServicioRaw): Servicio {
  const id = raw.id ?? raw._id ?? '';
  const duracionMin = raw.duracion_minutos ?? raw.duracionMinutos;
  const duracion = raw.duracion != null
    ? String(raw.duracion)
    : duracionMin != null
    ? `${duracionMin} min`
    : undefined;
  const precio = raw.precio != null
    ? typeof raw.precio === 'number' ? `$${Number(raw.precio)}` : String(raw.precio)
    : undefined;

  // Prisma: imagen es Json (array o string); también aceptar raw.imagenes
  let imagenesArr: string[] = [];
  if (Array.isArray(raw.imagen)) {
    imagenesArr = raw.imagen.map((item) => extraerUrlImagen(item)).filter((u): u is string => !!u);
  } else if (raw.imagen != null && typeof raw.imagen === 'string') {
    const u = extraerUrlImagen(raw.imagen);
    if (u) imagenesArr = [u];
  } else if (raw.imagen != null && typeof raw.imagen === 'object') {
    const u = extraerUrlImagen(raw.imagen as Record<string, unknown>);
    if (u) imagenesArr = [u];
  }
  if (Array.isArray(raw.imagenes) && imagenesArr.length === 0) {
    imagenesArr = raw.imagenes.map((item) => extraerUrlImagen(item)).filter((u): u is string => !!u);
  }
  const imagenes = imagenesArr.length ? imagenesArr : undefined;
  const imagen = imagenes?.[0];

  const incluye = Array.isArray(raw.incluye)
    ? raw.incluye.map((x) => aString(x)).filter((u): u is string => !!u)
    : undefined;
  const recomendaciones = Array.isArray(raw.recomendaciones)
    ? raw.recomendaciones.map((x) => aString(x)).filter((u): u is string => !!u)
    : undefined;
  const descripcionLarga = raw.descripcion_larga ?? raw.descripcionLarga;
  const descripcionLargaStr = descripcionLarga != null ? String(descripcionLarga) : undefined;

  const requiereEvaluacionRaw = raw.requiere_evaluacion ?? raw.requiereEvaluacion;
  const requiereEvaluacion =
    typeof requiereEvaluacionRaw === 'boolean' ? requiereEvaluacionRaw : undefined;

  // Relaciones: especialistas
  const especialistasRaw =
    (Array.isArray(raw.especialistas) && raw.especialistas) ||
    (Array.isArray(raw.servicio_especialistas) && raw.servicio_especialistas) ||
    undefined;

  const especialistas =
    especialistasRaw?.map((item) => {
      const obj = item as Record<string, unknown>;
      const id = (obj.id ?? obj._id ?? obj.usuarioId ?? obj.usuario_id) as string | number | undefined;
      const usuarioId = (obj.usuarioId ?? obj.usuario_id) as string | undefined;
      const usuario = (obj.usuario ?? {}) as Record<string, unknown>;
      const nombre =
        (usuario.nombre as string | undefined) ??
        (usuario.name as string | undefined) ??
        (usuario.fullName as string | undefined);
      const rol = (usuario.rol as string | undefined) ?? (usuario.role as string | undefined);
      const avatarUrl =
        (usuario.avatarUrl as string | undefined) ??
        (usuario.foto as string | undefined) ??
        (usuario.imagen as string | undefined);
      if (!id || !usuarioId) return undefined;
      return {
        id,
        usuarioId,
        nombre,
        rol,
        avatarUrl,
      };
    }).filter((e) => e != null) as ServicioEspecialistaUI[] | undefined;

  // Relaciones: productos asociados
  const productosRaw =
    (Array.isArray(raw.productosAsociados) && raw.productosAsociados) ||
    (Array.isArray(raw.servicio_productos) && raw.servicio_productos) ||
    undefined;

  const productosAsociados =
    productosRaw?.map((item) => {
      const obj = item as Record<string, unknown>;
      const id = (obj.id ?? obj._id) as string | number | undefined;
      const productoId = (obj.productoId ?? obj.producto_id) as string | number | undefined;
      const cantidadRaw = obj.cantidadEstimada ?? obj.cantidad_estimada;
      const cantidadEstimada =
        typeof cantidadRaw === 'number'
          ? cantidadRaw
          : typeof cantidadRaw === 'string'
          ? parseFloat(cantidadRaw) || undefined
          : undefined;
      const producto = (obj.producto ?? {}) as Record<string, unknown>;
      const productoNombre = producto.nombre as string | undefined;
      const productoMarca = producto.marca as string | undefined;
      const productoCategoria = producto.categoria as string | undefined;
      if (!id || productoId == null) return undefined;
      return {
        id,
        productoId,
        cantidadEstimada,
        productoNombre,
        productoMarca,
        productoCategoria,
      };
    }).filter((p) => p != null) as ServicioProductoAsociadoUI[] | undefined;

  return {
    id,
    nombre: String(raw.nombre ?? ''),
    descripcion: raw.descripcion != null ? String(raw.descripcion) : undefined,
    descripcionLarga: descripcionLargaStr?.trim() || undefined,
    duracion,
    duracionMinutos: typeof duracionMin === 'number' ? duracionMin : undefined,
    precio,
    categoria: raw.categoria != null ? String(raw.categoria) : undefined,
    requiereEvaluacion,
    imagen,
    imagenes,
    incluye: incluye?.length ? incluye : undefined,
    recomendaciones: recomendaciones?.length ? recomendaciones : undefined,
    especialistas,
    productosAsociados,
  };
}

export type ServiciosResult = { data: Servicio[]; error: null } | { data: Servicio[]; error: string };

/**
 * Obtiene el listado de servicios sin redirigir en 401/500.
 * Usa GET {NEXT_PUBLIC_API_URL}/api/servicios (ej. http://localhost:3001/api/servicios).
 * Acepta respuesta en formato array o { data: [] } / { servicios: [] }.
 */
export async function getServicios(): Promise<ServiciosResult> {
  try {
    const base = getBackendBaseUrl();
    const res = await fetch(`${base}/api/servicios`, { credentials: 'include' });
    if (!res.ok) {
      const text = await res.text();
      let msg = `Error ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = j.message ?? j.error ?? msg;
      } catch {
        if (text) msg = text.slice(0, 120);
      }
      return { data: [], error: msg };
    }
    const response = await res.json();
    let list: ApiServicioRaw[] = [];
    if (Array.isArray(response)) {
      list = response as ApiServicioRaw[];
    } else if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      if (Array.isArray(obj.data)) list = obj.data as ApiServicioRaw[];
      else if (Array.isArray(obj.servicios)) list = obj.servicios as ApiServicioRaw[];
      else if (Array.isArray(obj.servicio)) list = obj.servicio as ApiServicioRaw[];
    }
    return { data: list.map(normalizarServicio), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar con el servidor';
    return { data: [], error: msg };
  }
}

/** Payload para crear/actualizar servicio (admin). Alineado con Prisma Servicio. */
export interface ServicioPayload {
  nombre: string;
  descripcion?: string;
  descripcionLarga?: string;
  duracion?: string | number;
  duracion_minutos?: number;
  duracionMinutos?: number;
  precio?: number | string;
  categoria?: string;
  imagen?: string | string[];
  imagenes?: string[];
  incluye?: string[];
  recomendaciones?: string[];
}

/**
 * Obtiene un servicio por id. Usa apiClient (requiere auth).
 */
export async function getServicioPorId(id: string | number): Promise<Servicio | null> {
  const base = getBackendBaseUrl();
  try {
    const res = await apiClient.get<unknown>(`/api/servicios/${id}`, base);
    const obj = res as Record<string, unknown>;
    const data = (obj?.data ?? obj) as ApiServicioRaw;
    if (data && typeof data === 'object') return normalizarServicio(data);
    return null;
  } catch {
    return null;
  }
}

/**
 * Crea un servicio. Requiere JWT y rol admin.
 */
export async function createServicio(payload: ServicioPayload): Promise<Servicio> {
  const base = getBackendBaseUrl();
  const res = await apiClient.post<{ data?: ApiServicioRaw; success?: boolean }>(
    '/api/servicios',
    payload,
    base
  );
  const obj = res as Record<string, unknown>;
  const data = (obj?.data ?? obj) as ApiServicioRaw;
  if (data && typeof data === 'object') return normalizarServicio(data);
  throw new Error('El API no devolvió el servicio creado');
}

/**
 * Actualiza un servicio. Requiere JWT y rol admin.
 */
export async function updateServicio(id: string | number, payload: ServicioPayload): Promise<Servicio> {
  const base = getBackendBaseUrl();
  const res = await apiClient.put<{ data?: ApiServicioRaw; success?: boolean }>(
    `/api/servicios/${id}`,
    payload,
    base
  );
  const obj = res as Record<string, unknown>;
  const data = (obj?.data ?? obj) as ApiServicioRaw;
  if (data && typeof data === 'object') return normalizarServicio(data);
  throw new Error('El API no devolvió el servicio actualizado');
}

/**
 * Elimina un servicio. Requiere JWT y rol admin.
 */
export async function deleteServicio(id: string | number): Promise<void> {
  const base = getBackendBaseUrl();
  await apiClient.delete(`/api/servicios/${id}`, base);
}
