'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import {
  importarDatos,
  exportarDatos,
  descargarDiagrama,
  obtenerDiagrama,
  TABLAS_DISPONIBLES,
  TABLAS_EXPORTABLES,
  type ResultadoImportacion,
  type FormatoDiagrama,
} from '../../../services/database';
import { mermaidToSvg, svgToPngBlob } from '../../../utils/mermaidRender';
import { getProductosSinRedirigir, type Producto } from '../../../services/productos';
import { getUsuarios, getUsuarioById, type Usuario } from '../../../services/usuarios';
import { getServicios, type Servicio } from '../../../services/servicios';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';

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

const FORMATOS_EXPORT = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
] as const;

/** Opciones de exportación: tablas individuales o base de datos completa */
const OPCIONES_EXPORT = [
  { value: 'todos', label: 'Base de datos completa (todas las tablas)' },
  ...TABLAS_EXPORTABLES.map((t) => ({ value: t.value, label: t.label })),
];

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

export default function BaseDatosPage() {
  const [tablaImport, setTablaImport] = useState('productos');
  const [archivoImport, setArchivoImport] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<ResultadoImportacion | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tablaExport, setTablaExport] = useState('productos');
  const [formatoExport, setFormatoExport] = useState<'csv' | 'json'>('csv');
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);

  const [formatoDiagrama, setFormatoDiagrama] = useState<FormatoDiagrama>('mermaid');
  const [descargandoDiagrama, setDescargandoDiagrama] = useState(false);
  const [errorDiagrama, setErrorDiagrama] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);

  const [moduloExpandido, setModuloExpandido] = useState<string | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [loadingModulo, setLoadingModulo] = useState<string | null>(null);
  const [errorModulo, setErrorModulo] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<{ modulo: string; id: string } | null>(null);

  const toggleFila = (modulo: string, id: string) => {
    setExpandedRow((prev) =>
      prev?.modulo === modulo && prev?.id === id ? null : { modulo, id }
    );
  };

  const handleImportar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoImport) {
      setResultadoImport({ success: false, error: 'Selecciona un archivo CSV o JSON' });
      return;
    }
    const ext = archivoImport.name.toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'json') {
      setResultadoImport({ success: false, error: 'El archivo debe ser CSV o JSON' });
      return;
    }
    setImportando(true);
    setResultadoImport(null);
    const res = await importarDatos(tablaImport, archivoImport);
    setResultadoImport(res);
    setImportando(false);
    if (res.success) {
      setArchivoImport(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /** Guarda un blob con diálogo "Guardar como" si el navegador lo soporta. */
  const guardarArchivo = async (blob: Blob, filename: string): Promise<boolean> => {
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as Window & { showSaveFilePicker: (o: { suggestedName: string }) => Promise<FileSystemFileHandle> })
          .showSaveFilePicker({ suggestedName: filename });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return false;
        throw err;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  };

  /** Guarda varios archivos en una carpeta elegida por el usuario (si el navegador lo soporta). */
  const guardarEnCarpeta = async (
    archivos: Array<{ filename: string; blob: Blob }>
  ): Promise<boolean> => {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window && archivos.length > 0) {
      try {
        const dirHandle = await (window as Window & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> })
          .showDirectoryPicker();
        for (const { filename, blob } of archivos) {
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        }
        return true;
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return false;
        throw err;
      }
    }
    return false;
  };

  const handleExportar = async (e: React.FormEvent) => {
    e.preventDefault();
    setExportando(true);
    setErrorExport(null);
    try {
      if (tablaExport === 'todos') {
        const archivos: Array<{ filename: string; blob: Blob }> = [];
        for (const t of TABLAS_EXPORTABLES) {
          const res = await exportarDatos(t.value, formatoExport);
          if (res.success) {
            archivos.push({ filename: res.filename, blob: res.blob });
          } else {
            setErrorExport(`Error en ${t.label}: ${res.error}`);
            return;
          }
        }
        const guardadoConDialogo = await guardarEnCarpeta(archivos);
        if (!guardadoConDialogo) {
          for (const a of archivos) {
            await guardarArchivo(a.blob, a.filename);
          }
        }
      } else {
        const res = await exportarDatos(tablaExport, formatoExport);
        if (res.success) {
          await guardarArchivo(res.blob, res.filename);
        } else {
          setErrorExport(res.error);
        }
      }
    } catch (err) {
      setErrorExport(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExportando(false);
    }
  };

  const handleDescargarDiagrama = async (e: React.FormEvent) => {
    e.preventDefault();
    setDescargandoDiagrama(true);
    setErrorDiagrama(null);
    try {
      if (formatoDiagrama === 'mermaid') {
        const res = await descargarDiagrama('mermaid');
        if (res.success) {
          const url = URL.createObjectURL(res.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.filename;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          setErrorDiagrama(res.error);
        }
      } else {
        const res = await obtenerDiagrama('mermaid');
        if (!res.success) {
          setErrorDiagrama(res.error);
          return;
        }
        const mermaidCode = await res.blob.text();
        const svg = await mermaidToSvg(mermaidCode);
        let blob: Blob;
        let filename: string;
        if (formatoDiagrama === 'svg') {
          blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          filename = `diagrama-er_${new Date().toISOString().slice(0, 10)}.svg`;
        } else {
          blob = await svgToPngBlob(svg);
          filename = `diagrama-er_${new Date().toISOString().slice(0, 10)}.png`;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setErrorDiagrama(err instanceof Error ? err.message : 'Error al generar el diagrama');
    }
    setDescargandoDiagrama(false);
  };

  const handleVistaPrevia = async () => {
    setCargandoPreview(true);
    setErrorDiagrama(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewSvg(null);
    try {
      const res = await obtenerDiagrama('mermaid');
      if (!res.success) {
        setErrorDiagrama(res.error);
        return;
      }
      const mermaidCode = await res.blob.text();
      const svg = await mermaidToSvg(mermaidCode);
      if (formatoDiagrama === 'png') {
        const blob = await svgToPngBlob(svg);
        setPreviewUrl(URL.createObjectURL(blob));
      } else {
        setPreviewSvg(svg);
      }
    } catch (err) {
      setErrorDiagrama(err instanceof Error ? err.message : 'Error al generar la vista previa');
    }
    setCargandoPreview(false);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
        const enriched = await Promise.all(
          data.map((u) => getUsuarioById(u.id).catch(() => u))
        );
        const soloPersonal = enriched.filter((u) => esRolPersonal(u.rol));
        setUsuarios(soloPersonal);
      } else if (id === 'servicios') {
        const res = await getServicios();
        setServicios(res.data);
        if (res.error) setErrorModulo(res.error);
      } else if (id === 'clientes') {
        const todos = await getUsuarios();
        const soloClientes = todos.filter((u) => String(u.rol || '').toLowerCase() === 'cliente');
        setClientes(soloClientes);
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

  const tienePreview = previewUrl || previewSvg;

  const DetalleCampo = ({
    label,
    value,
    fullWidth,
  }: {
    label: string;
    value: React.ReactNode;
    fullWidth?: boolean;
  }) => (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>
        {label}
      </span>
      <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>
        {value ?? '—'}
      </p>
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <header
          className="rounded-2xl mb-8 px-6 py-6"
          style={{
            background: 'linear-gradient(135deg, var(--header-footer) 0%, var(--menu-texto-principal) 100%)',
            color: 'var(--texto-fondo-oscuro)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">Módulo de base de datos</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Importar, exportar y gestionar datos</h1>
          <p className="text-base opacity-90 max-w-xl">
            Importa datos desde archivos CSV/JSON, exporta datos del sistema y accede a las pantallas de consulta,
            inserción y eliminación.
          </p>
        </header>

        <div className="space-y-8">
          {/* Importar - oculto */}
          {false && (
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                📥 Importar datos
              </h2>
              <form onSubmit={handleImportar} className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                    Tabla
                  </label>
                  <Select
                    options={TABLAS_DISPONIBLES.map((t) => ({ value: t.value, label: t.label }))}
                    value={tablaImport}
                    onChange={(e) => setTablaImport(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                    Archivo (CSV o JSON)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => setArchivoImport(e.target.files?.[0] ?? null)}
                    className="w-full px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--texto-fondo-oscuro)',
                      borderColor: 'var(--encabezados-alterno)',
                      color: 'var(--menu-texto-principal)',
                    }}
                  />
                </div>
                <Button type="submit" disabled={importando}>
                  {importando ? 'Importando…' : 'Importar'}
                </Button>
              </form>
              {resultadoImport != null && (() => {
                const r = resultadoImport!;
                if (r.success) {
                  const { importados, fallidos, errores } = r as Extract<ResultadoImportacion, { success: true }>;
                  return (
                    <div
                      className="mt-4 p-4 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'rgba(110, 125, 87, 0.2)',
                        color: 'var(--success)',
                      }}
                    >
                      <p className="font-medium">
                        Importados: {importados}
                        {(fallidos ?? 0) > 0 && (
                          <> • Fallidos: {fallidos ?? 0}</>
                        )}
                      </p>
                      {(errores?.length ?? 0) > 0 && (
                        <ul className="mt-2 list-disc list-inside space-y-1 opacity-90">
                          {(errores ?? []).slice(0, 5).map((err, i) => (
                            <li key={i}>
                              Fila {err.fila}: {err.mensaje}
                            </li>
                          ))}
                          {(errores ?? []).length > 5 && (
                            <li>… y {(errores ?? []).length - 5} más</li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    className="mt-4 p-4 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'rgba(89, 12, 12, 0.15)',
                      color: 'var(--danger)',
                    }}
                  >
                    <p>{(r as Extract<ResultadoImportacion, { success: false }>).error}</p>
                  </div>
                );
              })()}
            </Card>
          )}

          {/* Exportar */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
              📤 Exportar datos
            </h2>
            <form onSubmit={handleExportar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                    Tabla o base completa
                  </label>
                  <Select
                    options={OPCIONES_EXPORT}
                    value={tablaExport}
                    onChange={(e) => setTablaExport(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                    Formato
                  </label>
                  <Select
                    options={FORMATOS_EXPORT.map((f) => ({ value: f.value, label: f.label }))}
                    value={formatoExport}
                    onChange={(e) => setFormatoExport(e.target.value as 'csv' | 'json')}
                  />
                </div>
              </div>
              <Button type="submit" disabled={exportando}>
                {exportando ? 'Exportando…' : 'Descargar'}
              </Button>
              <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                En Chrome/Edge podrás elegir la carpeta donde guardar. Base completa crea un archivo por tabla.
              </p>
            </form>
            {errorExport && (
              <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
                {errorExport}
              </p>
            )}
          </Card>

          {/* Diagrama ER */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
              📊 Diagrama ER
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Descarga el diagrama de entidad-relación del esquema de la base de datos.
            </p>
            <form onSubmit={handleDescargarDiagrama} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                  Formato
                </label>
                <Select
                  options={FORMATOS_DIAGRAMA.map((f) => ({ value: f.value, label: f.label }))}
                  value={formatoDiagrama}
                  onChange={(e) => setFormatoDiagrama(e.target.value as FormatoDiagrama)}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVistaPrevia}
                  disabled={cargandoPreview}
                >
                  {cargandoPreview ? 'Cargando…' : 'Vista previa'}
                </Button>
                <Button type="submit" disabled={descargandoDiagrama}>
                  {descargandoDiagrama ? 'Descargando…' : 'Descargar'}
                </Button>
              </div>
            </form>
            {tienePreview && (
              <div
                className="mt-6 p-4 rounded-lg overflow-auto"
                style={{
                  backgroundColor: 'var(--fondos-suaves)',
                  maxHeight: '500px',
                  minHeight: '200px',
                }}
              >
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
                  Vista previa
                </p>
                {previewSvg ? (
                  <div
                    className="max-w-full"
                    style={{ minHeight: '150px' }}
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                ) : (
                  previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Diagrama ER"
                      className="max-w-full h-auto"
                      style={{ display: 'block' }}
                    />
                  )
                )}
              </div>
            )}
            {errorDiagrama && (
              <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
                {errorDiagrama}
              </p>
            )}
          </Card>

          {/* Consultar */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
              🔍 Consultar datos
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Selecciona un módulo para cargar y ver los datos:
            </p>
            <div className="space-y-2">
              {MODULOS_CONSULTAR.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: 'var(--fondos-suaves)',
                    borderLeft: `4px solid ${'var(--hover)'}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleModulo(item.id)}
                    className="w-full p-4 text-left flex items-center justify-between hover:opacity-90 transition-opacity"
                  >
                    <div>
                      <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                        {item.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>
                        {item.description}
                      </p>
                    </div>
                    <span style={{ color: 'var(--menu-texto-principal)' }}>
                      {moduloExpandido === item.id ? '▼' : '▶'}
                    </span>
                  </button>
                  {moduloExpandido === item.id && (
                    <div className="p-4 pt-0 border-t" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                      {loadingModulo === item.id ? (
                        <div className="py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
                          Cargando…
                        </div>
                      ) : errorModulo ? (
                        <p className="text-sm py-4" style={{ color: 'var(--danger)' }}>
                          {errorModulo}
                        </p>
                      ) : item.id === 'inventario' ? (
                        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                          <Table headers={['', 'ID', 'Nombre', 'Categoría', 'Marca', 'Precio', 'Stock']}>
                            {productos.map((p) => {
                              const idStr = String(p.id);
                              const isExpanded = expandedRow?.modulo === 'inventario' && expandedRow?.id === idStr;
                              return (
                                <React.Fragment key={idStr}>
                                  <TableRow onClick={() => toggleFila('inventario', idStr)}>
                                    <TableCell className="w-8">
                                      <span style={{ color: 'var(--menu-texto-principal)' }}>
                                        {isExpanded ? '▼' : '▶'}
                                      </span>
                                    </TableCell>
                                    <TableCell>{idStr.slice(0, 8)}…</TableCell>
                                    <TableCell>{p.nombre}</TableCell>
                                    <TableCell>{p.categoria}</TableCell>
                                    <TableCell>{p.marca ?? '—'}</TableCell>
                                    <TableCell>{p.precio}</TableCell>
                                    <TableCell>{p.stock ? 'Sí' : 'No'}</TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={7} className="p-0">
                                        <div
                                          className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                                          style={{
                                            backgroundColor: 'var(--fondos-suaves)',
                                            borderBottom: `1px solid ${'var(--encabezados-alterno)'}`,
                                          }}
                                        >
                                          <DetalleCampo label="ID" value={idStr} />
                                          <DetalleCampo label="Nombre" value={p.nombre} />
                                          <DetalleCampo label="Categoría" value={p.categoria} />
                                          <DetalleCampo label="Marca" value={p.marca} />
                                          <DetalleCampo label="Precio" value={p.precio} />
                                          <DetalleCampo label="Precio original" value={p.precioOriginal} />
                                          <DetalleCampo label="Stock" value={p.stock ? 'Sí' : 'No'} />
                                          <DetalleCampo label="Stock cantidad" value={p.stockCantidad} />
                                          <DetalleCampo label="Presentación" value={p.presentacion} />
                                          <DetalleCampo label="Descuento (%)" value={p.descuento} />
                                          <DetalleCampo label="Nuevo" value={p.nuevo ? 'Sí' : 'No'} />
                                          <DetalleCampo label="Cruelty free" value={p.crueltyFree ? 'Sí' : 'No'} />
                                          <DetalleCampo label="Descripción" value={p.descripcion} fullWidth />
                                          <DetalleCampo label="Descripción larga" value={p.descripcionLarga} fullWidth />
                                          <DetalleCampo label="Ingredientes" value={p.ingredientes} fullWidth />
                                          <DetalleCampo label="Modo de uso" value={p.modoUso} fullWidth />
                                          <DetalleCampo label="Resultado" value={p.resultado} fullWidth />
                                          {p.caracteristicas && p.caracteristicas.length > 0 && (
                                            <div className="col-span-full">
                                              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>
                                                Características
                                              </span>
                                              <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>
                                                {p.caracteristicas.join(', ')}
                                              </p>
                                            </div>
                                          )}
                                          {p.presentaciones && p.presentaciones.length > 0 && (
                                            <div className="col-span-full">
                                              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>
                                                Presentaciones
                                              </span>
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
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </Table>
                          {productos.length === 0 && (
                            <p className="py-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                              No hay productos.
                            </p>
                          )}
                        </div>
                      ) : item.id === 'usuarios' ? (
                        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                          <Table headers={['', 'Nombre', 'Email', 'Teléfono', 'Rol', 'Estado']}>
                            {usuarios.map((u) => {
                              const isExpanded = expandedRow?.modulo === 'usuarios' && expandedRow?.id === u.id;
                              return (
                                <React.Fragment key={u.id}>
                                  <TableRow onClick={() => toggleFila('usuarios', u.id)}>
                                    <TableCell className="w-8">
                                      <span style={{ color: 'var(--menu-texto-principal)' }}>
                                        {isExpanded ? '▼' : '▶'}
                                      </span>
                                    </TableCell>
                                    <TableCell className="font-semibold">{u.nombre}</TableCell>
                                    <TableCell className="text-sm">{u.email}</TableCell>
                                    <TableCell className="text-sm">{u.telefono ?? '—'}</TableCell>
                                    <TableCell>{formatearRol(u.rol)}</TableCell>
                                    <TableCell>
                                      <Badge variant={u.activo ? 'success' : 'danger'}>
                                        {u.activo ? 'Activo' : 'Inactivo'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={6} className="p-0">
                                        <div
                                          className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                                          style={{
                                            backgroundColor: 'var(--fondos-suaves)',
                                            borderBottom: `1px solid ${'var(--encabezados-alterno)'}`,
                                          }}
                                        >
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
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </Table>
                          {usuarios.length === 0 && (
                            <p className="py-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                              No hay usuarios de personal (admin, estilista, empleado, becado).
                            </p>
                          )}
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
                                    <TableCell className="w-8">
                                      <span style={{ color: 'var(--menu-texto-principal)' }}>
                                        {isExpanded ? '▼' : '▶'}
                                      </span>
                                    </TableCell>
                                    <TableCell>{s.id}</TableCell>
                                    <TableCell>{s.nombre}</TableCell>
                                    <TableCell>{s.categoria ?? '—'}</TableCell>
                                    <TableCell>{s.precio ?? '—'}</TableCell>
                                    <TableCell>{s.duracion ?? '—'}</TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={6} className="p-0">
                                        <div
                                          className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                                          style={{
                                            backgroundColor: 'var(--fondos-suaves)',
                                            borderBottom: `1px solid ${'var(--encabezados-alterno)'}`,
                                          }}
                                        >
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
                                              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>
                                                Incluye
                                              </span>
                                              <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>
                                                {s.incluye.join(', ')}
                                              </p>
                                            </div>
                                          )}
                                          {s.recomendaciones && s.recomendaciones.length > 0 && (
                                            <div className="col-span-full">
                                              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>
                                                Recomendaciones
                                              </span>
                                              <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>
                                                {s.recomendaciones.join(', ')}
                                              </p>
                                            </div>
                                          )}
                                          {s.especialistas && s.especialistas.length > 0 && (
                                            <div className="col-span-full">
                                              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>
                                                Especialistas
                                              </span>
                                              <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>
                                                {s.especialistas.map((e) => e.nombre || e.usuarioId).join(', ')}
                                              </p>
                                            </div>
                                          )}
                                          {s.productosAsociados && s.productosAsociados.length > 0 && (
                                            <div className="col-span-full">
                                              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--encabezados-alterno)' }}>
                                                Productos asociados
                                              </span>
                                              <p className="text-sm mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>
                                                {s.productosAsociados.map((pa) => pa.productoNombre || pa.productoId).join(', ')}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </Table>
                          {servicios.length === 0 && (
                            <p className="py-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                              No hay servicios.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                          <Table headers={['', 'Nombre', 'Email', 'Teléfono']}>
                            {clientes.map((c) => {
                              const isExpanded = expandedRow?.modulo === 'clientes' && expandedRow?.id === c.id;
                              return (
                                <React.Fragment key={c.id}>
                                  <TableRow onClick={() => toggleFila('clientes', c.id)}>
                                    <TableCell className="w-8">
                                      <span style={{ color: 'var(--menu-texto-principal)' }}>
                                        {isExpanded ? '▼' : '▶'}
                                      </span>
                                    </TableCell>
                                    <TableCell>{c.nombre}</TableCell>
                                    <TableCell>{c.email}</TableCell>
                                    <TableCell>{c.telefono ?? '—'}</TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={4} className="p-0">
                                        <div
                                          className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                                          style={{
                                            backgroundColor: 'var(--fondos-suaves)',
                                            borderBottom: `1px solid ${'var(--encabezados-alterno)'}`,
                                          }}
                                        >
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
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </Table>
                          {clientes.length === 0 && (
                            <p className="py-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                              No hay clientes.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Insertar - oculto */}
          {false && (
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                ➕ Insertar datos
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                Crear registros nuevos en cada módulo:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACCESOS_INSERTAR.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className="p-4 rounded-lg transition-all hover:opacity-90"
                      style={{
                        backgroundColor: 'var(--fondos-suaves)',
                        borderLeft: `4px solid ${'var(--success)'}`,
                      }}
                    >
                      <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                        {item.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Eliminar - oculto */}
          {false && (
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                🗑️ Eliminar datos
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                Ir a las pantallas donde se puede eliminar o desactivar registros:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACCESOS_ELIMINAR.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className="p-4 rounded-lg transition-all hover:opacity-90"
                      style={{
                        backgroundColor: 'var(--fondos-suaves)',
                        borderLeft: `4px solid ${'var(--danger)'}`,
                      }}
                    >
                      <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                        {item.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
