/**
 * Lógica pura del Gestor de Base de Datos (sin React): qué vista abre cada subruta, qué modo de
 * importación se manda, opciones del select de truncate y texto del intervalo de monitoreo.
 */
import type { ModoImportacion, TablaImportable } from '../../../services/database';

export type VistaPrincipalBd = 'operaciones' | 'monitoreo' | 'diagrama' | 'consultar' | 'backup';
export type VistaOperacionesBd = 'importar' | 'exportar' | 'truncate';
export type VistaMonitoreoBd = 'resumen' | 'tablas' | 'indices' | 'actividad' | 'locks';

export type VistaDesdeRuta = {
  principal: VistaPrincipalBd;
  operaciones?: VistaOperacionesBd;
  monitoreo?: VistaMonitoreoBd;
};

/** Monitoreo: pausa mínima entre rondas automáticas. */
export const MONITOREO_INTERVALO_MS = 30_000;

/** Pestañas de Monitoreo (los íconos los pone la página). */
export const PESTANAS_MONITOREO: ReadonlyArray<{ id: VistaMonitoreoBd; label: string; hint: string }> = [
  { id: 'resumen', label: 'Monitoreo y rendimiento', hint: 'Estado global' },
  { id: 'tablas', label: 'Tablas', hint: 'Salud de tablas' },
  { id: 'indices', label: 'Índices', hint: 'Eficiencia' },
  { id: 'actividad', label: 'Actividad', hint: 'Conexiones y consultas en curso' },
  { id: 'locks', label: 'Locks', hint: 'Bloqueos activos y en espera' },
];

/** Vista que corresponde a una ruta de /admin/base-datos; null si la ruta no es del gestor. */
export function vistaDesdeRuta(pathname: string | null | undefined): VistaDesdeRuta | null {
  const base = '/admin/base-datos';
  if (!pathname?.startsWith(base)) return null;
  const sub = pathname.slice(base.length);

  if (sub === '' || sub === '/') return { principal: 'operaciones', operaciones: 'importar' };
  if (sub.startsWith('/operaciones')) {
    if (sub.includes('/truncate')) return { principal: 'operaciones', operaciones: 'truncate' };
    return { principal: 'operaciones', operaciones: sub.includes('/exportar') ? 'exportar' : 'importar' };
  }
  if (sub.startsWith('/monitoreo')) {
    if (sub.includes('/tablas')) return { principal: 'monitoreo', monitoreo: 'tablas' };
    if (sub.includes('/indices')) return { principal: 'monitoreo', monitoreo: 'indices' };
    if (sub.includes('/actividad')) return { principal: 'monitoreo', monitoreo: 'actividad' };
    if (sub.includes('/locks')) return { principal: 'monitoreo', monitoreo: 'locks' };
    return { principal: 'monitoreo', monitoreo: 'resumen' };
  }
  if (sub.startsWith('/diagrama')) return { principal: 'diagrama' };
  if (sub.startsWith('/consultar')) return { principal: 'consultar' };
  if (sub.startsWith('/backup') || sub.startsWith('/Backup')) return { principal: 'backup' };
  return null;
}

/**
 * Modo de importación para una tabla, según los modos que el backend declara en
 * GET /api/db/import/tables. Se prefiere missing_only (no duplica ni sobrescribe), luego upsert y
 * luego append (p. ej. productos solo admite append).
 */
export function modoImportacion(meta: TablaImportable[], tabla: string): ModoImportacion {
  const permitidos = meta.find((t) => t.tabla === tabla)?.modosPermitidos ?? [];
  if (permitidos.includes('missing_only')) return 'missing_only';
  if (permitidos.includes('upsert')) return 'upsert';
  return 'append';
}

/**
 * Opciones del select de tabla para TRUNCATE. Empieza con un marcador vacío: sin él, la primera
 * tabla se veía elegida sin estarlo y no se podía seleccionar.
 */
export function opcionesTablaTruncate(tablas: string[]): Array<{ value: string; label: string }> {
  if (tablas.length === 0) return [{ value: '', label: 'Carga las tablas de la BD' }];
  return [{ value: '', label: 'Selecciona una tabla' }, ...tablas.map((t) => ({ value: t, label: t }))];
}

/** Texto del intervalo de actualización del monitoreo, derivado del intervalo real. */
export function textoIntervaloMonitoreo(): string {
  return `cada ${Math.round(MONITOREO_INTERVALO_MS / 1000)} s`;
}
