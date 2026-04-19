'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import {
  importarDatos,
  descargarDiagrama,
  obtenerDiagrama,
  listarTablasDirectas,
  obtenerTablasImportables,
  exportarDirecto,
  obtenerColumnasDirectas,
  obtenerActividadDirecta,
  obtenerLocksDirectos,
  obtenerResumenBdDirecto,
  obtenerTableStatsDirecto,
  obtenerIndexStatsDirecto,
  obtenerRealtimeMetricsDirecto,
  obtenerQueryInsightsDirecto,
  truncarTabla,
  type ResultadoImportacion,
  type ModoImportacion,
  type TablaImportable,
  type ResultadoTruncate,
  type FormatoDiagrama,
  type OpcionesExportDirecto,
  type ActivityRowDirecta,
  type LockRowDirecta,
  type DbSummaryDirecta,
  type TableStatDirecta,
  type IndexStatDirecta,
  type RealtimeMetricsDirecta,
  type SlowQueryDirecta,
  type TopCostlyQueryDirecta,
} from '../../../services/database';
import { mermaidToSvg, svgToPngBlob } from '../../../utils/mermaidRender';
import { getToken } from '../../../utils/security';
import JSZip from 'jszip';
import { getProductosSinRedirigir, type Producto } from '../../../services/productos';
import { getUsuarios, getUsuarioById, type Usuario } from '../../../services/usuarios';
import { getServicios, type Servicio } from '../../../services/servicios';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import {
  Activity,
  ChartNoAxesColumn,
  CircleAlert,
  CircleCheck,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FolderKanban,
  GitCompareArrows,
  HardDrive,
  Layers,
  Lock,
  Network,
  Save,
  ShieldAlert,
  TableProperties,
  Table2,
  Trash2,
  Upload,
  Users,
  Menu,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';



// ─── Helpers de rol ────────────────────────────────────────────────────────────
const ROLES_PERSONAL = ['admin', 'estilista', 'empleado', 'becario'] as const;
function esRolPersonal(rol: string): boolean {
  const r = String(rol || '').toLowerCase().trim().replace('becado', 'becario');
  return ROLES_PERSONAL.includes(r as (typeof ROLES_PERSONAL)[number]);
}
function formatearRol(rol: string): string {
  const r = String(rol || '').toLowerCase().trim();
  if (r === 'becado') return 'Becado';
  if (r === 'admin') return 'Administrador';
  if (r === 'estilista') return 'Estilista';
  if (r === 'empleado') return 'Empleado';
  if (r === 'becario') return 'Becado';
  return rol || '—';
}


// ─── Constantes de formato / módulos ──────────────────────────────────────────
const FORMATOS_EXPORT = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
] as const;

const FORMATOS_DIAGRAMA: { value: FormatoDiagrama; label: string }[] = [
  { value: 'mermaid', label: 'Mermaid (.mmd)' },
  { value: 'svg', label: 'SVG' },
  { value: 'png', label: 'PNG' },
];

const MODULOS_CONSULTAR = [
  { id: 'inventario' as const, label: 'Inventario', description: 'Productos y stock' },
  { id: 'usuarios' as const, label: 'Usuarios y roles', description: 'Usuarios y permisos' },
  { id: 'servicios' as const, label: 'Servicios', description: 'Catálogo de servicios' },
  { id: 'clientes' as const, label: 'Clientes CRM', description: 'Clientes' },
];

const ENTIDAD_A_MODULO: Record<string, string> = {
  productos: 'inventario',
  usuario: 'usuarios',
  usuarios: 'usuarios',
  servicio: 'servicios',
  servicios: 'servicios',
  cliente: 'clientes',
  clientes: 'clientes',
};

const ACCESOS_INSERTAR = [
  { label: 'Nuevo producto', href: '/admin/productos/nuevo', description: 'Crear producto' },
  { label: 'Nuevo usuario', href: '/admin/usuarios-roles', description: 'Crear usuario (modal)' },
  { label: 'Nuevo servicio', href: '/admin/servicios', description: 'Crear servicio' },
  { label: 'Nuevo cliente', href: '/admin/clientes-crm', description: 'Gestionar clientes' },
];

const ACCESOS_ELIMINAR = [
  { label: 'Inventario', href: '/admin/inventario', description: 'Eliminar productos' },
  { label: 'Usuarios y roles', href: '/admin/usuarios-roles', description: 'Desactivar usuarios' },
  { label: 'Servicios', href: '/admin/servicios', description: 'Eliminar servicios' },
];

// ─── Storage: exportaciones ────────────────────────────────────────────────────
const STORAGE_KEY_HISTORIAL_EXPORT = 'base-datos-historial-exportaciones';
const STORAGE_KEY_ULTIMA_EXPORT_LEGACY = 'base-datos-ultima-exportacion';
const MAX_HISTORIAL = 50;

type EntradaHistorialExport = {
  id: string;
  fecha: string;
  tabla: string;
  formato: 'csv' | 'json';
  etiqueta: string;
  origen?: 'backend' | 'directo';
  opciones?: OpcionesExportDirecto;
};

function loadHistorialExportaciones(): EntradaHistorialExport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORIAL_EXPORT);
    if (raw) {
      const data = JSON.parse(raw) as EntradaHistorialExport[];
      if (Array.isArray(data)) return data.slice(0, MAX_HISTORIAL);
    }
    const legacy = localStorage.getItem(STORAGE_KEY_ULTIMA_EXPORT_LEGACY);
    if (legacy) {
      const one = JSON.parse(legacy) as { fecha?: string; tabla?: string; formato?: string; etiqueta?: string };
      if (one?.fecha && one?.tabla && one?.formato) {
        const entry: EntradaHistorialExport = {
          id: one.fecha,
          fecha: one.fecha,
          tabla: one.tabla,
          formato: one.formato as 'csv' | 'json',
          etiqueta: one.etiqueta ?? `${one.tabla} (${one.formato})`,
        };
        localStorage.removeItem(STORAGE_KEY_ULTIMA_EXPORT_LEGACY);
        saveHistorialExportaciones([entry]);
        return [entry];
      }
    }
  } catch { /* ignore */ }
  return [];
}

function saveHistorialExportaciones(historial: EntradaHistorialExport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORIAL_EXPORT, JSON.stringify(historial.slice(0, MAX_HISTORIAL)));
  } catch { /* ignore */ }
}

// ─── Storage: backups ──────────────────────────────────────────────────────────
const STORAGE_KEY_HISTORIAL_BACKUP = 'base-datos-historial-backups';
const MAX_HISTORIAL_BACKUP = 30;

type BackupEntry = {
  id: string;
  fecha: string;
  modo: 'completa' | 'seleccionada';
  formato: 'json' | 'sql' | 'csv';
  estado: 'exitoso' | 'fallido';
  mensaje?: string;
  tablas?: string[];
  tamaño?: number;
};

function loadHistorialBackups(): BackupEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORIAL_BACKUP);
    if (raw) {
      const data = JSON.parse(raw) as BackupEntry[];
      return Array.isArray(data) ? data.slice(0, MAX_HISTORIAL_BACKUP) : [];
    }
  } catch { return []; }
  return [];
}

function saveHistorialBackups(historial: BackupEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORIAL_BACKUP, JSON.stringify(historial.slice(0, MAX_HISTORIAL_BACKUP)));
  } catch { /* ignore */ }
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function BaseDatosPage() {
  const router = useRouter();
  const pathname = usePathname();
  // ── Importar ──
  const [tablaImport, setTablaImport] = useState('');
  const [archivoImport, setArchivoImport] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<ResultadoImportacion | null>(null);
  const [tablasImportablesMeta, setTablasImportablesMeta] = useState<TablaImportable[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Exportar ──
  const [tablaExport, setTablaExport] = useState('');
  const [formatoExport, setFormatoExport] = useState<'csv' | 'json'>('csv');
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);


  
  // ── Diagrama ──
  const [formatoDiagrama, setFormatoDiagrama] = useState<FormatoDiagrama>('mermaid');
  const [descargandoDiagrama, setDescargandoDiagrama] = useState(false);
  const [errorDiagrama, setErrorDiagrama] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);

  // ── Consultar ──
  const [moduloExpandido, setModuloExpandido] = useState<string | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [loadingModulo, setLoadingModulo] = useState<string | null>(null);
  const [errorModulo, setErrorModulo] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<{ modulo: string; id: string } | null>(null);

  // ── Historial exportaciones ──
  const [historialExportaciones, setHistorialExportaciones] = useState<EntradaHistorialExport[]>([]);
  const [diagramaMensaje, setDiagramaMensaje] = useState<string | null>(null);

  // ── Tablas directas ──
  const [tablasDirectas, setTablasDirectas] = useState<string[]>([]);
  const [loadingTablasDirectas, setLoadingTablasDirectas] = useState(false);

  // ── Export con opciones ──
  const [columnasTabla, setColumnasTabla] = useState<string[]>([]);
  const [columnasSeleccionadas, setColumnasSeleccionadas] = useState<string[]>([]);
  const [loadingColumnas, setLoadingColumnas] = useState(false);
  const [exportFechaDesde, setExportFechaDesde] = useState('');
  const [exportFechaHasta, setExportFechaHasta] = useState('');
  const [exportSoloActivos, setExportSoloActivos] = useState(false);

  // ── Stats rápidas (ocultas en UI) ──
  const [statsProductos, setStatsProductos] = useState<number | null>(null);
  const [statsUsuarios, setStatsUsuarios] = useState<number | null>(null);
  const [statsClientes, setStatsClientes] = useState<number | null>(null);
  const [statsServicios, setStatsServicios] = useState<number | null>(null);

  // ── Monitoreo ──
  const [loadingRendimiento, setLoadingRendimiento] = useState(false);
  const [errorRendimiento, setErrorRendimiento] = useState<string | null>(null);
  const [actividadRows, setActividadRows] = useState<ActivityRowDirecta[]>([]);
  const [locksRows, setLocksRows] = useState<LockRowDirecta[]>([]);
  const [dbSummary, setDbSummary] = useState<DbSummaryDirecta | null>(null);
  const [tableStats, setTableStats] = useState<TableStatDirecta[]>([]);
  const [indexStats, setIndexStats] = useState<IndexStatDirecta[]>([]);
  const [realtimeSeries, setRealtimeSeries] = useState<RealtimeMetricsDirecta[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQueryDirecta[]>([]);
  const [topCostlyQueries, setTopCostlyQueries] = useState<TopCostlyQueryDirecta[]>([]);
  const [pgStatStatementsEnabled, setPgStatStatementsEnabled] = useState(true);
  const [vistaTablasMonitoreo, setVistaTablasMonitoreo] = useState<'tabla' | 'grafica'>('tabla');
  const [vistaIndicesMonitoreo, setVistaIndicesMonitoreo] = useState<'tabla' | 'grafica'>('tabla');

  // ── Navegación ──
  const [vistaPrincipal, setVistaPrincipal] = useState<
    'operaciones' | 'monitoreo' | 'diagrama' | 'consultar' | 'backup'
  >('operaciones');
  const [vistaOperaciones, setVistaOperaciones] = useState<'importar' | 'exportar' | 'truncate'>('importar');
  const [vistaMonitoreo, setVistaMonitoreo] = useState<
    'resumen' | 'tablas' | 'indices' | 'actividad' | 'locks'
  >('resumen');
  const [menuLateralOculto, setMenuLateralOculto] = useState(true);
  const [ultimaActualizacionMonitoreo, setUltimaActualizacionMonitoreo] = useState<Date | null>(null);

  // ── Backup ──
  const [historialBackups, setHistorialBackups] = useState<BackupEntry[]>([]);
  const [realizandoBackup, setRealizandoBackup] = useState(false);
  const [errorBackup, setErrorBackup] = useState<string | null>(null);
  const [modoBackup, setModoBackup] = useState<'completa' | 'seleccionada'>('completa');
  const [formatoBackup, setFormatoBackup] = useState<'json' | 'sql' | 'csv'>('json');
  const [tablasSeleccionadasBackup, setTablasSeleccionadasBackup] = useState<string[]>([]);
  const [tablaTruncate, setTablaTruncate] = useState('');
  const [truncateRestartIdentity, setTruncateRestartIdentity] = useState(true);
  const [truncateCascade, setTruncateCascade] = useState(false);
  const [truncateConfirmText, setTruncateConfirmText] = useState('');
  const [truncandoTabla, setTruncandoTabla] = useState(false);
  const [resultadoTruncate, setResultadoTruncate] = useState<ResultadoTruncate | null>(null);

  const navegarVistaPrincipal = (vista: 'operaciones' | 'monitoreo' | 'diagrama' | 'consultar' | 'backup') => {
    if (vista === 'operaciones') {
      router.push(`/admin/base-datos/operaciones/${vistaOperaciones}`);
      return;
    }
    if (vista === 'monitoreo') {
      const sub = vistaMonitoreo === 'resumen' ? '' : `/${vistaMonitoreo}`;
      router.push(`/admin/base-datos/monitoreo${sub}`);
      return;
    }
    if (vista === 'backup') {
      router.push('/admin/base-datos/backup');
      return;
    }
    setVistaPrincipal(vista);
  };

  const navegarVistaOperaciones = (vista: 'importar' | 'exportar' | 'truncate') => {
    setVistaOperaciones(vista);
    setVistaPrincipal('operaciones');
    router.push(`/admin/base-datos/operaciones/${vista}`);
  };

  const navegarVistaMonitoreo = (vista: 'resumen' | 'tablas' | 'indices' | 'actividad' | 'locks') => {
    setVistaMonitoreo(vista);
    setVistaPrincipal('monitoreo');
    const sub = vista === 'resumen' ? '' : `/${vista}`;
    router.push(`/admin/base-datos/monitoreo${sub}`);
  };



  // ── Refs ──
  const refConsultarSection = useRef<HTMLDivElement>(null);
  const diagramaMensajeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Efectos iniciales ────────────────────────────────────────────────────────
  React.useEffect(() => {
    setHistorialExportaciones(loadHistorialExportaciones());
    setHistorialBackups(loadHistorialBackups());
  }, []);

  React.useEffect(() => {
    return () => {
      if (diagramaMensajeTimeoutRef.current) clearTimeout(diagramaMensajeTimeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    const base = '/admin/base-datos';
    if (!pathname?.startsWith(base)) return;
    const sub = pathname.slice(base.length);

    if (sub === '' || sub === '/') {
      setVistaPrincipal('operaciones');
      setVistaOperaciones('importar');
      return;
    }
    if (sub.startsWith('/operaciones')) {
      setVistaPrincipal('operaciones');
      if (sub.includes('/truncate')) setVistaOperaciones('truncate');
      else setVistaOperaciones(sub.includes('/exportar') ? 'exportar' : 'importar');
      return;
    }
    if (sub.startsWith('/monitoreo')) {
      setVistaPrincipal('monitoreo');
      if (sub.includes('/tablas')) setVistaMonitoreo('tablas');
      else if (sub.includes('/indices')) setVistaMonitoreo('indices');
      else setVistaMonitoreo('resumen');
      return;
    }
    if (sub.startsWith('/diagrama')) {
      setVistaPrincipal('diagrama');
      return;
    }
    if (sub.startsWith('/consultar')) {
      setVistaPrincipal('consultar');
      return;
    }
    if (sub.startsWith('/backup') || sub.startsWith('/Backup')) {
      setVistaPrincipal('backup');
    }
  }, [pathname]);

  React.useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const [productosRes, usuariosRes, serviciosRes] = await Promise.all([
          getProductosSinRedirigir({ incluirNoDisponibles: true }),
          getUsuarios(),
          getServicios(),
        ]);
        if (cancelled) return;
        setStatsProductos(productosRes.data.length);
        const enriched = await Promise.all(
          usuariosRes.map((u) => getUsuarioById(u.id).catch(() => u))
        );
        if (cancelled) return;
        setStatsUsuarios(enriched.filter((u) => esRolPersonal(u.rol)).length);
        setStatsClientes(enriched.filter((u) => String(u.rol || '').toLowerCase() === 'cliente').length);
        setStatsServicios(serviciosRes.data.length);
      } catch { /* silencioso */ }
    };
    loadStats();
    return () => { cancelled = true; };
  }, []);

  // Cargar columnas al elegir una tabla de exportación
  React.useEffect(() => {
    if (!tablaExport || tablaExport === '__todas__') {
      setColumnasTabla([]);
      setColumnasSeleccionadas([]);
      return;
    }
    let cancelled = false;
    setLoadingColumnas(true);
    obtenerColumnasDirectas(tablaExport).then((res) => {
      if (cancelled) return;
      setLoadingColumnas(false);
      if (res.success && res.columnas.length) {
        setColumnasTabla(res.columnas);
        setColumnasSeleccionadas(res.columnas);
      } else {
        setColumnasTabla([]);
        setColumnasSeleccionadas([]);
      }
    });
    return () => { cancelled = true; };
  }, [tablaExport]);

  // Monitoreo en tiempo real
  React.useEffect(() => {
    cargarDashboardMonitoreo();
    const id = setInterval(() => { cargarDashboardMonitoreo(); }, 10000);
    return () => clearInterval(id);
  }, []);

  // Cleanup preview URL
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const toggleFila = (modulo: string, id: string) => {
    setExpandedRow((prev) =>
      prev?.modulo === modulo && prev?.id === id ? null : { modulo, id }
    );
  };

  // --- Funciones de Utilidad de Archivos ---
  const guardarArchivo = async (blob: Blob, filename: string): Promise<boolean> => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  };

  const escribirUnArchivoEnCarpeta = async (
    dirHandle: FileSystemDirectoryHandle,
    filename: string,
    blob: Blob
  ): Promise<void> => {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
};

// --- Actualización de la lógica en el componente ---
// Dentro de ejecutarBackup, ahora puedes usar:
// const exito = await guardarArchivo(finalBlob, finalFileName);
  // ─── Export directo ───────────────────────────────────────────────────────────
  const runExport = async (
    tabla: string,
    formato: 'csv' | 'json',
    tablasDirectasOverride?: string[],
    dirHandle?: FileSystemDirectoryHandle | null,
    opciones?: OpcionesExportDirecto
  ): Promise<boolean> => {
    setErrorExport(null);
    try {
      const list = tabla === '__todas__' ? (tablasDirectasOverride ?? tablasDirectas) : [tabla];
      if (list.length === 0) {
        setErrorExport('Carga las tablas primero o elige una tabla.');
        return false;
      }
      const nombreSubcarpeta = `backup-bd_${new Date().toISOString().slice(0, 10)}`;
      const archivos: Array<{ filename: string; blob: Blob }> = [];
      let carpetaFallida = false;
      let subCarpeta: FileSystemDirectoryHandle | null = null;
      const usarOpciones = list.length === 1 && opciones;
      for (const t of list) {
        const res = await exportarDirecto(t, formato, usarOpciones ? opciones : undefined);
        if (!res.success) {
          setErrorExport(`Error en ${t}: ${res.error}`);
          return false;
        }
        if (dirHandle && !carpetaFallida) {
          try {
            if (!subCarpeta)
              subCarpeta = await dirHandle.getDirectoryHandle(nombreSubcarpeta, { create: true });
            await escribirUnArchivoEnCarpeta(subCarpeta, res.filename, res.blob);
          } catch {
            carpetaFallida = true;
            archivos.push({ filename: res.filename, blob: res.blob });
          }
        } else {
          archivos.push({ filename: res.filename, blob: res.blob });
        }
      }
      if (archivos.length > 1) {
        const zip = new JSZip();
        for (const { filename, blob } of archivos) zip.file(filename, blob);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        await guardarArchivo(zipBlob, `backup-bd_${new Date().toISOString().slice(0, 10)}.zip`);
      } else if (archivos.length === 1) {
        await guardarArchivo(archivos[0].blob, archivos[0].filename);
      }
      return true;
    } catch (err) {
      setErrorExport(err instanceof Error ? err.message : 'Error al exportar');
      return false;
    }
  };

  const handleImportar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tablaImport) { setResultadoImport({ success: false, error: 'Selecciona una tabla de destino' }); return; }
    if (!archivoImport) { setResultadoImport({ success: false, error: 'Selecciona un archivo CSV o JSON' }); return; }
    const ext = archivoImport.name.toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'json') { setResultadoImport({ success: false, error: 'El archivo debe ser CSV o JSON' }); return; }
    setImportando(true);
    setResultadoImport(null);
    if (tablaImport === '__todas__') {
      if (ext !== 'json') {
        setResultadoImport({ success: false, error: 'Para importar toda la base debes usar un JSON multi-tabla.' });
        setImportando(false);
        return;
      }
      try {
        const raw = await archivoImport.text();
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
          setResultadoImport({ success: false, error: 'JSON inválido. Debe ser un objeto con tablas como propiedades.' });
          setImportando(false);
          return;
        }
        const tablasDestino = (tablasImportablesMeta.length > 0
          ? tablasImportablesMeta.map((t) => t.tabla)
          : tablasDirectas
        ).filter((t) => Array.isArray((parsed as Record<string, unknown>)[t]));

        if (tablasDestino.length === 0) {
          setResultadoImport({ success: false, error: 'El JSON no contiene datos para tablas importables.' });
          setImportando(false);
          return;
        }

        let importadosTotal = 0;
        let fallidosTotal = 0;
        let actualizadosTotal = 0;
        let omitidosTotal = 0;
        const erroresTotal: Array<{ fila: number; mensaje: string }> = [];
        const modoPorTabla = (tabla: string): ModoImportacion => {
          const meta = tablasImportablesMeta.find((t) => t.tabla === tabla);
          const permitidos = meta?.modosPermitidos ?? [];
          if (permitidos.includes('missing_only')) return 'missing_only';
          if (permitidos.includes('upsert')) return 'upsert';
          if (permitidos.includes('append')) return 'append';
          return 'append';
        };

        for (const tabla of tablasDestino) {
          const rows = (parsed as Record<string, unknown[]>)[tabla];
          const blob = new Blob([JSON.stringify(rows ?? [])], { type: 'application/json' });
          const fileTabla = new File([blob], `${tabla}.json`, { type: 'application/json' });
          const resTabla = await importarDatos(tabla, fileTabla, modoPorTabla(tabla));
          if (resTabla.success) {
            importadosTotal += resTabla.importados;
            fallidosTotal += resTabla.fallidos ?? 0;
            actualizadosTotal += resTabla.actualizados ?? 0;
            omitidosTotal += resTabla.omitidos ?? 0;
            (resTabla.errores ?? []).forEach((err) => {
              erroresTotal.push({ fila: err.fila, mensaje: `[${tabla}] ${err.mensaje}` });
            });
          } else {
            fallidosTotal += 1;
            erroresTotal.push({ fila: 0, mensaje: `[${tabla}] ${resTabla.error}` });
          }
        }

        const success = importadosTotal > 0 || actualizadosTotal > 0 || omitidosTotal > 0;
        setResultadoImport(
          success
            ? {
              success: true,
              importados: importadosTotal,
              fallidos: fallidosTotal,
              actualizados: actualizadosTotal,
              omitidos: omitidosTotal,
              errores: erroresTotal,
            }
            : { success: false, error: erroresTotal[0]?.mensaje ?? 'No se pudo importar ninguna tabla del archivo.' }
        );
      } catch (err) {
        setResultadoImport({ success: false, error: err instanceof Error ? err.message : 'Error al procesar el archivo JSON.' });
      }
      setImportando(false);
      return;
    }

    const res = await importarDatos(tablaImport, archivoImport);
    setResultadoImport(res);
    setImportando(false);
    if (res.success) {
      setArchivoImport(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tablaExport) { setErrorExport('Carga las tablas y elige una opción.'); return; }
    const tieneOpciones =
      tablaExport !== '__todas__' &&
      (columnasSeleccionadas.length < columnasTabla.length ||
        !!exportFechaDesde || !!exportFechaHasta || exportSoloActivos);
    const opciones: OpcionesExportDirecto | undefined = tieneOpciones ? {
      ...(columnasSeleccionadas.length < columnasTabla.length ? { columnas: columnasSeleccionadas } : {}),
      ...(exportFechaDesde ? { fechaDesde: exportFechaDesde } : {}),
      ...(exportFechaHasta ? { fechaHasta: exportFechaHasta } : {}),
      ...(exportSoloActivos ? { soloActivos: true } : {}),
    } : undefined;
    setExportando(true);
    const ok = await runExport(tablaExport, formatoExport, undefined, undefined, opciones);
    if (ok) {
      const etiqueta = tablaExport === '__todas__' ? 'Todas las tablas' : tablaExport;
      const nuevaEntrada: EntradaHistorialExport = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        fecha: new Date().toISOString(),
        tabla: tablaExport,
        formato: formatoExport,
        etiqueta: `${etiqueta} (${formatoExport.toUpperCase()})`,
        origen: 'directo',
        ...(opciones && Object.keys(opciones).length > 0 ? { opciones } : {}),
      };
      const nuevoHistorial = [nuevaEntrada, ...historialExportaciones];
      saveHistorialExportaciones(nuevoHistorial);
      setHistorialExportaciones(nuevoHistorial);
    }
    setExportando(false);
  };

  const handleDescargarDeNuevo = async (entrada: EntradaHistorialExport) => {
    setExportando(true);
    if (entrada.tabla === '__todas__') {
      const res = await listarTablasDirectas();
      const list = res.success ? res.tablas : [];
      if (list.length === 0) {
        setErrorExport('No se pudo cargar la lista de tablas para repetir la exportación.');
        setExportando(false);
        return;
      }
      await runExport('__todas__', entrada.formato, list, undefined, undefined);
    } else {
      await runExport(entrada.tabla, entrada.formato, undefined, undefined, entrada.opciones);
    }
    setExportando(false);
  };

  const handleTruncateTabla = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultadoTruncate(null);
    if (!tablaTruncate) {
      setResultadoTruncate({ success: false, error: 'Selecciona una tabla.' });
      return;
    }
    const confirmEsperado = `TRUNCATE ${tablaTruncate}`;
    if (truncateConfirmText.trim() !== confirmEsperado) {
      setResultadoTruncate({ success: false, error: `Escribe exactamente: ${confirmEsperado}` });
      return;
    }
    setTruncandoTabla(true);
    const res = await truncarTabla(tablaTruncate, {
      restartIdentity: truncateRestartIdentity,
      cascade: truncateCascade,
    });
    setResultadoTruncate(res);
    setTruncandoTabla(false);
    if (res.success) setTruncateConfirmText('');
  };

  const cargarTablasDirectas = async () => {
    setLoadingTablasDirectas(true);
    setErrorExport(null);
    const [resTablas, resImportables] = await Promise.all([
      listarTablasDirectas(),
      obtenerTablasImportables(),
    ]);

    if (resTablas.success) {
      setTablasDirectas(resTablas.tablas);
      setTablaExport(resTablas.tablas.length ? '__todas__' : '');

      if (resImportables.success) {
        setTablasImportablesMeta(resImportables.tablas);
        const importables = resImportables.tablas.map((t) => t.tabla);
        setTablaImport((prev) => (prev || importables.length === 0 ? prev : importables[0]));
      } else {
        setTablasImportablesMeta([]);
        setTablaImport((prev) => (prev || !resTablas.tablas.length ? prev : resTablas.tablas[0]));
      }

      // Pre-seleccionar todas para backup
      setTablasSeleccionadasBackup(resTablas.tablas);
    } else {
      setErrorExport(resTablas.error);
      setTablasDirectas([]);
      setTablaExport('');
      setTablaImport('');
      setTablasImportablesMeta([]);
    }
    setLoadingTablasDirectas(false);
  };


  
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

  const sqlIdentifier = (name: string) => `"${name.replace(/"/g, '""')}"`;

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

  const fetchTablaJson = async (tabla: string): Promise<{ success: true; rows: Record<string, unknown>[]; filename: string } | { success: false; error: string }> => {
    const token = getToken();
    if (!token) {
      return { success: false, error: 'Debes iniciar sesión' };
    }
    try {
      const params = new URLSearchParams({ tabla, formato: 'json' });
      const res = await fetch(`/api/db/export-direct?${params.toString()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: (data.error as string) ?? `Error ${res.status}` };
      }
      const rows = (await res.json()) as Record<string, unknown>[];
      const filename = `${tabla}_${new Date().toISOString().slice(0, 10)}.json`;
      return { success: true, rows, filename };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al obtener datos JSON' };
    }
  };

  const realizarBackup = async () => {
    const tablasABackup = modoBackup === 'completa' ? tablasDirectas : tablasSeleccionadasBackup;

    if (tablasABackup.length === 0) {
      setErrorBackup('Carga las tablas primero.');
      return;
    }

    setRealizandoBackup(true);
    setErrorBackup(null);

    try {
      const fechaHoy = new Date().toISOString().slice(0, 10);
      if (formatoBackup === 'sql') {
        let contenido = `-- Backup Miru-Franco\n-- Fecha: ${fechaHoy}\n\n`;
        for (const tabla of tablasABackup) {
          const res = await fetchTablaJson(tabla);
          if (!res.success) {
            setErrorBackup(`Error al exportar ${tabla}: ${res.error}`);
            return;
          }
          contenido += `-- Tabla: ${tabla}\n`;
          contenido += buildSqlInsertsForTable(tabla, res.rows);
          contenido += '\n\n';
        }
        const blob = new Blob([contenido], { type: 'application/sql' });
        const filename = `MiruFranco_Backup_${fechaHoy}.sql`;
        await guardarArchivo(blob, filename);

        const nuevoH: BackupEntry = {
          id: crypto.randomUUID(),
          fecha: new Date().toISOString(),
          modo: modoBackup,
          formato: formatoBackup,
          estado: 'exitoso',
          mensaje: `Respaldo de ${tablasABackup.length} tabla(s).`,
          tamaño: blob.size,
          tablas: tablasABackup,
        };
        const nuevoHistorial = [nuevoH, ...historialBackups].slice(0, MAX_HISTORIAL_BACKUP);
        saveHistorialBackups(nuevoHistorial);
        setHistorialBackups(nuevoHistorial);
      } else {
        const soloUnaTabla = tablasABackup.length === 1;
        const objetivo = soloUnaTabla ? tablasABackup[0] : '__todas__';
        const ok = await runExport(objetivo, formatoBackup, soloUnaTabla ? undefined : tablasABackup, undefined, undefined);
        if (!ok) {
          setErrorBackup(errorExport || 'Error al generar backup');
          return;
        }

        const nuevoH: BackupEntry = {
          id: crypto.randomUUID(),
          fecha: new Date().toISOString(),
          modo: modoBackup,
          formato: formatoBackup,
          estado: 'exitoso',
          mensaje: `Respaldo de ${tablasABackup.length} tabla(s).`,
          tablas: tablasABackup,
        };
        const nuevoHistorial = [nuevoH, ...historialBackups].slice(0, MAX_HISTORIAL_BACKUP);
        saveHistorialBackups(nuevoHistorial);
        setHistorialBackups(nuevoHistorial);
      }
    } catch (err) {
      setErrorBackup(err instanceof Error ? err.message : 'Error al generar el archivo.');
    } finally {
      setRealizandoBackup(false);
    }
  };
  // ─── Monitoreo ────────────────────────────────────────────────────────────────
  const cargarLocksBd = async () => {
    setLoadingRendimiento(true);
    setErrorRendimiento(null);
    const res = await obtenerLocksDirectos();
    if (res.success) setLocksRows(res.rows);
    else setErrorRendimiento(res.error);
    setLoadingRendimiento(false);
  };

  const cargarDashboardMonitoreo = async () => {
    setLoadingRendimiento(true);
    setErrorRendimiento(null);
    const [summaryRes, activityRes, locksRes, tableStatsRes, indexStatsRes, realtimeRes, insightsRes] =
      await Promise.all([
        obtenerResumenBdDirecto(),
        obtenerActividadDirecta(),
        obtenerLocksDirectos(),
        obtenerTableStatsDirecto(),
        obtenerIndexStatsDirecto(),
        obtenerRealtimeMetricsDirecto(),
        obtenerQueryInsightsDirecto(),
      ]);
    if (summaryRes.success) setDbSummary(summaryRes.data);
    if (activityRes.success) setActividadRows(activityRes.rows);
    if (locksRes.success) setLocksRows(locksRes.rows);
    if (tableStatsRes.success) setTableStats(tableStatsRes.rows);
    if (indexStatsRes.success) setIndexStats(indexStatsRes.rows);
    if (realtimeRes.success) setRealtimeSeries((prev) => [...prev, realtimeRes.data].slice(-36));
    if (insightsRes.success) {
      setSlowQueries(insightsRes.slowQueries);
      setTopCostlyQueries(insightsRes.topCostlyQueries);
      setPgStatStatementsEnabled(insightsRes.pgStatStatementsEnabled);
    }
    const error =
      (!summaryRes.success && summaryRes.error) ||
      (!activityRes.success && activityRes.error) ||
      (!locksRes.success && locksRes.error) ||
      (!tableStatsRes.success && tableStatsRes.error) ||
      (!indexStatsRes.success && indexStatsRes.error) ||
      (!realtimeRes.success && realtimeRes.error) ||
      (!insightsRes.success && insightsRes.error) ||
      null;
    setErrorRendimiento(error);
    if (!error) setUltimaActualizacionMonitoreo(new Date());
    setLoadingRendimiento(false);
  };

  // ─── Diagrama ─────────────────────────────────────────────────────────────────
  const handleDescargarDiagrama = async (e: React.FormEvent) => {
    e.preventDefault();
    setDescargandoDiagrama(true);
    setErrorDiagrama(null);
    try {
      if (formatoDiagrama === 'mermaid') {
        const res = await descargarDiagrama('mermaid');
        if (res.success) {
          const url = URL.createObjectURL(res.blob);
          const a = document.createElement('a'); a.href = url; a.download = res.filename; a.click();
          URL.revokeObjectURL(url);
        } else { setErrorDiagrama(res.error); }
      } else {
        const res = await obtenerDiagrama('mermaid');
        if (!res.success) { setErrorDiagrama(res.error); return; }
        const mermaidCode = await res.blob.text();
        const svg = await mermaidToSvg(mermaidCode);
        let blob: Blob; let filename: string;
        if (formatoDiagrama === 'svg') {
          blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          filename = `diagrama-er_${new Date().toISOString().slice(0, 10)}.svg`;
        } else {
          blob = await svgToPngBlob(svg);
          filename = `diagrama-er_${new Date().toISOString().slice(0, 10)}.png`;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { setErrorDiagrama(err instanceof Error ? err.message : 'Error al generar el diagrama'); }
    setDescargandoDiagrama(false);
  };

  const handleVistaPrevia = async () => {
    setCargandoPreview(true);
    setErrorDiagrama(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setPreviewSvg(null);
    try {
      const res = await obtenerDiagrama('mermaid');
      if (!res.success) { setErrorDiagrama(res.error); return; }
      const mermaidCode = await res.blob.text();
      const svg = await mermaidToSvg(mermaidCode);
      if (formatoDiagrama === 'png') {
        const blob = await svgToPngBlob(svg);
        setPreviewUrl(URL.createObjectURL(blob));
      } else { setPreviewSvg(svg); }
    } catch (err) { setErrorDiagrama(err instanceof Error ? err.message : 'Error al generar la vista previa'); }
    setCargandoPreview(false);
  };

  const extraerEntidadDelNodo = (el: EventTarget | null): string | null => {
    if (!el || !(el instanceof Element)) return null;
    let current: Element | null = el as Element;
    const entidades = Object.keys(ENTIDAD_A_MODULO).sort((a, b) => b.length - a.length);
    while (current) {
      const id = (current.getAttribute?.('id') ?? '').toLowerCase();
      for (const e of entidades) { if (id.includes(e)) return e; }
      const rawText = (current.textContent ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
      for (const e of entidades) {
        if (rawText === e || rawText.startsWith(e + ' ') || rawText.endsWith(' ' + e) || rawText.startsWith(e + '{'))
          return e;
      }
      current = current.parentElement;
    }
    return null;
  };

  const handleDiagramaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewSvg) return;
    const entidad = extraerEntidadDelNodo(e.target);
    if (!entidad) return;
    const moduloId = ENTIDAD_A_MODULO[entidad];
    if (!moduloId || !MODULOS_CONSULTAR.some((m) => m.id === moduloId)) return;
    setVistaPrincipal('consultar');
    refConsultarSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setModuloExpandido(moduloId);
    cargarModulo(moduloId);
    const label = MODULOS_CONSULTAR.find((m) => m.id === moduloId)?.label ?? entidad;
    setDiagramaMensaje(`Mostrando: ${label}`);
    if (diagramaMensajeTimeoutRef.current) clearTimeout(diagramaMensajeTimeoutRef.current);
    diagramaMensajeTimeoutRef.current = setTimeout(() => { setDiagramaMensaje(null); diagramaMensajeTimeoutRef.current = null; }, 3000);
  };

  // ─── Consultar ────────────────────────────────────────────────────────────────
  const cargarModulo = async (id: string) => {
    setLoadingModulo(id);
    setErrorModulo(null);
    try {
      if (id === 'inventario') {
        const res = await getProductosSinRedirigir({ incluirNoDisponibles: true });
        setProductos(res.data);
        if (res.error) setErrorModulo(res.error);
      } else if (id === 'usuarios') {
        const data = await getUsuarios();
        const enriched = await Promise.all(data.map((u) => getUsuarioById(u.id).catch(() => u)));
        setUsuarios(enriched.filter((u) => esRolPersonal(u.rol)));
      } else if (id === 'servicios') {
        const res = await getServicios();
        setServicios(res.data);
        if (res.error) setErrorModulo(res.error);
      } else if (id === 'clientes') {
        const todos = await getUsuarios();
        setClientes(todos.filter((u) => String(u.rol || '').toLowerCase() === 'cliente'));
      }
    } catch (err) {
      setErrorModulo(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoadingModulo(null);
    }
  };

  const toggleModulo = (id: string) => {
    const nuevo = moduloExpandido === id ? null : id;
    setModuloExpandido(nuevo);
    setExpandedRow(null);
    if (nuevo) cargarModulo(nuevo);
  };

  // ─── Métricas derivadas ───────────────────────────────────────────────────────
  const tienePreview = previewUrl || previewSvg;
  const locksPendientes = locksRows.filter((l) => !l.granted).length;
  const tablasConDead = tableStats.filter((t) => Number(t.n_dead_tup || 0) > 10).length;
  const indicesBajos = indexStats.filter((i) => Number(i.eficiencia || 0) < 40).length;
  const saludGeneral = Math.max(
    0,
    100 -
      Math.min(60, tableStats.reduce((acc, t) => acc + Number(t.n_dead_tup || 0), 0) > 0 ? 20 : 0) -
      Math.min(20, locksPendientes * 5)
  );
  const actividadPorEstado = actividadRows.reduce<Record<string, number>>((acc, row) => {
    const state = String(row.state || 'unknown');
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
  const totalActividad = Math.max(1, actividadRows.length);
  const locksPorModo = locksRows.reduce<Record<string, number>>((acc, row) => {
    const mode = String(row.mode || 'unknown');
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {});
  const maxDeadTuples = Math.max(1, ...tableStats.map((t) => Number(t.n_dead_tup || 0)));
  const conexionesActivasActual = dbSummary?.conexionesActivas ?? actividadRows.filter((r) => r.state === 'active').length;
  const totalConexionesActual = Math.max(1, dbSummary?.totalConexiones ?? actividadRows.length);
  const usoConexionesPct = (conexionesActivasActual / totalConexionesActual) * 100;
  const rendimientoTiempoReal = Math.max(
    0,
    100 - Math.min(35, locksPendientes * 8) - Math.min(25, indicesBajos * 5) - (usoConexionesPct > 85 ? 10 : 0)
  );
  const estadoSistema =
    saludGeneral >= 85 && rendimientoTiempoReal >= 85 ? 'Optimo' :
    saludGeneral >= 65 && rendimientoTiempoReal >= 65 ? 'Atencion' : 'Critico';
  const estadoSistemaColor =
    estadoSistema === 'Optimo' ? 'var(--success)' :
    estadoSistema === 'Atencion' ? 'var(--warning)' : 'var(--danger)';
  const formateador = new Intl.NumberFormat('es-MX');
  const uptimeTotal = Number(dbSummary?.uptimeSeconds ?? 0);
  const uptimeDias = Math.floor(uptimeTotal / 86400);
  const uptimeHoras = Math.floor((uptimeTotal % 86400) / 3600);
  const uptimeMin = Math.floor((uptimeTotal % 3600) / 60);
  const uptimeLabel = `${uptimeDias}d ${uptimeHoras}h ${uptimeMin}m`;
  const latestRealtime = realtimeSeries[realtimeSeries.length - 1] ?? null;
  const chartHeight = 90;
  const chartWidth = 100;
  const qpsSeries = realtimeSeries.map((p) => p.qps);
  const connSeries = realtimeSeries.map((p) => p.activeConnections);
  const respSeries = realtimeSeries.map((p) => p.avgResponseMs);
  const maxQps = Math.max(1, ...qpsSeries);
  const maxRespMs = Math.max(1, ...respSeries);
  const buildLineFromSeries = (values: number[]) => {
    const max = Math.max(1, ...values);
    return values.map((v, i) => {
      const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * chartWidth;
      const y = chartHeight - (v / max) * chartHeight;
      return `${x.toFixed(2)},${Math.max(0, Math.min(chartHeight, y)).toFixed(2)}`;
    }).join(' ');
  };
  const tabsMonitoreo = [
    { id: 'resumen' as const, label: 'Monitoreo y rendimiento', icon: Database, hint: 'Estado global' },
    { id: 'tablas' as const, label: 'Tablas', icon: Table2, hint: 'Salud de tablas' },
    { id: 'indices' as const, label: 'Índices', icon: ChartNoAxesColumn, hint: 'Eficiencia' },
  ];
  const tabMonitoreoActual = tabsMonitoreo.find((t) => t.id === vistaMonitoreo);
  const totalIndices = Math.max(1, indexStats.length);
  const indicesOptimos = indexStats.filter((i) => Number(i.eficiencia || 0) >= 80).length;
  const indicesMedios = indexStats.filter((i) => Number(i.eficiencia || 0) >= 40 && Number(i.eficiencia || 0) < 80).length;
  const indicesBajosCount = indexStats.filter((i) => Number(i.eficiencia || 0) < 40).length;

  // ─── Sub-componentes ──────────────────────────────────────────────────────────
  const DonutKpi = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const safeMax = Math.max(1, max);
    const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const dash = (pct / 100) * circumference;
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--fondos-suaves)" strokeWidth="5" />
        <circle cx="22" cy="22" r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`} transform="rotate(-90 22 22)" />
      </svg>
    );
  };

  const DonutCategoria = ({ title, value, color }: { title: string; value: number; color: string }) => {
    const radius = 24; const size = 60;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.max(0, Math.min(100, (value / totalIndices) * 100));
    const dash = (pct / 100) * circumference;
    return (
      <div className="flex items-center gap-3">
        <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden>
          <circle cx="30" cy="30" r={radius} fill="none" stroke="var(--fondos-suaves)" strokeWidth="7" />
          <circle cx="30" cy="30" r={radius} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`} transform="rotate(-90 30 30)" />
          <text x="30" y="34" textAnchor="middle" style={{ fill: 'var(--menu-texto-principal)', fontSize: 11, fontWeight: 700 }}>{value}</text>
        </svg>
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{title}</p>
          <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>{pct.toFixed(1)}%</p>
        </div>
      </div>
    );
  };

  const colorDeadTuples = (dead: number) => dead > 40 ? 'var(--danger)' : dead > 10 ? 'var(--warning)' : 'var(--success)';
  const colorEficiencia = (eff: number) => eff < 40 ? 'var(--danger)' : eff < 80 ? 'var(--warning)' : 'var(--success)';
  const colorWait = (wait: string | null) => wait ? 'var(--warning)' : 'var(--success)';
  const colorGranted = (granted: boolean) => granted ? 'var(--success)' : 'var(--danger)';

  const DetalleCampo = ({ label, value, fullWidth }: { label: string; value: React.ReactNode; fullWidth?: boolean }) => (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>{label}</span>
      <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{value ?? '—'}</p>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="px-4 md:px-8 lg:px-12">
        <header
          className="rounded-2xl mb-8 px-6 py-6"
          style={{
            background: 'linear-gradient(135deg, var(--header-footer) 0%, var(--menu-texto-principal) 100%)',
            color: 'var(--texto-fondo-oscuro)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <h1 className="text-2xl md:text-3xl font-bold">Gestor de Base de Datos</h1>
          <p className="text-sm mt-1 opacity-80">Administración de la base de datos Neon (PostgreSQL)</p>
        </header>

        <div className="relative space-y-6 overflow-hidden">
          {/* Trigger del menú lateral */}
          <button
            type="button"
            aria-label="Mostrar menú"
            onMouseEnter={() => setMenuLateralOculto(false)}
            className="absolute left-0 top-6 z-40 h-10 w-8 rounded-r-lg border border-l-0 text-sm"
            style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'var(--fondo-general)', color: 'var(--menu-texto-principal)' }}
          >
            <Menu size={16} className="mx-auto" />
          </button>
          <div className="absolute top-0 left-0 h-full w-4 z-40" onMouseEnter={() => setMenuLateralOculto(false)} />

          {/* Menú lateral deslizable */}
          {!menuLateralOculto && (
            <aside
              className="absolute top-0 left-0 h-full w-[280px] z-50 p-4 overflow-y-auto"
              style={{ backgroundColor: 'var(--fondo-general)', borderRight: `1px solid var(--encabezados-alterno)` }}
              onMouseEnter={() => setMenuLateralOculto(false)}
              onMouseLeave={() => setMenuLateralOculto(true)}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Secciones</p>
                <button type="button" onClick={() => setMenuLateralOculto(true)}
                  className="text-sm px-2 py-1 rounded border"
                  style={{ borderColor: 'var(--encabezados-alterno)', color: 'var(--menu-texto-principal)' }}><X size={14} className="mx-auto" /></button>
              </div>
              <div className="space-y-1">
                {([
                  { id: 'operaciones', label: 'Operaciones' },
                  { id: 'backup', label: 'Backup' },
                  { id: 'monitoreo', label: 'Monitoreo' },
                  { id: 'diagrama', label: 'Diagrama ER' },
                  { id: 'consultar', label: 'Consultar datos' },
                ] as const).map((item) => (
                  <button key={item.id} type="button"
                    onClick={() => { navegarVistaPrincipal(item.id); setMenuLateralOculto(true); }}
                    className="w-full text-left rounded px-3 py-2 text-sm"
                    style={{ backgroundColor: vistaPrincipal === item.id ? 'var(--hover)' : 'transparent', color: 'var(--menu-texto-principal)' }}>
                    {item.label}
                  </button>
                ))}
              </div>
              {vistaPrincipal === 'operaciones' && (
                <div className="mt-4 pt-3 border-t space-y-1" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                  {([{ id: 'importar', label: 'Importar datos' }, { id: 'exportar', label: 'Exportar datos' }, { id: 'truncate', label: 'Truncate tabla' }] as const).map((item) => (
                    <button key={item.id} type="button"
                      onClick={() => { navegarVistaOperaciones(item.id); setMenuLateralOculto(true); }}
                      className="w-full text-left rounded px-3 py-2 text-sm"
                      style={{ backgroundColor: vistaOperaciones === item.id ? 'rgba(24,108,131,0.16)' : 'transparent', color: 'var(--menu-texto-principal)' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-3 border-t space-y-1" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wide opacity-70" style={{ color: 'var(--menu-texto-principal)' }}>
                  Páginas dedicadas
                </p>
            
                <Link
                  href="/admin/base-datos/restauracion"
                  className="block w-full rounded px-3 py-2 text-sm no-underline hover:opacity-90"
                  style={{ color: 'var(--menu-texto-principal)', backgroundColor: 'transparent' }}
                  onClick={() => setMenuLateralOculto(true)}
                >
                  Restauración
                </Link>
                <Link
                  href="/admin/base-datos/restauracion-protocolo"
                  className="block w-full rounded px-3 py-2 text-sm no-underline hover:opacity-90"
                  style={{ color: 'var(--menu-texto-principal)', backgroundColor: 'transparent' }}
                  onClick={() => setMenuLateralOculto(true)}
                >
                  Protocolo de restauración
                </Link>
              </div>
            </aside>
          )}

          <div className="space-y-6">
            {/* ── Selector de sub-vista en Operaciones ── */}
            {vistaPrincipal === 'operaciones' && (
              <Card variant="elevated" padding="md">
                <div className="flex flex-wrap gap-2">
                  {([{ id: 'importar', label: 'Importación' }, { id: 'exportar', label: 'Exportación' }, { id: 'truncate', label: 'Truncate' }] as const).map((item) => (
                    <button key={item.id} type="button" onClick={() => navegarVistaOperaciones(item.id)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium border"
                      style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: vistaOperaciones === item.id ? 'var(--hover)' : 'transparent', color: 'var(--menu-texto-principal)' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                IMPORTAR
            ══════════════════════════════════════════════════════════════════ */}
            {vistaPrincipal === 'operaciones' && vistaOperaciones === 'importar' && (
              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  <Upload size={18} /> Importar datos
                </h2>
                <form onSubmit={handleImportar} className="space-y-4">
                  <div>
                    <Button type="button" variant="outline" onClick={cargarTablasDirectas} disabled={loadingTablasDirectas}>
                      {loadingTablasDirectas ? 'Cargando…' : 'Cargar tablas de la BD'}
                    </Button>
                  </div>
                  <div>
                    <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Tabla</label>
                    <Select
                      options={(tablasImportablesMeta.length > 0 ? tablasImportablesMeta.map((t) => t.tabla) : tablasDirectas).length === 0
                        ? [{ value: '', label: '— Carga las tablas de la BD —' }]
                        : [{ value: '__todas__', label: 'Toda la base (JSON multi-tabla)' },
                          ...(tablasImportablesMeta.length > 0 ? tablasImportablesMeta.map((t) => t.tabla) : tablasDirectas)
                            .map((t) => ({ value: t, label: t }))]
                      }
                      value={tablaImport}
                      onChange={(e) => setTablaImport(e.target.value)}
                      disabled={(tablasImportablesMeta.length > 0 ? tablasImportablesMeta : tablasDirectas).length === 0}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Archivo (CSV o JSON)</label>
                    <input ref={fileInputRef} type="file" accept=".csv,.json"
                      onChange={(e) => setArchivoImport(e.target.files?.[0] ?? null)}
                      className="w-full px-4 py-2.5 rounded-lg border"
                      style={{ backgroundColor: 'var(--texto-fondo-oscuro)', borderColor: 'var(--encabezados-alterno)', color: 'var(--menu-texto-principal)' }} />
                    {tablaImport === 'usuarios' && (
                      <p className="mt-2 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                        Recomendación: evita importar la columna <code className="bg-black/10 px-1 rounded">password</code> con hash bcrypt.
                      </p>
                    )}
                  </div>
                  <Button type="submit" disabled={importando}>{importando ? 'Importando…' : 'Importar'}</Button>
                </form>
                {resultadoImport != null && (() => {
                  const r = resultadoImport!;
                  if (r.success) {
                    const { importados, fallidos, errores } = r as Extract<ResultadoImportacion, { success: true }>;
                    return (
                      <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: 'rgba(110,125,87,0.2)', color: 'var(--success)' }}>
                        <p className="font-medium">Importados: {importados}{(fallidos ?? 0) > 0 && <> • Fallidos: {fallidos ?? 0}</>}</p>
                        {(errores?.length ?? 0) > 0 && (
                          <ul className="mt-2 list-disc list-inside space-y-1 opacity-90">
                            {(errores ?? []).slice(0, 5).map((err, i) => <li key={i}>Fila {err.fila}: {err.mensaje}</li>)}
                            {(errores ?? []).length > 5 && <li>… y {(errores ?? []).length - 5} más</li>}
                          </ul>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: 'rgba(89,12,12,0.15)', color: 'var(--danger)' }}>
                      <p>{(r as Extract<ResultadoImportacion, { success: false }>).error}</p>
                    </div>
                  );
                })()}
              </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                EXPORTAR
            ══════════════════════════════════════════════════════════════════ */}
            {vistaPrincipal === 'operaciones' && vistaOperaciones === 'exportar' && (
              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  <Download size={18} /> Exportar datos
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                  Conexión directa a la BD con <code className="text-xs bg-black/10 px-1 rounded">DATABASE_URL</code>. Lista las tablas del schema <code className="text-xs bg-black/10 px-1 rounded">public</code>.
                </p>
                <form onSubmit={handleExportar} className="space-y-4">
                  <div>
                    <Button type="button" variant="outline" onClick={cargarTablasDirectas} disabled={loadingTablasDirectas}>
                      {loadingTablasDirectas ? 'Cargando…' : 'Cargar tablas de la BD'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Tabla o todas</label>
                      <Select
                        options={tablasDirectas.length === 0
                          ? [{ value: '', label: '— Carga las tablas primero —' }]
                          : [{ value: '__todas__', label: 'Todas las tablas' }, ...tablasDirectas.map((t) => ({ value: t, label: t }))]}
                        value={tablasDirectas.length === 0 ? '' : tablaExport}
                        onChange={(e) => setTablaExport(e.target.value)}
                        disabled={tablasDirectas.length === 0}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Formato</label>
                      <Select
                        options={FORMATOS_EXPORT.map((f) => ({ value: f.value, label: f.label }))}
                        value={formatoExport}
                        onChange={(e) => setFormatoExport(e.target.value as 'csv' | 'json')}
                      />
                    </div>
                  </div>

                  {/* Opciones avanzadas para una tabla concreta */}
                  {tablaExport && tablaExport !== '__todas__' && (
                    <div className="rounded-lg border p-4 space-y-4"
                      style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'var(--fondo-general)' }}>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Export con opciones</h3>
                      {loadingColumnas ? (
                        <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Cargando columnas…</p>
                      ) : columnasTabla.length > 0 ? (
                        <>
                          <div>
                            <label className="block mb-2 font-medium text-xs" style={{ color: 'var(--menu-texto-principal)' }}>Columnas a exportar</label>
                            <div className="flex gap-2 mb-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => setColumnasSeleccionadas(columnasTabla)}>Todas</Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => setColumnasSeleccionadas([])}>Ninguna</Button>
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                              {columnasTabla.map((col) => (
                                <label key={col} className="inline-flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--menu-texto-principal)' }}>
                                  <input type="checkbox" checked={columnasSeleccionadas.includes(col)}
                                    onChange={(e) => {
                                      if (e.target.checked) setColumnasSeleccionadas((prev) => [...prev, col].sort());
                                      else setColumnasSeleccionadas((prev) => prev.filter((c) => c !== col));
                                    }} className="rounded" />
                                  <span className="font-mono text-xs">{col}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block mb-1 text-xs font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Fecha desde</label>
                              <input type="date" value={exportFechaDesde} onChange={(e) => setExportFechaDesde(e.target.value)}
                                className="w-full rounded border px-3 py-2 text-sm"
                                style={{ borderColor: 'var(--encabezados-alterno)', color: 'var(--menu-texto-principal)', backgroundColor: 'var(--fondo-general)' }} />
                            </div>
                            <div>
                              <label className="block mb-1 text-xs font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Fecha hasta</label>
                              <input type="date" value={exportFechaHasta} onChange={(e) => setExportFechaHasta(e.target.value)}
                                className="w-full rounded border px-3 py-2 text-sm"
                                style={{ borderColor: 'var(--encabezados-alterno)', color: 'var(--menu-texto-principal)', backgroundColor: 'var(--fondo-general)' }} />
                            </div>
                          </div>
                          <div>
                            <label className="inline-flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                              <input type="checkbox" checked={exportSoloActivos} onChange={(e) => setExportSoloActivos(e.target.checked)} className="rounded" />
                              Solo registros activos
                            </label>
                            <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                              (tablas con columna <code className="bg-black/10 px-1 rounded">activo</code> o <code className="bg-black/10 px-1 rounded">estado</code>)
                            </p>
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}

                  <Button type="submit"
                    disabled={exportando || tablasDirectas.length === 0 ||
                      (tablaExport !== '__todas__' && tablaExport !== '' && columnasSeleccionadas.length === 0)}>
                    {exportando ? 'Exportando…' : 'Descargar'}
                  </Button>
                  <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                    Todas las tablas: en Chrome/Edge eliges la carpeta y se crea una subcarpeta «backup-bd_AAAA-MM-DD»; en otros navegadores se descarga un ZIP.
                  </p>
                </form>

                {/* Historial de exportaciones */}
                {historialExportaciones.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Historial de exportaciones</h3>
                    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--encabezados-alterno)', maxHeight: '260px', overflowY: 'auto' }}>
                      <table className="w-full text-sm">
                        <thead style={{ backgroundColor: 'var(--encabezados-alterno)' }}>
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>Fecha</th>
                            <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>Exportación</th>
                            <th className="px-4 py-2 text-right font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                          {historialExportaciones.map((entrada) => (
                            <tr key={entrada.id} style={{ backgroundColor: 'var(--fondo-general)' }}>
                              <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--menu-texto-principal)' }}>
                                {new Date(entrada.fecha).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="px-4 py-3" style={{ color: 'var(--menu-texto-principal)' }}>{entrada.etiqueta}</td>
                              <td className="px-4 py-3 text-right">
                                <Button type="button" variant="outline" disabled={exportando} onClick={() => handleDescargarDeNuevo(entrada)}>
                                  Descargar de nuevo
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      Se guardan las últimas {MAX_HISTORIAL} exportaciones. «Descargar de nuevo» genera un export actual con las mismas opciones.
                    </p>
                  </div>
                )}
                {errorExport && <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>{errorExport}</p>}
              </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TRUNCATE
            ══════════════════════════════════════════════════════════════════ */}
            {vistaPrincipal === 'operaciones' && vistaOperaciones === 'truncate' && (
              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  <Trash2 size={18} /> Truncate de tabla
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                  El comando <code className="text-xs bg-black/10 px-1 rounded">TRUNCATE TABLE</code> elimina todas las filas de una tabla.
                  Esta operación es destructiva.
                </p>
                <form onSubmit={handleTruncateTabla} className="space-y-4">
                  <div>
                    <Button type="button" variant="outline" onClick={cargarTablasDirectas} disabled={loadingTablasDirectas}>
                      {loadingTablasDirectas ? 'Cargando…' : 'Cargar tablas de la BD'}
                    </Button>
                  </div>
                  <div>
                    <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Tabla objetivo</label>
                    <Select
                      options={tablasDirectas.length === 0
                        ? [{ value: '', label: '— Carga las tablas de la BD —' }]
                        : tablasDirectas.map((t) => ({ value: t, label: t }))}
                      value={tablaTruncate}
                      onChange={(e) => setTablaTruncate(e.target.value)}
                      disabled={tablasDirectas.length === 0}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input type="checkbox" checked={truncateRestartIdentity} onChange={(e) => setTruncateRestartIdentity(e.target.checked)} className="rounded" />
                      RESTART IDENTITY
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input type="checkbox" checked={truncateCascade} onChange={(e) => setTruncateCascade(e.target.checked)} className="rounded" />
                      CASCADE
                    </label>
                  </div>
                  <div>
                    <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                      Confirmación (escribe exactamente: <code className="text-xs bg-black/10 px-1 rounded">{tablaTruncate ? `TRUNCATE ${tablaTruncate}` : 'TRUNCATE nombre_tabla'}</code>)
                    </label>
                    <input
                      type="text"
                      value={truncateConfirmText}
                      onChange={(e) => setTruncateConfirmText(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border"
                      style={{ backgroundColor: 'var(--texto-fondo-oscuro)', borderColor: 'var(--encabezados-alterno)', color: 'var(--menu-texto-principal)' }}
                      placeholder={tablaTruncate ? `TRUNCATE ${tablaTruncate}` : 'TRUNCATE nombre_tabla'}
                    />
                  </div>
                  <Button type="submit" variant="danger" disabled={truncandoTabla || !tablaTruncate}>
                    {truncandoTabla ? 'Ejecutando…' : 'Ejecutar TRUNCATE'}
                  </Button>
                </form>
                {resultadoTruncate && (
                  <div
                    className="mt-4 p-4 rounded-lg text-sm"
                    style={{
                      backgroundColor: resultadoTruncate.success ? 'rgba(110,125,87,0.2)' : 'rgba(89,12,12,0.15)',
                      color: resultadoTruncate.success ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {resultadoTruncate.success
                      ? `TRUNCATE ejecutado en ${resultadoTruncate.tabla}${resultadoTruncate.message ? `: ${resultadoTruncate.message}` : '.'}`
                      : resultadoTruncate.error}
                  </div>
                )}
              </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                BACKUP
            ══════════════════════════════════════════════════════════════════ */}
            {vistaPrincipal === 'backup' && (
              <div className="space-y-6">
                <Card variant="elevated" padding="lg">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                    <Save size={18} /> Gestión de Backups
                  </h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
                    Genera respaldos completos o selectivos de la base de datos. Los archivos se descargan directamente en tu equipo.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Modo */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Modo de respaldo</label>
                      <div className="flex gap-2">
                        <Button size="sm" variant={modoBackup === 'completa' ? 'primary' : 'outline'}
                          onClick={() => { setModoBackup('completa'); setTablasSeleccionadasBackup(tablasDirectas); }}
                          className="flex-1">
                          Completa
                        </Button>
                        <Button size="sm" variant={modoBackup === 'seleccionada' ? 'primary' : 'outline'}
                          onClick={() => setModoBackup('seleccionada')}
                          className="flex-1">
                          Por tablas
                        </Button>
                      </div>
                    </div>
                    {/* Formato */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Formato de salida</label>
                      <Select
                        options={[
                          { value: 'json', label: 'JSON (recomendado)' },
                          { value: 'sql', label: 'SQL' },
                          { value: 'csv', label: 'CSV (ZIP con un archivo por tabla)' },
                        ]}
                        value={formatoBackup}
                        onChange={(e) => setFormatoBackup(e.target.value as 'json' | 'sql' | 'csv')}
                      />
                    </div>
                  </div>

                  {/* Cargar tablas si aún no se han cargado */}
                  {tablasDirectas.length === 0 && (
                    <div className="mb-4">
                      <Button type="button" variant="outline" onClick={cargarTablasDirectas} disabled={loadingTablasDirectas}>
                        {loadingTablasDirectas ? 'Cargando tablas…' : 'Cargar tablas de la BD'}
                      </Button>
                      <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                        Necesario para generar el backup. Si ya las cargaste en otra sección ya estarán disponibles.
                      </p>
                    </div>
                  )}

                  {/* Selector de tablas (modo seleccionada) */}
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
                          <label key={tabla} className="flex items-center gap-2 text-sm p-2 rounded border cursor-pointer"
                            style={{ backgroundColor: 'var(--fondo-general)', borderColor: 'var(--encabezados-alterno)', color: 'var(--menu-texto-principal)' }}>
                            <input type="checkbox"
                              checked={tablasSeleccionadasBackup.includes(tabla)}
                              onChange={() => setTablasSeleccionadasBackup((prev) =>
                                prev.includes(tabla) ? prev.filter((t) => t !== tabla) : [...prev, tabla]
                              )}
                            />
                            <span className="font-mono text-xs">{tabla}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* En tu sección de Operaciones Rápidas */}
<button 
  onClick={realizarBackup}
  disabled={realizandoBackup}
  className="flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:bg-white"
>
  <Database size={24} className={realizandoBackup ? "animate-spin" : ""} />
  <span className="text-[10px] font-bold mt-2">
    {realizandoBackup ? "Generando backup..." : "Generar backup"}
  </span>
</button>

                  {errorBackup && (
                    <div className="mt-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                      style={{ backgroundColor: 'rgba(89,12,12,0.12)', color: 'var(--danger)' }}>
                      <ShieldAlert size={16} /> {errorBackup}
                    </div>
                  )}
                </Card>

                {/* Historial de backups */}
                <Card variant="elevated" padding="lg">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                    <Clock3 size={18} /> Historial de backups
                  </h2>
                  {historialBackups.length > 0 ? (
                    <div className="space-y-3">
                      {historialBackups.map((backup) => (
                        <div key={backup.id}
                          className="p-4 rounded-lg flex flex-wrap justify-between items-center gap-3"
                          style={{
                            borderLeft: `4px solid ${backup.estado === 'exitoso' ? 'var(--success)' : 'var(--danger)'}`,
                            backgroundColor: 'var(--fondos-suaves)',
                          }}>
                          <div>
                            <p className="font-semibold text-sm uppercase" style={{ color: 'var(--menu-texto-principal)' }}>
                              {backup.modo} · {backup.formato.toUpperCase()}
                              {backup.tablas && ` · ${backup.tablas.length} tablas`}
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
                      No hay registros de backups todavía.
                    </p>
                  )}


                  <p className="text-xs mt-4" style={{ color: 'var(--encabezados-alterno)' }}>
                    Se conservan los últimos {MAX_HISTORIAL_BACKUP} registros.
                  </p>

                  
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MONITOREO
            ══════════════════════════════════════════════════════════════════ */}
            {vistaPrincipal === 'monitoreo' && (
              <Card variant="elevated" padding="lg">
                {/* Tabs de monitoreo */}
                <div className="rounded-xl border p-3 mb-4" style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'rgba(24,108,131,0.08)' }}>
                  <div className="flex flex-wrap gap-2">
                    {tabsMonitoreo.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.id} type="button" onClick={() => navegarVistaMonitoreo(item.id)}
                          className="px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                          style={{
                            borderColor: vistaMonitoreo === item.id ? 'var(--hover)' : 'var(--encabezados-alterno)',
                            backgroundColor: vistaMonitoreo === item.id ? 'var(--hover)' : 'transparent',
                            color: 'var(--menu-texto-principal)',
                            boxShadow: vistaMonitoreo === item.id ? '0 2px 10px rgba(24,108,131,0.25)' : 'none',
                          }}>
                          <Icon size={14} className="inline-block mr-1 mb-[1px]" />{item.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs flex flex-wrap items-center gap-3" style={{ color: 'var(--encabezados-alterno)' }}>
                    <span>Vista activa: <strong style={{ color: 'var(--menu-texto-principal)' }}>{tabMonitoreoActual?.label}</strong></span>
                    <span>{tabMonitoreoActual?.hint}</span>
                    <span>Actualización: {ultimaActualizacionMonitoreo ? ultimaActualizacionMonitoreo.toLocaleTimeString('es-MX') : '—'}</span>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                  <Button size="sm" type="button" variant="outline" onClick={cargarDashboardMonitoreo} disabled={loadingRendimiento}>
                    {loadingRendimiento ? 'Actualizando…' : 'Actualizar'}
                  </Button>
                  {vistaMonitoreo === 'locks' && (
                    <Button size="sm" type="button" variant="outline" onClick={cargarLocksBd} disabled={loadingRendimiento}>
                      {loadingRendimiento ? 'Cargando…' : 'Refrescar locks'}
                    </Button>
                  )}
                </div>

                {/* ── Resumen ── */}
                {vistaMonitoreo === 'resumen' && (
                  <>
                    <div className="rounded-xl border p-4 mb-4" style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'rgba(24,108,131,0.07)' }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Estado y salud</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Estado del sistema</p>
                          <p className="text-4xl md:text-5xl font-extrabold leading-none mt-1" style={{ color: estadoSistemaColor }}>{estadoSistema}</p>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Salud</p>
                          <div className="mt-1 flex items-center justify-between">
                            <div>
                              <p className="text-4xl md:text-5xl font-extrabold leading-none" style={{ color: 'var(--menu-texto-principal)' }}>{saludGeneral}</p>
                              <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>/100</p>
                            </div>
                            <DonutKpi value={saludGeneral} max={100} color={saludGeneral < 60 ? 'var(--danger)' : saludGeneral < 80 ? 'var(--warning)' : 'var(--success)'} />
                          </div>
                          <div className="w-full h-2 rounded mt-2" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                            <div className="h-full rounded" style={{ width: `${saludGeneral}%`, backgroundColor: saludGeneral < 60 ? 'var(--danger)' : saludGeneral < 80 ? 'var(--warning)' : 'var(--success)' }} />
                          </div>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Versión PostgreSQL</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{dbSummary?.version ?? '—'}</p>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Uptime servidor</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{uptimeLabel}</p>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><HardDrive size={12} />Tamaño total BD</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{formateador.format(dbSummary?.sizeMB ?? 0)} MB</p>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><TableProperties size={12} />Número de tablas</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{formateador.format(dbSummary?.totalTablas ?? tableStats.length)}</p>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Cache hit ratio</p>
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-2xl font-bold" style={{ color: (dbSummary?.cacheHitRatio ?? 0) >= 95 ? 'var(--success)' : 'var(--warning)' }}>
                              {(dbSummary?.cacheHitRatio ?? 0).toFixed(2)}%
                            </p>
                            <DonutKpi value={dbSummary?.cacheHitRatio ?? 0} max={100} color={(dbSummary?.cacheHitRatio ?? 0) >= 95 ? 'var(--success)' : 'var(--warning)'} />
                          </div>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><GitCompareArrows size={12} />Transacciones por segundo</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{(dbSummary?.transaccionesPorSegundo ?? 0).toFixed(2)}</p>
                        </Card>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4 mb-4" style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'rgba(89,12,12,0.05)' }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Rendimiento en tiempo real</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Consultas por segundo</p>
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-3xl font-extrabold leading-none" style={{ color: 'var(--menu-texto-principal)' }}>
                              {(latestRealtime?.qps ?? dbSummary?.transaccionesPorSegundo ?? 0).toFixed(2)}
                            </p>
                            <DonutKpi value={latestRealtime?.qps ?? dbSummary?.transaccionesPorSegundo ?? 0} max={Math.max(1, maxQps)} color="var(--success)" />
                          </div>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Conexiones activas</p>
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-3xl font-extrabold leading-none" style={{ color: 'var(--menu-texto-principal)' }}>
                              {formateador.format(latestRealtime?.activeConnections ?? conexionesActivasActual)}
                            </p>
                            <DonutKpi value={latestRealtime?.activeConnections ?? conexionesActivasActual} max={Math.max(1, totalConexionesActual)} color="var(--warning)" />
                          </div>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Tiempo prom. respuesta</p>
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-3xl font-extrabold leading-none" style={{ color: 'var(--menu-texto-principal)' }}>
                              {(latestRealtime?.avgResponseMs ?? 0).toFixed(2)} ms
                            </p>
                            <DonutKpi value={latestRealtime?.avgResponseMs ?? 0} max={Math.max(1, maxRespMs)} color="var(--danger)" />
                          </div>
                        </Card>
                      </div>

                      {/* Serie temporal */}
                      <div className="rounded-lg border p-3 mb-3" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                        <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Serie temporal (actualiza cada 10s)</p>
                        {realtimeSeries.length > 1 ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                              { label: 'QPS', series: qpsSeries, color: 'var(--success)' },
                              { label: 'Conexiones activas', series: connSeries, color: 'var(--warning)' },
                              { label: 'Tiempo respuesta (ms)', series: respSeries, color: 'var(--danger)' },
                            ].map(({ label, series, color }) => (
                              <div key={label}>
                                <p className="text-xs mb-1" style={{ color: 'var(--encabezados-alterno)' }}>{label}</p>
                                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-24 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                                  <polyline fill="none" stroke={color} strokeWidth="1.8" points={buildLineFromSeries(series)} />
                                </svg>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Esperando suficientes puntos para dibujar la gráfica.</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                          <span className="inline-flex items-center gap-1"><CircleCheck size={12} />QPS</span>
                          <span className="inline-flex items-center gap-1"><Users size={12} />Conexiones</span>
                          <span className="inline-flex items-center gap-1"><Clock3 size={12} />Respuesta</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Consultas lentas ahora</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{formateador.format(slowQueries.length)}</p>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Top costosas disponibles</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{formateador.format(topCostlyQueries.length)}</p>
                        </Card>
                        <Card variant="elevated" padding="md">
                          <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Estado de analítica SQL</p>
                          <p className="text-xl font-bold mt-1" style={{ color: pgStatStatementsEnabled ? 'var(--success)' : 'var(--warning)' }}>
                            {pgStatStatementsEnabled ? 'Activa' : 'Limitada'}
                          </p>
                        </Card>
                      </div>
                    </div>
                  </>
                )}

                {/* Alertas activas */}
                {vistaMonitoreo === 'resumen' && (tableStats.length > 0 || indexStats.length > 0 || locksRows.length > 0) && (
                  <div className="rounded-lg border p-3 mb-4" style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'rgba(89,12,12,0.08)' }}>
                    <p className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Alertas activas</p>
                    <ul className="text-sm space-y-1" style={{ color: 'var(--menu-texto-principal)' }}>
                      {locksPendientes > 0 && <li className="inline-flex items-center gap-1"><ShieldAlert size={14} />Critico: hay {locksPendientes} lock(s) en espera.</li>}
                      {tablasConDead > 0 && <li className="inline-flex items-center gap-1"><CircleAlert size={14} />Atencion: {tablasConDead} tabla(s) con registros obsoletos altos.</li>}
                      {indicesBajos > 0 && <li className="inline-flex items-center gap-1"><CircleAlert size={14} />Atencion: {indicesBajos} indice(s) con eficiencia baja (&lt;40%).</li>}
                      {locksPendientes === 0 && tablasConDead === 0 && indicesBajos === 0 && <li className="inline-flex items-center gap-1"><CircleCheck size={14} />Sin alertas criticas en este momento.</li>}
                    </ul>
                  </div>
                )}

                {errorRendimiento && <p className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>{errorRendimiento}</p>}

                {/* ── Tablas ── */}
                {vistaMonitoreo === 'tablas' && tableStats.length > 0 && (
                  <div className="mb-4">
                    <div className="rounded-lg border p-3 mb-3" style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'rgba(24,108,131,0.06)' }}>
                      <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Lectura rápida</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge size="sm" variant="success">Verde: filas vivas</Badge>
                        <Badge size="sm" variant="danger">Rojo: filas obsoletas</Badge>
                        <Badge size="sm" variant="warning">Atención: dead tuples &gt; 10</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><Layers size={12} />Total tablas</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{tableStats.length}</p>
                          <DonutKpi value={tableStats.length} max={Math.max(1, dbSummary?.totalTablas ?? tableStats.length)} color="var(--hover)" />
                        </div>
                      </Card>
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><CircleAlert size={12} />Con obsoletos altos</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{tablasConDead}</p>
                          <DonutKpi value={tablasConDead} max={Math.max(1, tableStats.length)} color="var(--warning)" />
                        </div>
                      </Card>
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Máx. dead tuples</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{maxDeadTuples}</p>
                          <DonutKpi value={maxDeadTuples} max={Math.max(100, maxDeadTuples)} color="var(--danger)" />
                        </div>
                      </Card>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Estado de tablas</p>
                      <div className="inline-flex rounded border overflow-hidden" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                        {(['tabla', 'grafica'] as const).map((v) => (
                          <button key={v} type="button" className="px-3 py-1 text-xs" onClick={() => setVistaTablasMonitoreo(v)}
                            style={{ backgroundColor: vistaTablasMonitoreo === v ? 'var(--hover)' : 'transparent', color: 'var(--menu-texto-principal)' }}>
                            {v === 'tabla' ? 'Tabla' : 'Gráfica'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {vistaTablasMonitoreo === 'tabla' ? (
                      <div className="max-h-72 overflow-y-auto">
                        <Table headers={['Nombre de tabla', 'Registros activos', 'Registros obsoletos', 'Consulta rápida', 'Consulta lenta', 'Condición']}>
                          {tableStats.slice(0, 20).map((t) => {
                            const live = Number(t.n_live_tup || 0);
                            const dead = Number(t.n_dead_tup || 0);
                            const estado = dead > 40 ? 'Crítico' : dead > 10 ? 'Atención' : 'Óptimo';
                            const variant = dead > 40 ? 'danger' : dead > 10 ? 'warning' : 'success';
                            const consultaLenta = Number(t.seq_scan || 0);
                            const consultaRapida = Number(t.idx_scan || 0);
                            return (
                              <TableRow key={`${t.schemaname}.${t.relname}`}>
                                <TableCell>{t.schemaname}.{t.relname}</TableCell>
                                <TableCell style={{ color: live > 0 ? 'var(--success)' : 'var(--encabezados-alterno)', fontWeight: 700 }}>{live}</TableCell>
                                <TableCell style={{ color: colorDeadTuples(dead), fontWeight: 700 }}>{dead}</TableCell>
                                <TableCell style={{ color: consultaRapida >= consultaLenta ? 'var(--success)' : 'var(--menu-texto-principal)', fontWeight: consultaRapida >= consultaLenta ? 700 : 500 }}>{consultaRapida}</TableCell>
                                <TableCell style={{ color: consultaLenta > consultaRapida ? 'var(--warning)' : 'var(--menu-texto-principal)', fontWeight: consultaLenta > consultaRapida ? 700 : 500 }}>{consultaLenta}</TableCell>
                                <TableCell><Badge size="sm" variant={variant}>{estado}</Badge></TableCell>
                              </TableRow>
                            );
                          })}
                        </Table>
                      </div>
                    ) : (
                      <div className="rounded-lg border p-3" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                        <ResponsiveContainer width="100%" height={420}>
                          <BarChart
                            data={tableStats.slice(0, 20).map((t) => {
                              const live = Number(t.n_live_tup || 0);
                              const dead = Number(t.n_dead_tup || 0);
                              return {
                                tabla: t.relname,
                                activos: live,
                                criticos: dead > 10 ? dead : 0,
                                atencion: dead > 0 && dead <= 10 ? dead : 0,
                              };
                            })}
                            margin={{ top: 8, right: 20, left: 0, bottom: 50 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--borde-sutil)" />
                            <XAxis dataKey="tabla" interval={0} angle={-35} textAnchor="end" height={65} tick={{ fill: 'var(--encabezados-alterno)', fontSize: 10 }} />
                            <YAxis tick={{ fill: 'var(--encabezados-alterno)', fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--fondo-general)', border: '1px solid var(--encabezados-alterno)' }} labelStyle={{ color: 'var(--menu-texto-principal)' }} />
                            <Legend />
                            <Bar dataKey="activos" name="Registros Activos" fill="var(--success)" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="criticos" name="Registros Críticos" fill="var(--danger)" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="atencion" name="Registros en Atención" fill="var(--warning)" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
                {vistaMonitoreo === 'tablas' && tableStats.length === 0 && (
                  <div className="rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--encabezados-alterno)', color: 'var(--encabezados-alterno)' }}>
                    No hay métricas de tablas disponibles todavía.
                  </div>
                )}

                {/* ── Índices ── */}
                {vistaMonitoreo === 'indices' && indexStats.length > 0 && (
                  <div className="mb-4">
                    <div className="rounded-lg border p-3 mb-3" style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'rgba(24,108,131,0.06)' }}>
                      <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Lectura rápida</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <DonutCategoria title="Óptima (≥ 80%)" value={indicesOptimos} color="var(--success)" />
                        <DonutCategoria title="Media (40% - 79%)" value={indicesMedios} color="var(--warning)" />
                        <DonutCategoria title="Baja (< 40%)" value={indicesBajosCount} color="var(--danger)" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><ChartNoAxesColumn size={12} />Índices analizados</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{indexStats.length}</p>
                          <DonutKpi value={indexStats.length} max={Math.max(1, indexStats.length)} color="var(--hover)" />
                        </div>
                      </Card>
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><CircleAlert size={12} />Eficiencia baja</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{indicesBajos}</p>
                          <DonutKpi value={indicesBajos} max={Math.max(1, indexStats.length)} color="var(--danger)" />
                        </div>
                      </Card>
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><CircleCheck size={12} />Eficiencia promedio</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                            {indexStats.length ? (indexStats.reduce((acc, i) => acc + Number(i.eficiencia || 0), 0) / indexStats.length).toFixed(1) : 0}%
                          </p>
                          <DonutKpi value={indexStats.length ? (indexStats.reduce((acc, i) => acc + Number(i.eficiencia || 0), 0) / indexStats.length) : 0} max={100} color="var(--success)" />
                        </div>
                      </Card>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Uso de índices</p>
                      <div className="inline-flex rounded border overflow-hidden" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                        {(['tabla', 'grafica'] as const).map((v) => (
                          <button key={v} type="button" className="px-3 py-1 text-xs" onClick={() => setVistaIndicesMonitoreo(v)}
                            style={{ backgroundColor: vistaIndicesMonitoreo === v ? 'var(--hover)' : 'transparent', color: 'var(--menu-texto-principal)' }}>
                            {v === 'tabla' ? 'Tabla' : 'Gráfica'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {vistaIndicesMonitoreo === 'tabla' ? (
                      <div className="max-h-72 overflow-y-auto">
                        <Table headers={['Nombre índice', 'Tabla', 'Consultas índice', 'Consultas sec.', 'Eficiencia %', 'Calidad']}>
                          {indexStats.slice(0, 20).map((i) => {
                            const eff = Number(i.eficiencia || 0);
                            const variant = eff < 40 ? 'danger' : eff < 80 ? 'warning' : 'success';
                            const estado = eff < 40 ? 'Baja' : eff < 80 ? 'Media' : 'Óptima';
                            const idxScan = Number(i.idx_scan || 0); const seqScan = Number(i.seq_scan || 0);
                            return (
                              <TableRow key={`${i.schemaname}.${i.indexname}`}>
                                <TableCell>{i.indexname}</TableCell>
                                <TableCell>{i.schemaname}.{i.tablename}</TableCell>
                                <TableCell style={{ color: idxScan >= seqScan ? 'var(--success)' : 'var(--menu-texto-principal)', fontWeight: idxScan >= seqScan ? 700 : 500 }}>{idxScan}</TableCell>
                                <TableCell style={{ color: seqScan > idxScan ? 'var(--warning)' : 'var(--menu-texto-principal)', fontWeight: seqScan > idxScan ? 700 : 500 }}>{seqScan}</TableCell>
                                <TableCell style={{ color: colorEficiencia(eff), fontWeight: 700 }}>{eff.toFixed(2)}%</TableCell>
                                <TableCell><Badge size="sm" variant={variant}>{estado}</Badge></TableCell>
                              </TableRow>
                            );
                          })}
                        </Table>
                      </div>
                    ) : (
                      <div className="rounded-lg border p-3" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                        <ResponsiveContainer width="100%" height={420}>
                          <BarChart
                            data={indexStats.slice(0, 20).map((i) => ({
                              indice: i.indexname,
                              consultasIndice: Number(i.idx_scan || 0),
                              consultasSec: Number(i.seq_scan || 0),
                              eficiencia: Math.max(0, Math.min(100, Number(i.eficiencia || 0))),
                            }))}
                            margin={{ top: 8, right: 20, left: 0, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--borde-sutil)" />
                            <XAxis dataKey="indice" interval={0} angle={-35} textAnchor="end" height={65} tick={{ fill: 'var(--encabezados-alterno)', fontSize: 10 }} />
                            <YAxis tick={{ fill: 'var(--encabezados-alterno)', fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--fondo-general)', border: '1px solid var(--encabezados-alterno)' }} labelStyle={{ color: 'var(--menu-texto-principal)' }} />
                            <Legend />
                            <Bar dataKey="consultasIndice" name="Consultas Índice" fill="var(--success)" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="consultasSec" name="Consultas Sec." fill="var(--danger)" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="eficiencia" name="Eficiencia %" fill="var(--warning)" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
                {vistaMonitoreo === 'indices' && indexStats.length === 0 && (
                  <div className="rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--encabezados-alterno)', color: 'var(--encabezados-alterno)' }}>
                    No hay métricas de índices disponibles todavía.
                  </div>
                )}

                {/* ── Actividad ── */}
                {vistaMonitoreo === 'actividad' && actividadRows.length > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><Users size={12} />Sesiones totales</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{formateador.format(actividadRows.length)}</p>
                          <DonutKpi value={actividadRows.length} max={Math.max(1, totalConexionesActual)} color="var(--hover)" />
                        </div>
                      </Card>
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><Activity size={12} />Sesiones activas</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                            {formateador.format(actividadRows.filter((r) => r.state === 'active').length)}
                          </p>
                          <DonutKpi value={actividadRows.filter((r) => r.state === 'active').length} max={Math.max(1, actividadRows.length)} color="var(--warning)" />
                        </div>
                      </Card>
                    </div>
                    <div className="rounded-lg border p-3 mb-3" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                      <p className="text-sm font-semibold mb-2 inline-flex items-center gap-1" style={{ color: 'var(--menu-texto-principal)' }}><ChartNoAxesColumn size={14} />Distribución de actividad</p>
                      <div className="space-y-2">
                        {Object.entries(actividadPorEstado).map(([estado, cantidad]) => {
                          const pct = (cantidad / totalActividad) * 100;
                          return (
                            <div key={estado}>
                              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                                <span>{estado}</span><span>{cantidad}</span>
                              </div>
                              <div className="w-full h-2 rounded" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                                <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: 'var(--hover)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Actividad / conexiones</p>
                    <div className="max-h-56 overflow-y-auto">
                      <Table headers={['PID', 'Usuario', 'Estado', 'Wait', 'Query']}>
                        {actividadRows.slice(0, 30).map((r) => (
                          <TableRow key={`${r.pid}-${r.query_start ?? 'x'}`}>
                            <TableCell style={{ color: 'var(--hover)', fontWeight: 700 }}>{r.pid}</TableCell>
                            <TableCell>{r.usename}</TableCell>
                            <TableCell><Badge size="sm" variant={r.state === 'active' ? 'success' : r.state === 'idle' ? 'info' : 'warning'}>{r.state ?? '—'}</Badge></TableCell>
                            <TableCell style={{ color: colorWait(r.wait_event_type), fontWeight: r.wait_event_type ? 700 : 500 }}>{r.wait_event_type ?? '—'}</TableCell>
                            <TableCell>{(r.query ?? '').slice(0, 90) || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </Table>
                    </div>
                  </div>
                )}
                {vistaMonitoreo === 'actividad' && actividadRows.length === 0 && (
                  <div className="rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--encabezados-alterno)', color: 'var(--encabezados-alterno)' }}>
                    Sin sesiones activas para mostrar en este momento.
                  </div>
                )}

                {/* ── Locks ── */}
                {vistaMonitoreo === 'locks' && locksRows.length > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><Lock size={12} />Locks pendientes</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{locksPendientes}</p>
                          <DonutKpi value={locksPendientes} max={Math.max(1, locksRows.length)} color="var(--danger)" />
                        </div>
                      </Card>
                      <Card variant="elevated" padding="md">
                        <p className="text-xs uppercase flex items-center gap-1" style={{ color: 'var(--encabezados-alterno)' }}><CircleCheck size={12} />Locks concedidos</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{locksRows.length - locksPendientes}</p>
                          <DonutKpi value={locksRows.length - locksPendientes} max={Math.max(1, locksRows.length)} color="var(--success)" />
                        </div>
                      </Card>
                    </div>
                    <div className="rounded-lg border p-3 mb-3" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                      <p className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Locks por modo</p>
                      <div className="space-y-2">
                        {Object.entries(locksPorModo).slice(0, 6).map(([modo, cantidad]) => {
                          const pct = (cantidad / Math.max(1, locksRows.length)) * 100;
                          return (
                            <div key={modo}>
                              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                                <span>{modo}</span><span>{cantidad}</span>
                              </div>
                              <div className="w-full h-2 rounded" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                                <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: 'var(--warning)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Locks / transacciones</p>
                    <div className="max-h-56 overflow-y-auto">
                      <Table headers={['PID', 'Relación', 'Modo', 'Granted', 'Query']}>
                        {locksRows.slice(0, 40).map((r, idx) => (
                          <TableRow key={`${r.pid}-${r.locktype}-${idx}`}>
                            <TableCell style={{ color: 'var(--hover)', fontWeight: 700 }}>{r.pid}</TableCell>
                            <TableCell>{r.relation ?? '—'}</TableCell>
                            <TableCell><Badge size="sm" variant={r.mode.toLowerCase().includes('exclusive') ? 'warning' : 'info'}>{r.mode}</Badge></TableCell>
                            <TableCell style={{ color: colorGranted(r.granted), fontWeight: 700 }}>{r.granted ? 'Sí' : 'No'}</TableCell>
                            <TableCell>{(r.query ?? '').slice(0, 90) || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </Table>
                    </div>
                  </div>
                )}
                {vistaMonitoreo === 'locks' && locksRows.length === 0 && (
                  <div className="rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--encabezados-alterno)', color: 'var(--encabezados-alterno)' }}>
                    Sin locks reportados actualmente.
                  </div>
                )}
              </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                DIAGRAMA ER
            ══════════════════════════════════════════════════════════════════ */}
            {vistaPrincipal === 'diagrama' && (
              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  <Network size={18} /> Diagrama ER
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                  Descarga el diagrama de entidad-relación del esquema de la base de datos.
                </p>
                <form onSubmit={handleDescargarDiagrama} className="space-y-4">
                  <div>
                    <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Formato</label>
                    <Select
                      options={FORMATOS_DIAGRAMA.map((f) => ({ value: f.value, label: f.label }))}
                      value={formatoDiagrama}
                      onChange={(e) => setFormatoDiagrama(e.target.value as FormatoDiagrama)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" onClick={handleVistaPrevia} disabled={cargandoPreview}>
                      {cargandoPreview ? 'Cargando…' : 'Vista previa'}
                    </Button>
                    <Button type="submit" disabled={descargandoDiagrama}>
                      {descargandoDiagrama ? 'Descargando…' : 'Descargar'}
                    </Button>
                  </div>
                </form>
                {tienePreview && (
                  <div className="mt-6 p-4 rounded-lg overflow-auto"
                    style={{ backgroundColor: 'var(--fondos-suaves)', maxHeight: '500px', minHeight: '200px' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Vista previa</p>
                    {previewSvg ? (
                      <>
                        <p className="text-xs mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
                          Haz clic en una entidad (tabla) para ver sus datos en la sección Consultar datos.
                        </p>
                        <div role="button" tabIndex={0}
                          onClick={handleDiagramaClick}
                          onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') ev.preventDefault(); }}
                          className="max-w-full cursor-pointer select-none"
                          style={{ minHeight: '150px' }}
                          dangerouslySetInnerHTML={{ __html: previewSvg }}
                        />
                        {diagramaMensaje && (
                          <p className="text-sm mt-2 font-medium animate-pulse" style={{ color: 'var(--hover)' }}>{diagramaMensaje}</p>
                        )}
                      </>
                    ) : (
                      previewUrl && (
                        <>
                          <p className="text-xs mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
                            Vista previa en PNG. Usa formato Mermaid o SVG para el diagrama interactivo.
                          </p>
                          <Image src={previewUrl} alt="Diagrama ER" width={800} height={600}
                            className="max-w-full h-auto" style={{ display: 'block' }} unoptimized />
                        </>
                      )
                    )}
                  </div>
                )}
                {errorDiagrama && <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>{errorDiagrama}</p>}
              </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                CONSULTAR DATOS
            ══════════════════════════════════════════════════════════════════ */}
            {vistaPrincipal === 'consultar' && (
              <div ref={refConsultarSection}>
                <Card variant="elevated" padding="lg">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                    <FolderKanban size={18} /> Consultar datos
                  </h2>
                  <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>Selecciona un módulo para cargar y ver los datos:</p>
                  <div className="space-y-2">
                    {MODULOS_CONSULTAR.map((item) => (
                      <div key={item.id} className="rounded-lg overflow-hidden"
                        style={{ backgroundColor: 'var(--fondos-suaves)', borderLeft: `4px solid var(--hover)` }}>
                        <button type="button" onClick={() => toggleModulo(item.id)}
                          className="w-full p-4 text-left flex items-center justify-between hover:opacity-90 transition-opacity">
                          <div>
                            <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{item.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>{item.description}</p>
                          </div>
                          <span style={{ color: 'var(--menu-texto-principal)' }}>
                            {moduloExpandido === item.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                        </button>
                        {moduloExpandido === item.id && (
                          <div className="p-4 pt-0 border-t" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                            {loadingModulo === item.id ? (
                              <div className="py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</div>
                            ) : errorModulo ? (
                              <p className="text-sm py-4" style={{ color: 'var(--danger)' }}>{errorModulo}</p>
                            ) : item.id === 'inventario' ? (
                              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                <Table headers={['', 'ID', 'Nombre', 'Categoría', 'Marca', 'Precio', 'Stock']}>
                                  {productos.map((p) => {
                                    const idStr = String(p.id);
                                    const isExpanded = expandedRow?.modulo === 'inventario' && expandedRow?.id === idStr;
                                    return (
                                      <React.Fragment key={idStr}>
                                        <TableRow onClick={() => toggleFila('inventario', idStr)}>
                                          <TableCell className="w-8"><span style={{ color: 'var(--menu-texto-principal)' }}>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span></TableCell>
                                          <TableCell>{idStr.slice(0, 8)}…</TableCell>
                                          <TableCell>{p.nombre}</TableCell>
                                          <TableCell>{p.categoria}</TableCell>
                                          <TableCell>{p.marca ?? '—'}</TableCell>
                                          <TableCell>{p.precio}</TableCell>
                                          <TableCell>{p.stock ? 'Sí' : 'No'}</TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                          <tr><td colSpan={7} className="p-0">
                                            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                                              style={{ backgroundColor: 'var(--fondos-suaves)', borderBottom: `1px solid var(--encabezados-alterno)` }}>
                                              <DetalleCampo label="ID" value={idStr} />
                                              {p.caracteristicas && p.caracteristicas.length > 0 && (
                                                <div className="col-span-full">
                                                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Características</span>
                                                  <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{p.caracteristicas.join(', ')}</p>
                                                </div>
                                              )}
                                              {p.presentaciones && p.presentaciones.length > 0 && (
                                                <div className="col-span-full">
                                                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Presentaciones</span>
                                                  <div className="text-sm mt-1 space-y-1" style={{ color: 'var(--menu-texto-principal)' }}>
                                                    {p.presentaciones.map((pr, i) => (
                                                      <div key={i} className="flex gap-4 flex-wrap">
                                                        {pr.tamaño} • {pr.precio} • Stock: {pr.stock} • {pr.disponible ? 'Disponible' : 'No disponible'}
                                                        {pr.fechaCaducidad && ` • Cad: ${pr.fechaCaducidad}`}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </td></tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </Table>
                                {productos.length === 0 && <p className="py-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>No hay productos.</p>}
                              </div>
                            ) : item.id === 'usuarios' ? (
                              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                <Table headers={['', 'Nombre', 'Email', 'Teléfono', 'Rol', 'Estado']}>
                                  {usuarios.map((u) => {
                                    const isExpanded = expandedRow?.modulo === 'usuarios' && expandedRow?.id === u.id;
                                    return (
                                      <React.Fragment key={u.id}>
                                        <TableRow onClick={() => toggleFila('usuarios', u.id)}>
                                          <TableCell className="w-8"><span style={{ color: 'var(--menu-texto-principal)' }}>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span></TableCell>
                                          <TableCell className="font-semibold">{u.nombre}</TableCell>
                                          <TableCell className="text-sm">{u.email}</TableCell>
                                          <TableCell className="text-sm">{u.telefono ?? '—'}</TableCell>
                                          <TableCell>{formatearRol(u.rol)}</TableCell>
                                          <TableCell><Badge variant={u.activo ? 'success' : 'danger'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                          <tr><td colSpan={6} className="p-0">
                                            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                                              style={{ backgroundColor: 'var(--fondos-suaves)', borderBottom: `1px solid var(--encabezados-alterno)` }}>
                                              <DetalleCampo label="ID" value={u.id} />
                                              <DetalleCampo label="Nombre" value={u.nombre} />
                                              <DetalleCampo label="Email" value={u.email} />
                                              <DetalleCampo label="Teléfono" value={u.telefono} />
                                              <DetalleCampo label="Rol" value={formatearRol(u.rol)} />
                                              <DetalleCampo label="Estado" value={u.activo ? 'Activo' : 'Inactivo'} />
                                              <DetalleCampo label="Confirmado" value={u.confirmado ? 'Sí' : 'No'} />
                                              <DetalleCampo label="Creado" value={u.creadoEn} />
                                              <DetalleCampo label="Actualizado" value={u.actualizadoEn} />
                                              <DetalleCampo label="Última actividad" value={u.ultimaActividad} />
                                            </div>
                                          </td></tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </Table>
                                {usuarios.length === 0 && <p className="py-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>No hay usuarios de personal (admin, estilista, empleado, becado).</p>}
                              </div>
                            ) : item.id === 'servicios' ? (
                              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                <Table headers={['', 'ID', 'Nombre', 'Categoría', 'Precio', 'Duración']}>
                                  {servicios.map((s) => {
                                    const idStr = String(s.id);
                                    const isExpanded = expandedRow?.modulo === 'servicios' && expandedRow?.id === idStr;
                                    return (
                                      <React.Fragment key={idStr}>
                                        <TableRow onClick={() => toggleFila('servicios', idStr)}>
                                          <TableCell className="w-8"><span style={{ color: 'var(--menu-texto-principal)' }}>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span></TableCell>
                                          <TableCell>{s.id}</TableCell>
                                          <TableCell>{s.nombre}</TableCell>
                                          <TableCell>{s.categoria ?? '—'}</TableCell>
                                          <TableCell>{s.precio ?? '—'}</TableCell>
                                          <TableCell>{s.duracion ?? '—'}</TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                          <tr><td colSpan={6} className="p-0">
                                            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                                              style={{ backgroundColor: 'var(--fondos-suaves)', borderBottom: `1px solid var(--encabezados-alterno)` }}>
                                              <DetalleCampo label="ID" value={idStr} />
                                              <DetalleCampo label="Nombre" value={s.nombre} />
                                              <DetalleCampo label="Categoría" value={s.categoria} />
                                              <DetalleCampo label="Precio" value={s.precio} />
                                              <DetalleCampo label="Duración" value={s.duracion} />
                                              <DetalleCampo label="Duración (min)" value={s.duracionMinutos} />
                                              <DetalleCampo label="Requiere evaluación" value={s.requiereEvaluacion ? 'Sí' : 'No'} />
                                              <DetalleCampo label="Descripción" value={s.descripcion} fullWidth />
                                              <DetalleCampo label="Descripción larga" value={s.descripcionLarga} fullWidth />
                                              {s.incluye && s.incluye.length > 0 && (
                                                <div className="col-span-full">
                                                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Incluye</span>
                                                  <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{s.incluye.join(', ')}</p>
                                                </div>
                                              )}
                                              {s.recomendaciones && s.recomendaciones.length > 0 && (
                                                <div className="col-span-full">
                                                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Recomendaciones</span>
                                                  <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{s.recomendaciones.join(', ')}</p>
                                                </div>
                                              )}
                                              {s.especialistas && s.especialistas.length > 0 && (
                                                <div className="col-span-full">
                                                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Especialistas</span>
                                                  <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{s.especialistas.map((e) => e.nombre || e.usuarioId).join(', ')}</p>
                                                </div>
                                              )}
                                              {s.productosAsociados && s.productosAsociados.length > 0 && (
                                                <div className="col-span-full">
                                                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Productos asociados</span>
                                                  <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{s.productosAsociados.map((pa) => pa.productoNombre || pa.productoId).join(', ')}</p>
                                                </div>
                                              )}
                                            </div>
                                          </td></tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </Table>
                                {servicios.length === 0 && <p className="py-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>No hay servicios.</p>}
                              </div>
                            ) : (
                              /* Clientes */
                              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                <Table headers={['', 'Nombre', 'Email', 'Teléfono']}>
                                  {clientes.map((c) => {
                                    const isExpanded = expandedRow?.modulo === 'clientes' && expandedRow?.id === c.id;
                                    return (
                                      <React.Fragment key={c.id}>
                                        <TableRow onClick={() => toggleFila('clientes', c.id)}>
                                          <TableCell className="w-8"><span style={{ color: 'var(--menu-texto-principal)' }}>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span></TableCell>
                                          <TableCell>{c.nombre}</TableCell>
                                          <TableCell>{c.email}</TableCell>
                                          <TableCell>{c.telefono ?? '—'}</TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                          <tr><td colSpan={4} className="p-0">
                                            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                                              style={{ backgroundColor: 'var(--fondos-suaves)', borderBottom: `1px solid var(--encabezados-alterno)` }}>
                                              <DetalleCampo label="ID" value={c.id} />
                                              <DetalleCampo label="Nombre" value={c.nombre} />
                                              <DetalleCampo label="Email" value={c.email} />
                                              <DetalleCampo label="Teléfono" value={c.telefono} />
                                              <DetalleCampo label="Rol" value={formatearRol(c.rol)} />
                                              <DetalleCampo label="Estado" value={c.activo ? 'Activo' : 'Inactivo'} />
                                              <DetalleCampo label="Confirmado" value={c.confirmado ? 'Sí' : 'No'} />
                                              <DetalleCampo label="Creado" value={c.creadoEn} />
                                              <DetalleCampo label="Actualizado" value={c.actualizadoEn} />
                                              <DetalleCampo label="Última actividad" value={c.ultimaActividad} />
                                            </div>
                                          </td></tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </Table>
                                {clientes.length === 0 && <p className="py-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>No hay clientes.</p>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>{/* fin div.space-y-6 */}
        </div>{/* fin div.relative */}
      </div>
    </AdminLayout>
  );
}