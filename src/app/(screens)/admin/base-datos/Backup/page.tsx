'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Select from '../../../../components/ui/Select';
import Badge from '../../../../components/ui/Badge';
import { Clock3, Database, Menu, Save, ShieldAlert, Timer, X } from 'lucide-react';
import JSZip from 'jszip';
import { exportarDirecto, listarTablasDirectas } from '../../../../services/database';

type FormatoBackup = 'json' | 'sql' | 'csv';
type ModoBackup = 'completa' | 'seleccionada';

type BackupEntry = {
  id: string;
  fecha: string;
  modo: ModoBackup;
  origen: 'manual' | 'programado';
  formato: FormatoBackup;
  estado: 'exitoso' | 'fallido';
  mensaje?: string;
  tablas?: string[];
  tamaño?: number;
};

const STORAGE_KEY_HISTORIAL_BACKUP = 'base-datos-historial-backups';
const MAX_HISTORIAL_BACKUP = 30;
const STORAGE_AUTO_ENABLED = 'backup-miru-auto-enabled';
const STORAGE_AUTO_TIME = 'backup-miru-auto-time';
const STORAGE_AUTO_LAST_HOUR = 'backup-miru-auto-last-hour';

function loadHistorialBackups(): BackupEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORIAL_BACKUP);
    if (!raw) return [];
    const data = JSON.parse(raw) as BackupEntry[];
    return Array.isArray(data) ? data.slice(0, MAX_HISTORIAL_BACKUP) : [];
  } catch {
    return [];
  }
}

function saveHistorialBackups(historial: BackupEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORIAL_BACKUP, JSON.stringify(historial.slice(0, MAX_HISTORIAL_BACKUP)));
  } catch {
    // ignore storage write errors
  }
}

const sqlIdentifier = (name: string) => `"${name.replace(/"/g, '""')}"`;

const escapeSqlValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : `'${String(value).replace(/'/g, "''")}'`;
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  if (value instanceof Date) return `'${value.toISOString()}'`;
  try {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  } catch {
    return `'${String(value).replace(/'/g, "''")}'`;
  }
};

const buildSqlInsertsForTable = (tabla: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return `-- Tabla ${tabla} sin filas\n`;
  const columnas = Array.from(rows.reduce<Set<string>>((acc, row) => {
    Object.keys(row).forEach((key) => acc.add(key));
    return acc;
  }, new Set<string>()));
  const columnasSql = columnas.map(sqlIdentifier).join(', ');
  return rows
    .map((row) => {
      const valores = columnas.map((key) => escapeSqlValue(row[key]));
      return `INSERT INTO ${tabla.split('.').map(sqlIdentifier).join('.')} (${columnasSql}) VALUES (${valores.join(', ')});`;
    })
    .join('\n');
};

async function descargarArchivo(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function BackupPage() {
  const [tablasDirectas, setTablasDirectas] = useState<string[]>([]);
  const [loadingTablasDirectas, setLoadingTablasDirectas] = useState(false);
  const [realizandoBackup, setRealizandoBackup] = useState(false);
  const [errorBackup, setErrorBackup] = useState<string | null>(null);
  const [modoBackup, setModoBackup] = useState<ModoBackup>('completa');
  const [formatoBackup, setFormatoBackup] = useState<FormatoBackup>('json');
  const [tablasSeleccionadasBackup, setTablasSeleccionadasBackup] = useState<string[]>([]);
  const [historialBackups, setHistorialBackups] = useState<BackupEntry[]>([]);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoTime, setAutoTime] = useState('08:00');
  const [menuLateralOculto, setMenuLateralOculto] = useState(true);

  const modoRef = useRef<ModoBackup>(modoBackup);
  const formatoRef = useRef<FormatoBackup>(formatoBackup);
  const tablasDirectasRef = useRef<string[]>(tablasDirectas);
  const tablasSeleccionadasRef = useRef<string[]>(tablasSeleccionadasBackup);

  modoRef.current = modoBackup;
  formatoRef.current = formatoBackup;
  tablasDirectasRef.current = tablasDirectas;
  tablasSeleccionadasRef.current = tablasSeleccionadasBackup;

  const cargarTablasDirectas = async () => {
    setLoadingTablasDirectas(true);
    setErrorBackup(null);
    const res = await listarTablasDirectas();
    if (res.success) {
      setTablasDirectas(res.tablas);
      setTablasSeleccionadasBackup(res.tablas);
    } else {
      setErrorBackup(res.error);
      setTablasDirectas([]);
    }
    setLoadingTablasDirectas(false);
  };

  useEffect(() => {
    setHistorialBackups(loadHistorialBackups());
    if (typeof window !== 'undefined') {
      setAutoEnabled(localStorage.getItem(STORAGE_AUTO_ENABLED) === '1');
      const t = localStorage.getItem(STORAGE_AUTO_TIME);
      if (t) setAutoTime(t);
    }
    cargarTablasDirectas();
  }, []);

  const realizarBackup = useCallback(async (origen: 'manual' | 'programado' = 'manual') => {
    const modoActual = modoRef.current;
    const formatoActual = formatoRef.current;
    const tablasABackup = modoActual === 'completa' ? tablasDirectasRef.current : tablasSeleccionadasRef.current;
    if (tablasABackup.length === 0) {
      setErrorBackup('Carga las tablas primero o selecciona al menos una tabla.');
      return;
    }

    setRealizandoBackup(true);
    setErrorBackup(null);

    try {
      const fechaHoy = new Date().toISOString().slice(0, 10);
      let tamano = 0;

      if (formatoActual === 'sql') {
        let contenido = `-- Backup Miru-Franco\n-- Fecha: ${fechaHoy}\n\n`;
        for (const tabla of tablasABackup) {
          const res = await exportarDirecto(tabla, 'json');
          if (!res.success) {
            setErrorBackup(`Error al exportar ${tabla}: ${res.error}`);
            return;
          }
          const text = await res.blob.text();
          const rows = JSON.parse(text) as Record<string, unknown>[];
          contenido += `-- Tabla: ${tabla}\n`;
          contenido += buildSqlInsertsForTable(tabla, rows);
          contenido += '\n\n';
        }
        const blob = new Blob([contenido], { type: 'application/sql' });
        tamano = blob.size;
        await descargarArchivo(blob, `MiruFranco_Backup_${fechaHoy}.sql`);
      } else if (tablasABackup.length === 1) {
        const res = await exportarDirecto(tablasABackup[0], formatoActual);
        if (!res.success) {
          setErrorBackup(res.error);
          return;
        }
        tamano = res.blob.size;
        await descargarArchivo(res.blob, res.filename);
      } else {
        const zip = new JSZip();
        for (const tabla of tablasABackup) {
          const res = await exportarDirecto(tabla, formatoActual);
          if (!res.success) {
            setErrorBackup(`Error al exportar ${tabla}: ${res.error}`);
            return;
          }
          zip.file(res.filename, res.blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        tamano = zipBlob.size;
        await descargarArchivo(zipBlob, `backup-bd_${fechaHoy}.zip`);
      }

      const nuevoH: BackupEntry = {
        id: crypto.randomUUID(),
        fecha: new Date().toISOString(),
        modo: modoActual,
        origen,
        formato: formatoActual,
        estado: 'exitoso',
        mensaje: `Respaldo de ${tablasABackup.length} tabla(s).`,
        tablas: tablasABackup,
        tamaño: tamano,
      };
      setHistorialBackups((prev) => {
        const nuevoHistorial = [nuevoH, ...prev].slice(0, MAX_HISTORIAL_BACKUP);
        saveHistorialBackups(nuevoHistorial);
        return nuevoHistorial;
      });
    } catch (err) {
      setErrorBackup(err instanceof Error ? err.message : 'Error al generar backup.');
    } finally {
      setRealizandoBackup(false);
    }
  }, []);

  useEffect(() => {
    if (!autoEnabled) return;
    const interval = setInterval(() => {
      const now = new Date();
      const [h, m] = autoTime.split(':').map(Number);
      if (now.getHours() !== h || now.getMinutes() !== m) return;

      const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${h}`;
      const lastHour = localStorage.getItem(STORAGE_AUTO_LAST_HOUR);
      if (lastHour === hourKey) return;

      localStorage.setItem(STORAGE_AUTO_LAST_HOUR, hourKey);
      void realizarBackup('programado');
    }, 60000);
    return () => clearInterval(interval);
  }, [autoEnabled, autoTime, realizarBackup]);

  const toggleAutoBackup = () => {
    const next = !autoEnabled;
    setAutoEnabled(next);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_AUTO_ENABLED, next ? '1' : '0');
  };

  const updateAutoTime = (value: string) => {
    setAutoTime(value);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_AUTO_TIME, value);
  };

  return (
    <AdminLayout>
      <div className="relative space-y-6 overflow-hidden">
        <button
          type="button"
          aria-label="Mostrar menu"
          onMouseEnter={() => setMenuLateralOculto(false)}
          className="absolute left-0 top-6 z-40 h-10 w-8 rounded-r-lg border border-l-0 text-sm"
          style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'var(--fondo-general)', color: 'var(--menu-texto-principal)' }}
        >
          <Menu size={16} className="mx-auto" />
        </button>
        <div className="absolute top-0 left-0 h-full w-4 z-40" onMouseEnter={() => setMenuLateralOculto(false)} />

        {!menuLateralOculto && (
          <aside
            className="absolute top-0 left-0 h-full w-[280px] z-50 p-4 overflow-y-auto"
            style={{ backgroundColor: 'var(--fondo-general)', borderRight: '1px solid var(--encabezados-alterno)' }}
            onMouseEnter={() => setMenuLateralOculto(false)}
            onMouseLeave={() => setMenuLateralOculto(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Secciones</p>
              <button
                type="button"
                onClick={() => setMenuLateralOculto(true)}
                className="text-sm px-2 py-1 rounded border"
                style={{ borderColor: 'var(--encabezados-alterno)', color: 'var(--menu-texto-principal)' }}
              >
                <X size={14} className="mx-auto" />
              </button>
            </div>

            <div className="space-y-1">
              {[
                { href: '/admin/base-datos/operaciones/importar', label: 'Operaciones' },
                { href: '/admin/base-datos/Backup', label: 'Backup' },
                { href: '/admin/base-datos/monitoreo', label: 'Monitoreo' },
                { href: '/admin/base-datos/diagrama', label: 'Diagrama ER' },
                { href: '/admin/base-datos/consultar', label: 'Consultar datos' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuLateralOculto(true)}
                  className="block w-full text-left rounded px-3 py-2 text-sm no-underline"
                  style={{
                    backgroundColor: item.href === '/admin/base-datos/Backup' ? 'var(--hover)' : 'transparent',
                    color: 'var(--menu-texto-principal)',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </aside>
        )}

        <div className="space-y-6">
          <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
            <Save size={18} /> Gestion de Backups
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
            Genera respaldos completos o selectivos de la base de datos. Los archivos se descargan directamente en tu equipo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Modo de respaldo</label>
              <div className="flex gap-2">
                <Button size="sm" variant={modoBackup === 'completa' ? 'primary' : 'outline'} onClick={() => { setModoBackup('completa'); setTablasSeleccionadasBackup(tablasDirectas); }} className="flex-1">Completa</Button>
                <Button size="sm" variant={modoBackup === 'seleccionada' ? 'primary' : 'outline'} onClick={() => setModoBackup('seleccionada')} className="flex-1">Por tablas</Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Formato de salida</label>
              <Select
                options={[
                  { value: 'json', label: 'JSON (recomendado)' },
                  { value: 'sql', label: 'SQL' },
                  { value: 'csv', label: 'CSV (ZIP con un archivo por tabla)' },
                ]}
                value={formatoBackup}
                onChange={(e) => setFormatoBackup(e.target.value as FormatoBackup)}
              />
            </div>
          </div>

          {tablasDirectas.length === 0 && (
            <div className="mb-4">
              <Button type="button" variant="outline" onClick={cargarTablasDirectas} disabled={loadingTablasDirectas}>
                {loadingTablasDirectas ? 'Cargando tablas...' : 'Cargar tablas de la BD'}
              </Button>
            </div>
          )}

          {modoBackup === 'seleccionada' && tablasDirectas.length > 0 && (
            <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'var(--fondos-suaves)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  Tablas a incluir ({tablasSeleccionadasBackup.length}/{tablasDirectas.length})
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setTablasSeleccionadasBackup(tablasDirectas)}>Todas</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setTablasSeleccionadasBackup([])}>Ninguna</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {tablasDirectas.map((tabla) => (
                  <label
                    key={tabla}
                    className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer"
                    style={{ backgroundColor: 'var(--fondo-general)', borderColor: 'var(--encabezados-alterno)', color: 'var(--menu-texto-principal)' }}
                  >
                    <input
                      type="checkbox"
                      checked={tablasSeleccionadasBackup.includes(tabla)}
                      onChange={() => setTablasSeleccionadasBackup((prev) => (prev.includes(tabla) ? prev.filter((t) => t !== tabla) : [...prev, tabla]))}
                    />
                    <span className="font-mono text-xs">{tabla}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => void realizarBackup('manual')}
            disabled={realizandoBackup}
            className="flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:bg-white"
          >
            <Database size={24} className={realizandoBackup ? 'animate-spin' : ''} />
            <span className="text-[10px] font-bold mt-2">{realizandoBackup ? 'Generando backup...' : 'Generar backup'}</span>
          </button>

          {errorBackup && (
            <div className="mt-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ backgroundColor: 'rgba(89,12,12,0.12)', color: 'var(--danger)' }}>
              <ShieldAlert size={16} /> {errorBackup}
            </div>
          )}
          </Card>

          <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
            <Timer size={18} /> Automatizacion de Backups
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto-backup"
                checked={autoEnabled}
                onChange={toggleAutoBackup}
                className="w-4 h-4"
              />
              <label htmlFor="auto-backup" className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                Habilitar backup automatico por hora
              </label>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                Hora del backup (HH:MM)
              </label>
              <input
                type="time"
                value={autoTime}
                onChange={(e) => updateAutoTime(e.target.value)}
                className="w-full p-2 rounded border"
                style={{
                  borderColor: 'var(--encabezados-alterno)',
                  backgroundColor: 'var(--fondo-general)',
                  color: 'var(--menu-texto-principal)',
                }}
              />
            </div>
          </div>
          </Card>

          <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
            <Clock3 size={18} /> Historial de backups
          </h2>
          {historialBackups.length > 0 ? (
            <div className="space-y-3">
              {historialBackups.map((backup) => (
                <div
                  key={backup.id}
                  className="p-4 rounded-lg flex flex-wrap justify-between items-center gap-3"
                  style={{ borderLeft: `4px solid ${backup.estado === 'exitoso' ? 'var(--success)' : 'var(--danger)'}`, backgroundColor: 'var(--fondos-suaves)' }}
                >
                  <div>
                    <p className="font-semibold text-sm uppercase" style={{ color: 'var(--menu-texto-principal)' }}>
                      {backup.modo} · {backup.formato.toUpperCase()}
                      {backup.tablas && ` · ${backup.tablas.length} tablas`}
                      {backup.origen === 'programado' ? ' · programado' : ' · manual'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>
                      {new Date(backup.fecha).toLocaleString('es-MX')}
                      {backup.tamaño ? ` · ${(backup.tamaño / 1024).toFixed(1)} KB` : ''}
                    </p>
                    {backup.mensaje && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>{backup.mensaje}</p>
                    )}
                  </div>
                  <Badge variant={backup.estado === 'exitoso' ? 'success' : 'danger'}>{backup.estado}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              No hay registros de backups todavia.
            </p>
          )}

          <p className="text-xs mt-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Se conservan los ultimos {MAX_HISTORIAL_BACKUP} registros.
          </p>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}