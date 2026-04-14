// src/services/paquetes.ts
// CRUD paquetes: POST/PATCH JSON solo snake_case permitido por CreatePaqueteDto / UpdatePaqueteDto
// (tipo_evento, descripcion?, servicios_vinculados?, precio_especial). Respuestas { data: ... }.
// JWT + rol admin. Ver contrato en documentación del backend (ValidationPipe forbidNonWhitelisted).
//
// Opcional: `NEXT_PUBLIC_API_PAQUETES_ROOT` si el controller no está en `/api/paquetes`.

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

const base = () => getBackendBaseUrl();

/** Base path del API de paquetes (lista = root, item = `${root}/:id`). */
export const getPaquetesApiRoot = (): string => {
  const raw = (process.env.NEXT_PUBLIC_API_PAQUETES_ROOT ?? '/api/paquetes').trim();
  const normalized = raw.replace(/\/$/, '');
  return normalized || '/api/paquetes';
};

function unwrapData<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) {
    const d = (res as { data: unknown }).data;
    if (d !== undefined) return d as T;
  }
  return res as T;
}

/** Lee un paquete del API sea snake_case (Mongo) o camelCase (Nest/Prisma serializado). */
export function camposPaqueteApi(raw: Record<string, unknown>) {
  const tipo = raw.tipo_evento ?? raw.tipoEvento;
  const precio = raw.precio_especial ?? raw.precioEspecial;
  const d = raw.descripcion;
  const sv = raw.servicios_vinculados ?? raw.serviciosVinculados;
  return {
    tipoEvento: tipo == null ? '' : String(tipo),
    precioEspecial: precio == null ? '' : String(precio),
    descripcion: typeof d === 'string' ? d : '',
    serviciosVinculados: Array.isArray(sv) ? sv.map((x) => String(x)) : [],
  };
}

// OBTENER TODOS LOS PAQUETES → array del cuerpo `{ data: [...] }`
export const getPaquetes = async (): Promise<Record<string, unknown>[]> => {
  const root = getPaquetesApiRoot();
  try {
    const res = await apiClient.get<unknown>(root, base());
    const u = unwrapData<unknown>(res);
    return Array.isArray(u) ? (u as Record<string, unknown>[]) : [];
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 404) {
      throw new Error(
        `No existe GET ${root} en el API (404). Falta registrar en Nest el recurso de paquetes (p. ej. @Controller("paquetes") con prefijo global "api" y el módulo importado en AppModule).`
      );
    }
    throw e;
  }
};

// OBTENER UN SOLO PAQUETE POR ID (vista de edición)
export const getPaqueteById = async (id: string) => {
  const res = await apiClient.get<unknown>(`${getPaquetesApiRoot()}/${id}`, base());
  return unwrapData<Record<string, unknown>>(res);
};

/** Campos que el admin envía; se serializan a snake_case para el API. */
export interface PaqueteWritePayload {
  tipoEvento: string;
  /** Opcional en el DTO; si se omite en el JSON, el backend guarda cadena vacía. */
  descripcion?: string;
  precioEspecial: number;
  /** Nombres arbitrarios (string[]); el backend no valida contra catálogo. */
  serviciosVinculados: string[];
}

/** Quita caracteres de control que a veces rompen validación o capas de sanitización en el API. */
function textoPaqueteSeguro(s: string): string {
  return String(s).replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

/**
 * Cuerpo JSON para POST/PATCH. Solo propiedades del DTO (`tipo_evento`, `descripcion?`, `precio_especial`, `servicios_vinculados?`).
 * `precio_especial` se redondea a 2 decimales (Decimal en BD). `descripcion` vacía se omite (el backend guarda '' si no viene).
 */
export function serializarPaqueteParaApi(p: PaqueteWritePayload | Partial<PaqueteWritePayload>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.tipoEvento !== undefined) {
    const t = textoPaqueteSeguro(p.tipoEvento);
    if (t.length > 0) out.tipo_evento = t;
  }
  if (p.descripcion !== undefined) {
    const d = textoPaqueteSeguro(p.descripcion);
    if (d.length > 0) out.descripcion = d;
  }
  if (p.precioEspecial !== undefined) {
    const n = Number(p.precioEspecial);
    if (Number.isFinite(n)) out.precio_especial = Math.round(n * 100) / 100;
  }
  if (p.serviciosVinculados !== undefined) {
    const arr = p.serviciosVinculados
      .map((x) => textoPaqueteSeguro(String(x)))
      .filter((x) => x.length > 0);
    if (arr.length > 0) out.servicios_vinculados = arr;
  }
  return out;
}

// CREAR UN PAQUETE
export const createPaquete = async (paqueteData: PaqueteWritePayload) => {
  const body = serializarPaqueteParaApi(paqueteData);
  const res = await apiClient.post<unknown>(getPaquetesApiRoot(), body, base());
  return unwrapData(res);
};

// ACTUALIZAR UN PAQUETE
export const updatePaquete = async (id: string, paqueteData: Partial<PaqueteWritePayload>) => {
  const body = serializarPaqueteParaApi(paqueteData);
  const res = await apiClient.patch<unknown>(`${getPaquetesApiRoot()}/${id}`, body, base());
  return unwrapData(res);
};

// ELIMINAR UN PAQUETE
export const deletePaquete = async (id: string) => {
  return apiClient.delete<unknown>(`${getPaquetesApiRoot()}/${id}`, base());
};
