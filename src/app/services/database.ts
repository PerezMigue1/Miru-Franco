/**
 * Servicio de base de datos para admin.
 * Importar y exportar datos via API backend (PostgreSQL + Prisma).
 */

import { getBackendBaseUrl } from './config';
import { getToken } from '../utils/security';

/** Ruta base para endpoints de base de datos (import, export). */
const DB_API_PREFIX = '/api/db';

/** Ruta del endpoint del diagrama ER. GET /api/db/diagram?formato=mermaid|svg|png */
const DIAGRAM_ENDPOINT = '/api/db/diagram';

/** Tablas/entidades soportadas por el backend para import/export */
export const TABLAS_DISPONIBLES = [
  { value: 'productos', label: 'Productos' },
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'categorias', label: 'Categorías' },
  { value: 'proveedores', label: 'Proveedores' },
] as const;

/** Tablas que el backend permite exportar (GET /api/db/export) */
export const TABLAS_EXPORTABLES = [
  { value: 'productos', label: 'Productos' },
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'servicios', label: 'Servicios' },
] as const;

export type TablaDisponible = (typeof TABLAS_DISPONIBLES)[number]['value'];

export type ResultadoImportacion =
  | { success: true; importados: number; fallidos?: number; errores?: Array<{ fila: number; mensaje: string }> }
  | { success: false; error: string };

/**
 * Importa datos desde CSV o JSON.
 * POST /api/db/import (multipart: tabla + archivo)
 */
export async function importarDatos(tabla: string, archivo: File): Promise<ResultadoImportacion> {
  const base = getBackendBaseUrl();
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  const formData = new FormData();
  formData.append('tabla', tabla);
  formData.append('archivo', archivo);

  try {
    const res = await fetch(`${base}${DB_API_PREFIX}/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = (data.message ?? data.error ?? `Error ${res.status}`) as string;
      return { success: false, error: msg };
    }

    const importados = typeof data.importados === 'number' ? data.importados : 0;
    const fallidos = typeof data.fallidos === 'number' ? data.fallidos : 0;
    const errores = Array.isArray(data.errores) ? data.errores : [];

    return {
      success: true,
      importados,
      fallidos,
      errores,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar con el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Exporta datos como CSV o JSON.
 * GET /api/db/export?tabla=X&formato=Y
 * Devuelve un Blob para descargar.
 */
export async function exportarDatos(
  tabla: string,
  formato: 'csv' | 'json'
): Promise<{ success: true; blob: Blob; filename: string } | { success: false; error: string }> {
  const base = getBackendBaseUrl();
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  try {
    const url = `${base}${DB_API_PREFIX}/export?tabla=${encodeURIComponent(tabla)}&formato=${encodeURIComponent(formato)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!res.ok) {
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

    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = `${tabla}_${new Date().toISOString().slice(0, 10)}.${formato}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match?.[1]) filename = match[1];
    }

    return { success: true, blob, filename };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar con el servidor';
    return { success: false, error: msg };
  }
}

/** Formatos soportados para el diagrama ER */
export type FormatoDiagrama = 'mermaid' | 'svg' | 'png';

const EXTENSIONES_DIAGRAMA: Record<FormatoDiagrama, string> = {
  mermaid: 'mmd',
  svg: 'svg',
  png: 'png',
};

/**
 * Obtiene el diagrama ER como blob (para vista previa o descarga).
 * GET /api/db/diagram?formato=mermaid|svg|png
 */
export async function obtenerDiagrama(
  formato: FormatoDiagrama
): Promise<{ success: true; blob: Blob; filename: string } | { success: false; error: string }> {
  const base = getBackendBaseUrl();
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  try {
    // Usar URL relativa en el navegador para que el proxy de Next.js (/api/* → backend) aplique
    const url =
      typeof window !== 'undefined'
        ? `${DIAGRAM_ENDPOINT}?formato=${encodeURIComponent(formato)}`
        : `${base}${DIAGRAM_ENDPOINT}?formato=${encodeURIComponent(formato)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = `Error ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = (j.message ?? j.error ?? msg) as string;
      } catch {
        if (text) msg = text.slice(0, 120);
      }
      if (res.status === 404 || text.includes('Cannot GET')) {
        msg += ` — Comprueba que el backend tenga GET ${DIAGRAM_ENDPOINT} registrado.`;
      }
      return { success: false, error: msg };
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    const ext = EXTENSIONES_DIAGRAMA[formato];
    let filename = `diagrama-er_${new Date().toISOString().slice(0, 10)}.${ext}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match?.[1]) filename = match[1];
    }

    return { success: true, blob, filename };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar con el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Descarga el diagrama ER del esquema de la base de datos.
 * GET /api/db/diagram?formato=mermaid|svg|png
 */
/**
 * Descarga el diagrama ER (wrapper que obtiene el blob; el download se hace en el handler).
 */
export async function descargarDiagrama(
  formato: FormatoDiagrama
): Promise<{ success: true; blob: Blob; filename: string } | { success: false; error: string }> {
  return obtenerDiagrama(formato);
}
