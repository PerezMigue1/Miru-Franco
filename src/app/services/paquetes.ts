// src/services/paquetes.ts
// CRUD del recurso configurable (por defecto /api/paquetes). JWT vía apiClient.
//
// Opcional: si el @Controller en Nest NO es "paquetes", define
// NEXT_PUBLIC_API_PAQUETES_ROOT=/api/otro-segmento. Con @Controller("paquetes") no hace falta.

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

// OBTENER TODOS LOS PAQUETES
export const getPaquetes = async () => {
  const root = getPaquetesApiRoot();
  try {
    return await apiClient.get<unknown>(root, base());
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

// CREAR UN PAQUETE
export const createPaquete = async (paqueteData: unknown) => {
  const res = await apiClient.post<unknown>(getPaquetesApiRoot(), paqueteData, base());
  return unwrapData(res);
};

// ACTUALIZAR UN PAQUETE
export const updatePaquete = async (id: string, paqueteData: unknown) => {
  const res = await apiClient.patch<unknown>(`${getPaquetesApiRoot()}/${id}`, paqueteData, base());
  return unwrapData(res);
};

// ELIMINAR UN PAQUETE
export const deletePaquete = async (id: string) => {
  return apiClient.delete<unknown>(`${getPaquetesApiRoot()}/${id}`, base());
};
