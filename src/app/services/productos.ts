// Servicio de productos para tienda-online
// Usa GET {NEXT_PUBLIC_API_URL}/api/productos (getBackendBaseUrl + /api/productos)

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { normalizarUrlImagenExterna } from '../utils/normalizarUrlImagen';

/** Producto normalizado para la UI (catálogo y detalle) */
export interface Producto {
  id: string | number;
  nombre: string;
  descripcion: string;
  precio: string;
  precioOriginal?: string | null;
  descuento?: number;
  categoria: string;
  marca?: string;
  presentacion?: string;
  /** Una sola URL (compatibilidad). Usar imagenes[0] si existe. */
  imagen?: string;
  /** URLs de imágenes (Cloudinary). En listado/detalle usar imagenes[0] o imagen. */
  imagenes?: string[];
  stock: boolean;
  nuevo?: boolean;
  crueltyFree?: boolean;
  /** Para detalle: descripción larga */
  descripcionLarga?: string;
  /** Total stock (suma de presentaciones). Solo presentaciones tienen stock en BD. */
  stockCantidad?: number;
  /** Para detalle: presentaciones/variedades (cada una tiene stock y disponible) */
  presentaciones?: Array<{
    /** `producto_presentaciones.id` en BD */
    id?: number;
    tamaño: string;
    precio: string;
    precioOriginal?: string;
    stock: number;
    disponible: boolean;
    /** fecha_caducidad TIMESTAMP(3) - ISO string o null */
    fechaCaducidad?: string | null;
    /** URLs en `producto_presentaciones.imagenes` (no en tabla productos). */
    imagen?: string;
    imagenes?: string[];
  }>;
  caracteristicas?: string[];
  ingredientes?: string;
  /** Modo de uso (Prisma: modo_uso). */
  modoUso?: string;
  /** Resultado esperado. */
  resultado?: string;
}

/**
 * URLs únicas para galería en catálogo: imágenes del producto + todas las presentaciones.
 */
export function urlsGaleriaProductoCatalogo(p: Producto): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (u: string | undefined) => {
    const s = String(u ?? '').trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };
  (p.imagenes ?? []).forEach(push);
  push(p.imagen);
  for (const pr of p.presentaciones ?? []) {
    (pr.imagenes ?? []).forEach(push);
    push(pr.imagen);
  }
  return out;
}

/**
 * Galería en ficha: prioriza imágenes de la presentación seleccionada; si no tiene, usa el conjunto del catálogo.
 */
export function urlsGaleriaProductoDetalle(p: Producto, tamanoPresentacion: string): string[] {
  const pres = p.presentaciones?.find((x) => x.tamaño === tamanoPresentacion);
  if (pres) {
    if (pres.imagenes?.length) {
      const u = pres.imagenes.map((x) => String(x).trim()).filter(Boolean);
      if (u.length) return u;
    }
    if (pres.imagen?.trim()) return [pres.imagen.trim()];
  }
  return urlsGaleriaProductoCatalogo(p);
}

/** Respuesta posible del API (array directo o objeto con data/productos) */
type ApiProductoRaw = Record<string, unknown> & {
  id?: string | number;
  _id?: string;
  nombre?: string;
  descripcion?: string;
  precio?: number | string;
  precioOriginal?: number | string | null;
  descuento?: number;
  categoria?: string;
  marca?: string;
  presentacion?: string;
  imagen?: string | Record<string, unknown>;
  imagenes?: (string | Record<string, unknown>)[];
  stock?: number | boolean;
  disponible?: boolean;
  nuevo?: boolean;
  crueltyFree?: boolean;
  descripcionLarga?: string;
  caracteristicas?: string[];
  ingredientes?: string;
  modo_uso?: string;
  modoUso?: string;
  resultado?: string;
  presentaciones?: Array<Record<string, unknown>>;
};

/** Extrae URL en string desde string o objeto (ej. Cloudinary). Decodifica entidades HTML que rompen next/image. */
function extraerUrlImagen(val: string | Record<string, unknown> | null | undefined): string | undefined {
  if (val == null) return undefined;
  if (typeof val === 'string') {
    const n = normalizarUrlImagenExterna(val);
    return n || undefined;
  }
  if (typeof val === 'object' && val !== null) {
    const o = val as Record<string, unknown>;
    const url = (o.secure_url ?? o.url ?? o.src) as string | undefined;
    if (typeof url !== 'string' || !url.trim()) return undefined;
    return normalizarUrlImagenExterna(url) || undefined;
  }
  return undefined;
}

function normalizarPrecio(value: number | string | undefined): string {
  if (value === undefined || value === null) return '$0';
  if (typeof value === 'number') return `$${value}`;
  if (typeof value === 'string' && value.trim() !== '') return value.startsWith('$') ? value : `$${value}`;
  return '$0';
}

function normalizarProducto(raw: ApiProductoRaw): Producto {
  const id = raw.id ?? raw._id ?? '';
  const presentacionesRaw = Array.isArray(raw.presentaciones) ? raw.presentaciones : undefined;
  const presentacionesNormalizadas = Array.isArray(raw.presentaciones)
    ? raw.presentaciones.map((p: Record<string, unknown>) => {
        const fechaRaw = p.fecha_caducidad ?? p.fechaCaducidad;
        const fechaCaducidad =
          fechaRaw != null && typeof fechaRaw === 'string' ? fechaRaw : null;
        const presIdRaw = p.id ?? p.presentacion_id ?? p.presentacionId;
        const presId =
          presIdRaw != null && Number.isFinite(Number(presIdRaw)) && Number(presIdRaw) > 0
            ? Number(presIdRaw)
            : undefined;
        const presImgsRaw = p.imagenes;
        const presImagenesArr = Array.isArray(presImgsRaw)
          ? presImgsRaw.map((item) => extraerUrlImagen(item as string | Record<string, unknown>)).filter((u): u is string => !!u)
          : [];
        const presFirstImg = extraerUrlImagen(p.imagen as string | Record<string, unknown> | undefined);
        const presImagenes = presImagenesArr.length ? presImagenesArr : presFirstImg ? [presFirstImg] : undefined;
        const presImagen = presImagenes?.[0] ?? presFirstImg;
        return {
          id: presId,
          tamaño: String(p.tamaño ?? p.tamanio ?? ''),
          precio: normalizarPrecio(p.precio as string | number | undefined),
          precioOriginal: p.precioOriginal != null ? normalizarPrecio(p.precioOriginal as string | number) : undefined,
          stock: Number(p.stock ?? 0),
          disponible: Boolean(p.disponible ?? (Number(p.stock ?? 0) > 0)),
          fechaCaducidad: fechaCaducidad ?? undefined,
          imagenes: presImagenes,
          imagen: presImagen,
        };
      })
    : undefined;
  const totalStockPresentaciones = presentacionesNormalizadas?.reduce((sum, p) => sum + p.stock, 0) ?? 0;
  const algunaPresentacionDisponible = presentacionesNormalizadas?.some(
    (p) => p.stock > 0 && p.disponible
  ) ?? false;
  // Disponible y stock se derivan solo de productos_presentacion: sin presentaciones = no disponible
  const disponible = presentacionesRaw?.length ? algunaPresentacionDisponible : false;

  const precioNumFromRaw = typeof raw.precio === 'number' ? raw.precio : parseFloat(String(raw.precio || 0)) || 0;
  const precioOriginalFromRaw = raw.precioOriginal != null
    ? (typeof raw.precioOriginal === 'number' ? raw.precioOriginal : parseFloat(String(raw.precioOriginal)) || 0)
    : undefined;
  const preciosDesdePresentaciones = presentacionesNormalizadas?.length
    ? (() => {
        const nums = presentacionesNormalizadas.map((pr) => parseFloat(String(pr.precio).replace(/[^0-9.]/g, '')) || 0);
        const origs = presentacionesNormalizadas
          .map((pr) => (pr.precioOriginal ? parseFloat(String(pr.precioOriginal).replace(/[^0-9.]/g, '')) || 0 : 0))
          .filter((n) => n > 0);
        const minPrecio = Math.min(...nums);
        const maxOrig = origs.length ? Math.max(...origs) : undefined;
        const desc = maxOrig && maxOrig > minPrecio ? Math.round(((maxOrig - minPrecio) / maxOrig) * 100) : 0;
        return { precio: minPrecio, precioOriginal: maxOrig ?? undefined, descuento: desc };
      })()
    : null;
  const precioNum = preciosDesdePresentaciones?.precio ?? precioNumFromRaw;
  const precioOriginalNum = preciosDesdePresentaciones?.precioOriginal ?? precioOriginalFromRaw;
  const descuento = raw.descuento ?? (preciosDesdePresentaciones?.descuento) ?? (precioOriginalNum && precioOriginalNum > precioNum
    ? Math.round(((precioOriginalNum - precioNum) / precioOriginalNum) * 100)
    : 0);

  const firstFromImagen = extraerUrlImagen(raw.imagen as string | Record<string, unknown> | undefined);
  const imagenesArrProducto = Array.isArray(raw.imagenes)
    ? raw.imagenes.map((item) => extraerUrlImagen(item)).filter((u): u is string => !!u)
    : firstFromImagen ? [firstFromImagen] : undefined;
  const desdePresentaciones = (() => {
    for (const pr of presentacionesNormalizadas ?? []) {
      if (pr.imagenes?.length) return { imagenes: pr.imagenes, imagen: pr.imagenes[0] };
      if (pr.imagen) return { imagenes: [pr.imagen] as string[], imagen: pr.imagen };
    }
    return { imagenes: undefined as string[] | undefined, imagen: undefined as string | undefined };
  })();
  const imagenes =
    imagenesArrProducto?.length ? imagenesArrProducto : desdePresentaciones.imagenes;
  const imagen = imagenes?.[0] ?? firstFromImagen ?? desdePresentaciones.imagen;

  return {
    id,
    nombre: String(raw.nombre ?? ''),
    descripcion: String(raw.descripcion ?? ''),
    precio: normalizarPrecio(preciosDesdePresentaciones?.precio ?? raw.precio),
    precioOriginal: precioOriginalNum != null && precioOriginalNum > 0 ? normalizarPrecio(precioOriginalNum) : null,
    descuento: Number(descuento) || 0,
    categoria: String(raw.categoria ?? ''),
    marca: raw.marca != null ? String(raw.marca) : undefined,
    presentacion: raw.presentacion != null ? String(raw.presentacion) : undefined,
    imagen,
    imagenes,
    stock: disponible,
    nuevo: Boolean(raw.nuevo),
    crueltyFree: Boolean(raw.crueltyFree ?? (raw as Record<string, unknown>).cruelty_free),
    descripcionLarga:
      raw.descripcionLarga != null
        ? String(raw.descripcionLarga)
        : (raw as Record<string, unknown>).descripcion_larga != null
          ? String((raw as Record<string, unknown>).descripcion_larga)
          : undefined,
    stockCantidad: presentacionesRaw?.length ? totalStockPresentaciones : undefined,
    presentaciones: presentacionesNormalizadas,
    caracteristicas: Array.isArray(raw.caracteristicas) ? raw.caracteristicas.map(String) : undefined,
    ingredientes: raw.ingredientes != null ? String(raw.ingredientes) : undefined,
    modoUso: raw.modo_uso != null ? String(raw.modo_uso) : raw.modoUso != null ? String(raw.modoUso) : undefined,
    resultado: raw.resultado != null ? String(raw.resultado) : undefined,
  };
}

/**
 * Obtiene el listado de productos desde GET /api/productos.
 * Acepta respuesta en formato array o { data: [] } / { productos: [] }.
 */
export async function getProductos(): Promise<Producto[]> {
  const BACKEND_BASE = getBackendBaseUrl();
  const response = await apiClient.get<unknown>('/api/productos', BACKEND_BASE);

  let list: ApiProductoRaw[] = [];
  if (Array.isArray(response)) {
    list = response as ApiProductoRaw[];
  } else if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    if (Array.isArray(obj.data)) list = obj.data as ApiProductoRaw[];
    else if (Array.isArray(obj.productos)) list = obj.productos as ApiProductoRaw[];
    else if (Array.isArray(obj.producto)) list = obj.producto as ApiProductoRaw[];
  }

  return list.map(normalizarProducto);
}

export type ProductosResult = { data: Producto[]; error: null } | { data: Producto[]; error: string };

/**
 * Opciones para getProductosSinRedirigir.
 * incluirNoDisponibles: si true, pide al backend todos los productos (incl. no disponibles) para inventario admin.
 * El backend puede aceptar ?incluirNoDisponibles=1 o ?todos=1 en GET /api/productos.
 */
export type GetProductosSinRedirigirOpts = { incluirNoDisponibles?: boolean };

/**
 * Obtiene el listado de productos sin usar apiClient (sin redirección en 401/403/500).
 * Útil para dashboard e inventario: si el backend falla, devuelve data vacía y error, sin redirigir.
 * Para inventario admin, usa incluirNoDisponibles: true para recibir también los productos desactivados.
 */
export async function getProductosSinRedirigir(opts?: GetProductosSinRedirigirOpts): Promise<ProductosResult> {
  try {
    const base = getBackendBaseUrl();
    const query = opts?.incluirNoDisponibles ? '?incluirNoDisponibles=1' : '';
    const res = await fetch(`${base}/api/productos${query}`, { credentials: 'include' });
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
    let list: ApiProductoRaw[] = [];
    if (Array.isArray(response)) {
      list = response as ApiProductoRaw[];
    } else if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      if (Array.isArray(obj.data)) list = obj.data as ApiProductoRaw[];
      else if (Array.isArray(obj.productos)) list = obj.productos as ApiProductoRaw[];
      else if (Array.isArray(obj.producto)) list = obj.producto as ApiProductoRaw[];
    }
    return { data: list.map(normalizarProducto), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar con el servidor';
    return { data: [], error: msg };
  }
}

/** Compatibilidad con el dashboard: devuelve solo el array (ignora error). */
export async function getProductosParaDashboard(): Promise<Producto[]> {
  const { data } = await getProductosSinRedirigir();
  return data;
}

/**
 * Obtiene un producto por id. Intenta GET /api/productos/:id; si falla, usa el listado.
 * Si el listado también falla, relanza el error del detalle (un solo mensaje, sin texto extra).
 */
export async function getProductoPorId(id: string | number): Promise<Producto | null> {
  const BACKEND_BASE = getBackendBaseUrl();
  const idStr = String(id);
  let errorDetalle: Error | null = null;
  try {
    const response = await apiClient.get<{ success?: boolean; data?: ApiProductoRaw }>(
      `/api/productos/${idStr}`,
      BACKEND_BASE
    );
    const obj = response as Record<string, unknown>;
    if (obj?.data && typeof obj.data === 'object') {
      return normalizarProducto(obj.data as ApiProductoRaw);
    }
  } catch (e) {
    errorDetalle = e instanceof Error ? e : new Error(String(e));
  }
  try {
    const productos = await getProductos();
    return productos.find((p) => String(p.id) === idStr) ?? null;
  } catch {
    throw errorDetalle ?? new Error('Error al cargar el producto');
  }
}

/** Payload para crear/actualizar producto. Precio solo en presentaciones (modelo productos sin precio/precioOriginal). */
export interface ProductoPayload {
  nombre: string;
  marca?: string;
  descripcion: string;
  descripcionLarga?: string;
  precio?: string | number;
  precioOriginal?: string | number | null;
  descuento?: number;
  categoria: string;
  stock?: number;
  disponible?: boolean;
  nuevo?: boolean;
  crueltyFree?: boolean;
  caracteristicas?: string[];
  ingredientes?: string;
  modoUso?: string;
  resultado?: string;
  /** Solo si el backend aún guarda imágenes en `productos`; preferir `presentaciones[].imagenes`. */
  imagenes?: string[];
  presentaciones?: Array<{
    id?: number;
    tamanio: string;
    precio: string | number;
    precioOriginal?: string | number;
    stock?: number;
    disponible?: boolean;
    fechaCaducidad?: string | null;
    imagenes?: string[];
  }>;
}

/** Convierte YYYY-MM-DD a ISO para TIMESTAMP(3) en BD. */
function fechaCaducidadParaApi(fecha: string): string | undefined {
  const t = fecha.trim();
  if (!t) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T12:00:00.000Z`;
  return t;
}

/** DECIMAL(10,2) en JSON: número con 2 decimales (Prisma/Nest suelen aceptarlo). */
function redondearDecimal(n: number): number {
  const x = Number.isFinite(n) ? n : 0;
  return Math.round(x * 100) / 100;
}

/**
 * Cuerpo JSON para el DTO de Nest (camelCase + forbidNonWhitelisted).
 * Los nombres en BD siguen siendo snake_case vía Prisma @map; el API no acepta esas claves en el JSON.
 */
export function productoPayloadToApiBody(payload: ProductoPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    nombre: payload.nombre,
    descripcion: payload.descripcion,
    categoria: (payload.categoria ?? '').trim(),
    marca: (payload.marca ?? '').trim(),
  };
  if (payload.descuento !== undefined) {
    body.descuento = Math.round(Number(payload.descuento)) || 0;
  }
  if (payload.nuevo !== undefined) body.nuevo = Boolean(payload.nuevo);
  if (payload.crueltyFree !== undefined) body.crueltyFree = Boolean(payload.crueltyFree);
  if (payload.caracteristicas !== undefined) {
    body.caracteristicas = payload.caracteristicas;
  }

  const dl = payload.descripcionLarga?.trim();
  if (dl) body.descripcionLarga = dl;

  const ing = payload.ingredientes?.trim();
  if (ing) body.ingredientes = ing;

  const mu = payload.modoUso?.trim();
  if (mu) body.modoUso = mu;

  const res = payload.resultado?.trim();
  if (res) body.resultado = res;

  if (payload.presentaciones?.length) {
    body.presentaciones = payload.presentaciones.map((pr) => {
      const precioNum =
        typeof pr.precio === 'number'
          ? pr.precio
          : parseFloat(String(pr.precio ?? '').replace(/[^0-9.]/g, '')) || 0;
      let poNum = NaN;
      if (pr.precioOriginal != null && pr.precioOriginal !== '') {
        poNum =
          typeof pr.precioOriginal === 'number'
            ? pr.precioOriginal
            : parseFloat(String(pr.precioOriginal).replace(/[^0-9.]/g, ''));
      }
      const row: Record<string, unknown> = {
        tamanio: pr.tamanio,
        precio: redondearDecimal(precioNum),
        stock: Math.max(0, Math.round(Number(pr.stock ?? 0))),
        disponible: Boolean(pr.disponible ?? true),
        imagenes: Array.isArray(pr.imagenes) ? pr.imagenes : [],
      };
      const presId = pr.id != null ? Number(pr.id) : NaN;
      if (Number.isInteger(presId) && presId >= 1) row.id = presId;
      if (Number.isFinite(poNum) && poNum >= 0) {
        row.precioOriginal = redondearDecimal(poNum);
      }
      if (pr.fechaCaducidad != null && String(pr.fechaCaducidad).trim()) {
        const iso = fechaCaducidadParaApi(String(pr.fechaCaducidad).trim());
        if (iso) row.fechaCaducidad = iso;
      }
      return row;
    });
  }

  return body;
}

/** Fila ya normalizada (p. ej. desde admin) antes de enviar al API. */
export type PresentacionNormalizadaPayload = {
  id?: number;
  tamanio: string;
  precio: string;
  precioOriginal?: string;
  stock: number;
  disponible: boolean;
  fechaCaducidad?: string;
  imagenes: string[];
};

/**
 * Misma forma que antes (precio/precioOriginal como string numérico), sin `imagenes: []` vacío.
 */
export function serializarPresentacionesProducto(
  rows: PresentacionNormalizadaPayload[]
): NonNullable<ProductoPayload['presentaciones']> {
  return rows.map((row) => {
    const precioStr = String(row.precio ?? '').replace(/[^0-9.]/g, '') || '0';
    const poRaw = row.precioOriginal != null ? String(row.precioOriginal).replace(/[^0-9.]/g, '') : '';
    const base: NonNullable<ProductoPayload['presentaciones']>[number] = {
      tamanio: row.tamanio,
      precio: precioStr,
      stock: row.stock,
      disponible: row.disponible,
    };
    if (row.id != null) base.id = row.id;
    if (poRaw) base.precioOriginal = poRaw;
    if (row.fechaCaducidad) base.fechaCaducidad = row.fechaCaducidad;
    if (row.imagenes.length > 0) base.imagenes = row.imagenes;
    return base;
  });
}

/**
 * Crea un producto. Requiere JWT y rol admin.
 * Sube antes las imágenes con subirImagenCloudinary y pasa las URLs en `presentaciones[].imagenes`.
 */
export async function createProducto(payload: ProductoPayload): Promise<Producto> {
  const BACKEND_BASE = getBackendBaseUrl();
  const response = await apiClient.post<{ success?: boolean; data?: ApiProductoRaw }>(
    '/api/productos',
    productoPayloadToApiBody(payload),
    BACKEND_BASE
  );
  const obj = response as Record<string, unknown>;
  const data = obj?.data;
  if (data && typeof data === 'object' && data !== null) {
    return normalizarProducto(data as ApiProductoRaw);
  }
  throw new Error('El API no devolvió el producto creado');
}

/**
 * Actualiza un producto. Requiere JWT y rol admin.
 * Incluye `presentaciones[].imagenes` (tabla producto_presentaciones).
 */
export async function updateProducto(
  id: string | number,
  payload: ProductoPayload
): Promise<Producto> {
  const BACKEND_BASE = getBackendBaseUrl();
  const response = await apiClient.put<{ success?: boolean; data?: ApiProductoRaw }>(
    `/api/productos/${id}`,
    productoPayloadToApiBody(payload),
    BACKEND_BASE
  );
  const obj = response as Record<string, unknown>;
  const data = obj?.data;
  if (data && typeof data === 'object' && data !== null) {
    return normalizarProducto(data as ApiProductoRaw);
  }
  throw new Error('El API no devolvió el producto actualizado');
}

/**
 * Elimina un producto (borrado lógico en backend). Requiere JWT y rol admin.
 */
export async function deleteProducto(id: string | number): Promise<void> {
  const BACKEND_BASE = getBackendBaseUrl();
  await apiClient.delete(`/api/productos/${id}`, BACKEND_BASE);
}

/** Convierte precio en string (ej. "$350") a número. */
export function precioANumero(precio: string | undefined): number {
  if (!precio) return 0;
  const s = String(precio).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

export type DescuentoPorMarcaResult =
  | { success: true; actualizados: number; mensaje?: string }
  | { success: false; error: string };

/**
 * Aplica un porcentaje de descuento a todos los productos de una marca.
 * Si el backend expone POST /api/productos/descuento-por-marca, lo usa; si no,
 * obtiene el listado, filtra por marca y actualiza cada producto (precio y descuento).
 */
export async function aplicarDescuentoPorMarca(
  marca: string,
  porcentaje: number
): Promise<DescuentoPorMarcaResult> {
  const base = getBackendBaseUrl();
  const marcaTrim = marca.trim();
  if (!marcaTrim) return { success: false, error: 'Indica el nombre de la marca.' };
  const pct = Math.max(0, Math.min(100, Number(porcentaje) || 0));
  if (pct === 0) return { success: false, error: 'El porcentaje debe ser mayor que 0.' };

  try {
    const res = await fetch(`${base}/api/productos/descuento-por-marca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ marca: marcaTrim, porcentaje: pct }),
    });
    if (res.ok) {
      const data = (await res.json()) as { actualizados?: number; message?: string };
      return {
        success: true,
        actualizados: typeof data.actualizados === 'number' ? data.actualizados : 0,
        mensaje: data.message,
      };
    }
    if (res.status === 404 || res.status === 501) {
      // Backend no tiene el endpoint: aplicar producto por producto
    } else {
      const text = await res.text();
      let msg = `Error ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = (j.message ?? j.error ?? msg) as string;
      } catch {
        if (text) msg = text.slice(0, 120);
      }
      return { success: false, error: msg };
    }
  } catch {
    // Red de fallo: continuar con fallback
  }

  const { data: productos, error: listError } = await getProductosSinRedirigir();
  if (listError) return { success: false, error: listError };
  const filtrados = productos.filter(
    (p) => p.marca && p.marca.trim().toLowerCase() === marcaTrim.toLowerCase()
  );
  if (filtrados.length === 0) {
    return { success: false, error: `No hay productos con la marca "${marcaTrim}".` };
  }

  let actualizados = 0;
  for (const p of filtrados) {
    if (!p.presentaciones?.length) continue;
    const presentacionesConDescuento = p.presentaciones.map((pr) => {
      const precioOrig = precioANumero(pr.precioOriginal ?? undefined) || precioANumero(pr.precio);
      const nuevoPrecio = Math.round(precioOrig * (1 - pct / 100) * 100) / 100;
      return {
        tamanio: pr.tamaño,
        precio: nuevoPrecio,
        precioOriginal: precioOrig,
        stock: pr.stock,
        disponible: pr.disponible,
      };
    });
    const payload: ProductoPayload = {
      nombre: p.nombre,
      descripcion: p.descripcion,
      descuento: pct,
      categoria: p.categoria,
      marca: p.marca,
      presentaciones: presentacionesConDescuento,
    };
    try {
      await updateProducto(p.id, payload);
      actualizados++;
    } catch {
      // Siguiente producto
    }
  }
  return { success: true, actualizados };
}

export type DescuentoGlobalResult =
  | { success: true; actualizados: number; mensaje?: string }
  | { success: false; error: string };

/**
 * Aplica un porcentaje de descuento global filtrando por marca y/o categoría.
 * - Solo marca: descuento a todos los productos de esa marca.
 * - Solo categoría: descuento a todos los productos de esa categoría.
 * - Marca y categoría: descuento solo a productos que cumplan ambos (ej. AVYNA + Cuidado del cabello).
 * Si el backend tiene POST /api/productos/descuento-global con { marca?, categoria?, porcentaje }, lo usa; si no, aplica producto por producto.
 */
export async function aplicarDescuentoGlobal(params: {
  marca?: string;
  categoria?: string;
  porcentaje: number;
}): Promise<DescuentoGlobalResult> {
  const base = getBackendBaseUrl();
  const marcaTrim = params.marca?.trim() ?? '';
  const categoriaTrim = params.categoria?.trim() ?? '';
  if (!marcaTrim && !categoriaTrim) {
    return { success: false, error: 'Indica al menos una marca o una categoría.' };
  }
  const pct = Math.max(0, Math.min(100, Number(params.porcentaje) || 0));
  if (pct === 0) return { success: false, error: 'El porcentaje debe ser mayor que 0.' };

  try {
    const res = await fetch(`${base}/api/productos/descuento-global`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        marca: marcaTrim || undefined,
        categoria: categoriaTrim || undefined,
        porcentaje: pct,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { actualizados?: number; message?: string };
      return {
        success: true,
        actualizados: typeof data.actualizados === 'number' ? data.actualizados : 0,
        mensaje: data.message,
      };
    }
    if (res.status === 404 || res.status === 501) {
      // Backend no tiene el endpoint: aplicar producto por producto
    } else {
      const text = await res.text();
      let msg = `Error ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = (j.message ?? j.error ?? msg) as string;
      } catch {
        if (text) msg = text.slice(0, 120);
      }
      return { success: false, error: msg };
    }
  } catch {
    // Red de fallo: continuar con fallback
  }

  const { data: productos, error: listError } = await getProductosSinRedirigir({ incluirNoDisponibles: true });
  if (listError) return { success: false, error: listError };
  const filtrados = productos.filter((p) => {
    const cumpleMarca = !marcaTrim || (p.marca && p.marca.trim().toLowerCase() === marcaTrim.toLowerCase());
    const cumpleCategoria = !categoriaTrim || (p.categoria && p.categoria.trim().toLowerCase() === categoriaTrim.toLowerCase());
    return cumpleMarca && cumpleCategoria;
  });
  if (filtrados.length === 0) {
    const filtros: string[] = [];
    if (marcaTrim) filtros.push(`marca "${marcaTrim}"`);
    if (categoriaTrim) filtros.push(`categoría "${categoriaTrim}"`);
    return { success: false, error: `No hay productos con ${filtros.join(' y ')}.` };
  }

  let actualizados = 0;
  for (const p of filtrados) {
    if (!p.presentaciones?.length) continue;
    const presentacionesConDescuento = p.presentaciones.map((pr) => {
      const precioOrig = precioANumero(pr.precioOriginal ?? undefined) || precioANumero(pr.precio);
      const nuevoPrecio = Math.round(precioOrig * (1 - pct / 100) * 100) / 100;
      return {
        tamanio: pr.tamaño,
        precio: nuevoPrecio,
        precioOriginal: precioOrig,
        stock: pr.stock,
        disponible: pr.disponible,
      };
    });
    const payload: ProductoPayload = {
      nombre: p.nombre,
      descripcion: p.descripcion,
      descuento: pct,
      categoria: p.categoria,
      marca: p.marca,
      presentaciones: presentacionesConDescuento,
    };
    try {
      await updateProducto(p.id, payload);
      actualizados++;
    } catch {
      // Siguiente producto
    }
  }
  return { success: true, actualizados };
}
