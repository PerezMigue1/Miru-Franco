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
  | {
      success: true;
      importados: number;
      fallidos?: number;
      actualizados?: number;
      omitidos?: number;
      modo?: 'append' | 'missing_only' | 'upsert';
      errores?: Array<{ fila: number; mensaje: string }>;
    }
  | { success: false; error: string };

export type ModoImportacion = 'append' | 'missing_only' | 'upsert';
export type TablaImportable = {
  tabla: string;
  modosPermitidos: ModoImportacion[];
  conflictKeys?: string[];
};

export type ResultadoTruncate =
  | { success: true; tabla: string; restartIdentity: boolean; cascade: boolean; message?: string }
  | { success: false; error: string };

/**
 * Importa datos desde CSV o JSON.
 * POST /api/db/import (multipart: tabla + archivo)
 */
export async function importarDatos(
  tabla: string,
  archivo: File,
  modo: ModoImportacion = 'missing_only'
): Promise<ResultadoImportacion> {
  const base = getBackendBaseUrl();
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  const formData = new FormData();
  formData.append('tabla', tabla);
  formData.append('archivo', archivo);
  formData.append('modo', modo);

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
    const actualizados = typeof data.actualizados === 'number' ? data.actualizados : 0;
    const omitidos = typeof data.omitidos === 'number' ? data.omitidos : 0;
    const modoResp =
      data.modo === 'append' || data.modo === 'missing_only' || data.modo === 'upsert'
        ? (data.modo as ModoImportacion)
        : undefined;
    const errores = Array.isArray(data.errores) ? data.errores : [];

    return {
      success: true,
      importados,
      fallidos,
      actualizados,
      omitidos,
      modo: modoResp,
      errores,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar con el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Obtiene tablas/modes soportados por el backend para importación segura.
 * GET /api/db/import/tables
 */
export async function obtenerTablasImportables(): Promise<
  { success: true; tablas: TablaImportable[] } | { success: false; error: string }
> {
  const base = getBackendBaseUrl();
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }
  try {
    const res = await fetch(`${base}${DB_API_PREFIX}/import/tables`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data.message ?? data.error ?? `Error ${res.status}`) as string;
      return { success: false, error: msg };
    }
    const tablasRaw: unknown[] = Array.isArray(data.tablas) ? data.tablas : [];
    const tablas = tablasRaw
      .map((t: unknown) => {
        const item = (t ?? {}) as Record<string, unknown>;
        const tabla = String(item.tabla ?? '').trim();
        const modosRaw = Array.isArray(item.modosPermitidos) ? item.modosPermitidos : [];
        const modosPermitidos = modosRaw.filter(
          (m): m is ModoImportacion => m === 'append' || m === 'missing_only' || m === 'upsert'
        );
        const conflictKeys = Array.isArray(item.conflictKeys)
          ? item.conflictKeys.map((c: unknown) => String(c))
          : [];
        return tabla ? { tabla, modosPermitidos, conflictKeys } : null;
      })
      .filter(
        (t): t is { tabla: string; modosPermitidos: ModoImportacion[]; conflictKeys: string[] } => !!t
      );

    return { success: true, tablas };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar con el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Ejecuta TRUNCATE TABLE para una tabla concreta.
 * POST /api/db/truncate
 */
export async function truncarTabla(
  tabla: string,
  opciones?: { restartIdentity?: boolean; cascade?: boolean }
): Promise<ResultadoTruncate> {
  const base = getBackendBaseUrl();
  const token = getToken();
  if (!token) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  try {
    const res = await fetch(`${base}${DB_API_PREFIX}/truncate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        tabla,
        restartIdentity: opciones?.restartIdentity ?? true,
        cascade: opciones?.cascade ?? false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data.message ?? data.error ?? `Error ${res.status}`) as string;
      return { success: false, error: msg };
    }
    return {
      success: true,
      tabla: String(data.tabla ?? tabla),
      restartIdentity: Boolean(data.restartIdentity ?? opciones?.restartIdentity ?? true),
      cascade: Boolean(data.cascade ?? opciones?.cascade ?? false),
      message: typeof data.message === 'string' ? data.message : undefined,
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

export type ActivityRowDirecta = {
  pid: number;
  usename: string;
  datname: string;
  state: string | null;
  wait_event_type: string | null;
  wait_event: string | null;
  query_start: string | null;
  query: string | null;
};

export type LockRowDirecta = {
  pid: number;
  locktype: string;
  mode: string;
  granted: boolean;
  relation: string | null;
  state: string | null;
  wait_event_type: string | null;
  wait_event: string | null;
  query: string | null;
};

export type DbSummaryDirecta = {
  bytes: number;
  sizeMB: number;
  totalConexiones: number;
  conexionesActivas: number;
  totalTablas: number;
  version: string;
  uptimeSeconds: number;
  estadoBd: string;
  cacheHitRatio: number;
  transaccionesPorSegundo: number;
};

export type TableSizeDirecta = {
  schemaname: string;
  tablename: string;
  size_mb: string;
};

export type RealtimeMetricsDirecta = {
  timestamp: string;
  qps: number;
  activeConnections: number;
  avgResponseMs: number;
};

export type SlowQueryDirecta = {
  pid: number;
  usename: string;
  state: string | null;
  durationMs: number;
  query: string | null;
};

export type TopCostlyQueryDirecta = {
  query: string;
  calls: number;
  total_exec_time_ms: number;
  mean_exec_time_ms: number;
};

export type TableStatDirecta = {
  schemaname: string;
  relname: string;
  seq_scan: string;
  idx_scan: string;
  n_live_tup: string;
  n_dead_tup: string;
  n_tup_ins: string;
  n_tup_upd: string;
  n_tup_del: string;
  last_vacuum: string | null;
  last_autovacuum: string | null;
};

export type IndexStatDirecta = {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_scan: string;
  seq_scan: string;
  eficiencia: string;
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
 * Actividad actual de conexiones/sesiones.
 * GET /api/db/export-direct?meta=activity
 */
export async function obtenerActividadDirecta(): Promise<
  { success: true; rows: ActivityRowDirecta[] } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) return { success: false, error: 'Debes iniciar sesión' };
  try {
    const res = await fetch(`${EXPORT_DIRECT_PREFIX}?meta=activity`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    return { success: true, rows: (Array.isArray(data.rows) ? data.rows : []) as ActivityRowDirecta[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al conectar' };
  }
}

/**
 * Locks actuales en la base de datos.
 * GET /api/db/export-direct?meta=locks
 */
export async function obtenerLocksDirectos(): Promise<
  { success: true; rows: LockRowDirecta[] } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) return { success: false, error: 'Debes iniciar sesión' };
  try {
    const res = await fetch(`${EXPORT_DIRECT_PREFIX}?meta=locks`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    return { success: true, rows: (Array.isArray(data.rows) ? data.rows : []) as LockRowDirecta[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al conectar' };
  }
}

export async function obtenerResumenBdDirecto(): Promise<
  { success: true; data: DbSummaryDirecta } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) return { success: false, error: 'Debes iniciar sesión' };
  try {
    const res = await fetch(`${EXPORT_DIRECT_PREFIX}?meta=db_summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    return { success: true, data: data as DbSummaryDirecta };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al conectar' };
  }
}

export async function obtenerTableStatsDirecto(): Promise<
  { success: true; rows: TableStatDirecta[] } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) return { success: false, error: 'Debes iniciar sesión' };
  try {
    const res = await fetch(`${EXPORT_DIRECT_PREFIX}?meta=table_stats`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    return { success: true, rows: (Array.isArray(data.rows) ? data.rows : []) as TableStatDirecta[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al conectar' };
  }
}

export async function obtenerIndexStatsDirecto(): Promise<
  { success: true; rows: IndexStatDirecta[] } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) return { success: false, error: 'Debes iniciar sesión' };
  try {
    const res = await fetch(`${EXPORT_DIRECT_PREFIX}?meta=index_stats`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    return { success: true, rows: (Array.isArray(data.rows) ? data.rows : []) as IndexStatDirecta[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al conectar' };
  }
}

export async function obtenerTableSizesDirecto(): Promise<
  { success: true; rows: TableSizeDirecta[] } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) return { success: false, error: 'Debes iniciar sesión' };
  try {
    const res = await fetch(`${EXPORT_DIRECT_PREFIX}?meta=table_size`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    return { success: true, rows: (Array.isArray(data.rows) ? data.rows : []) as TableSizeDirecta[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al conectar' };
  }
}

export async function obtenerRealtimeMetricsDirecto(): Promise<
  { success: true; data: RealtimeMetricsDirecta } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) return { success: false, error: 'Debes iniciar sesión' };
  try {
    const res = await fetch(`${EXPORT_DIRECT_PREFIX}?meta=realtime_metrics`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    return { success: true, data: data as RealtimeMetricsDirecta };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al conectar' };
  }
}

export async function obtenerQueryInsightsDirecto(): Promise<
  {
    success: true;
    slowQueries: SlowQueryDirecta[];
    topCostlyQueries: TopCostlyQueryDirecta[];
    pgStatStatementsEnabled: boolean;
  } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) return { success: false, error: 'Debes iniciar sesión' };
  try {
    const res = await fetch(`${EXPORT_DIRECT_PREFIX}?meta=query_insights`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    return {
      success: true,
      slowQueries: (Array.isArray(data.slowQueries) ? data.slowQueries : []) as SlowQueryDirecta[],
      topCostlyQueries: (Array.isArray(data.topCostlyQueries) ? data.topCostlyQueries : []) as TopCostlyQueryDirecta[],
      pgStatStatementsEnabled: Boolean(data.pgStatStatementsEnabled),
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al conectar' };
  }
}

/**
 * EXPLAIN ANALYZE sobre una tabla (opcional filtro columna=valor).
 * GET /api/db/export-direct?meta=explain&tabla=X&columna=Y&valor=Z
 */
export async function obtenerExplainDirecto(
  tabla: string,
  columna?: string,
  valor?: string
): Promise<
  { success: true; plan: unknown; query: string } | { success: false; error: string }
> {
  const token = getToken();
  if (!token) return { success: false, error: 'Debes iniciar sesión' };
  try {
    const params = new URLSearchParams({ meta: 'explain', tabla });
    if (columna && valor) {
      params.set('columna', columna);
      params.set('valor', valor);
    }
    const res = await fetch(`${EXPORT_DIRECT_PREFIX}?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
    return { success: true, plan: data.plan, query: String(data.query ?? '') };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al conectar' };
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
