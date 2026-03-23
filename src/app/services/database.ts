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

/** Ruta de exportación directa a la BD (Next.js API route, mismo origen). */
const EXPORT_DIRECT_PREFIX = '/api/db/export-direct';

/**
 * Lista tablas disponibles para exportación directa (conexión a DATABASE_URL).
 * GET /api/db/export-direct
 */
export async function listarTablasDirectas(): Promise<
  { success: true; tablas: string[] } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }
  try {
    const res = await fetch(EXPORT_DIRECT_PREFIX, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    }
    const tablas = Array.isArray(data.tablas) ? data.tablas : [];
    return { success: true, tablas };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar';
    return { success: false, error: msg };
  }
}

/** Opciones para exportación directa (Export con opciones). */
export type OpcionesExportDirecto = {
  columnas?: string[];
  fechaDesde?: string;
  fechaHasta?: string;
  soloActivos?: boolean;
};

/**
 * Obtiene los nombres de columnas de una tabla (exportación directa).
 * GET /api/db/export-direct?tabla=X&meta=1
 */
export async function obtenerColumnasDirectas(tabla: string): Promise<
  { success: true; columnas: string[] } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }
  try {
    const res = await fetch(
      `${EXPORT_DIRECT_PREFIX}?tabla=${encodeURIComponent(tabla)}&meta=1`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    }
    const columnas = Array.isArray(data.columnas) ? data.columnas : [];
    return { success: true, columnas };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar';
    return { success: false, error: msg };
  }
}

export type ColumnaSchemaDirecta = {
  nombre: string;
  tipo: string;
  nullable: boolean;
  maxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  porDefecto: string | null;
  identity: boolean;
};

/**
 * Obtiene el esquema (columnas con metadatos) de una tabla usando conexión directa.
 * GET /api/db/export-direct?tabla=X&meta=schema
 */
export async function obtenerSchemaDirecto(
  tabla: string
): Promise<{ success: true; columnas: ColumnaSchemaDirecta[] } | { success: false; error: string }> {
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }
  try {
    const res = await fetch(
      `${EXPORT_DIRECT_PREFIX}?tabla=${encodeURIComponent(tabla)}&meta=schema`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    }
    const columnas = Array.isArray(data.columnas) ? (data.columnas as ColumnaSchemaDirecta[]) : [];
    return { success: true, columnas };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar';
    return { success: false, error: msg };
  }
}

/**
 * Exporta una tabla por conexión directa a la BD.
 * GET /api/db/export-direct?tabla=X&formato=Y
 * Opcional: columnas, fechaDesde, fechaHasta, soloActivos (Export con opciones).
 */
export async function exportarDirecto(
  tabla: string,
  formato: 'csv' | 'json',
  opciones?: OpcionesExportDirecto
): Promise<{ success: true; blob: Blob; filename: string } | { success: false; error: string }> {
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }
  try {
    const params = new URLSearchParams({
      tabla,
      formato,
    });
    if (opciones?.columnas?.length) {
      params.set('columnas', opciones.columnas.join(','));
    }
    if (opciones?.fechaDesde) params.set('fechaDesde', opciones.fechaDesde);
    if (opciones?.fechaHasta) params.set('fechaHasta', opciones.fechaHasta);
    if (opciones?.soloActivos) params.set('soloActivos', 'true');
    const url = `${EXPORT_DIRECT_PREFIX}?${params.toString()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
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
    const msg = e instanceof Error ? e.message : 'Error al exportar';
    return { success: false, error: msg };
  }
}
