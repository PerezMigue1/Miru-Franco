'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import { BarChart3, Scissors, UserPlus, ShoppingBag } from 'lucide-react';
import {
  obtenerReporteVentas,
  obtenerReporteServicios,
  obtenerReporteInventario,
  obtenerReporteClientes,
} from '../../../services/reportes';
import { exportarReportePdf, exportarReporteExcel, ReporteParaExportar } from '../../../utils/exportReportes';

type TipoReporte = 'ventas' | 'servicios' | 'inventario' | 'clientes';

const TIPOS_REPORTE: { value: TipoReporte; label: string }[] = [
  { value: 'ventas', label: 'Reporte de Ventas' },
  { value: 'servicios', label: 'Reporte de Servicios' },
  { value: 'inventario', label: 'Reporte de Inventario' },
  { value: 'clientes', label: 'Reporte de Clientes' },
];

function fmtFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 'YYYY-MM-DD' locales del primer y último día del mes actual (getters locales, sin UTC). */
function rangoMesActual(): { desde: string; hasta: string } {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const desde = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const hasta = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(ultimoDia)}`;
  return { desde, hasta };
}

export default function ReportesPage() {
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('ventas');
  const [formato, setFormato] = useState<'pdf' | 'excel'>('pdf');
  const [{ desde, hasta }, setRango] = useState(rangoMesActual());

  const [loadingKpis, setLoadingKpis] = useState(true);
  const [kpiVentasMonto, setKpiVentasMonto] = useState(0);
  const [kpiUnidadesVendidas, setKpiUnidadesVendidas] = useState(0);
  const [kpiServiciosCompletados, setKpiServiciosCompletados] = useState(0);
  const [kpiClientesNuevos, setKpiClientesNuevos] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabla, setTabla] = useState<ReporteParaExportar | null>(null);

  // KPIs del mes en curso, independientes del tipo/rango elegido en el generador.
  useEffect(() => {
    const { desde: d, hasta: h } = rangoMesActual();
    setLoadingKpis(true);
    Promise.allSettled([obtenerReporteVentas(d, h), obtenerReporteServicios(d, h), obtenerReporteClientes(d, h)])
      .then(([ventasRes, serviciosRes, clientesRes]) => {
        if (ventasRes.status === 'fulfilled') {
          setKpiVentasMonto(ventasRes.value.resumen.totalMonto);
          setKpiUnidadesVendidas(ventasRes.value.resumen.totalUnidadesVendidas);
        }
        if (serviciosRes.status === 'fulfilled') setKpiServiciosCompletados(serviciosRes.value.totalCompletadas);
        if (clientesRes.status === 'fulfilled') setKpiClientesNuevos(clientesRes.value.totalNuevos);
      })
      .finally(() => setLoadingKpis(false));
  }, []);

  const cargarReporte = useCallback(() => {
    setLoading(true);
    setError(null);
    const construir = async (): Promise<ReporteParaExportar> => {
      const subtitulo = tipoReporte === 'inventario' ? 'Stock actual' : `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`;
      if (tipoReporte === 'ventas') {
        const r = await obtenerReporteVentas(desde, hasta);
        return {
          titulo: 'Reporte de Ventas',
          subtitulo,
          columnas: ['Folio', 'Fecha', 'Método de Pago', 'Total'],
          filas: r.ventas.map((v) => [v.folio, fmtFecha(v.creadoEn), v.metodoPago, fmtMoneda(v.total)]),
          totales: [
            { label: 'Total de ventas', valor: String(r.resumen.totalVentas) },
            { label: 'Monto total', valor: fmtMoneda(r.resumen.totalMonto) },
            { label: 'Unidades de producto vendidas', valor: String(r.resumen.totalUnidadesVendidas) },
          ],
        };
      }
      if (tipoReporte === 'servicios') {
        const r = await obtenerReporteServicios(desde, hasta);
        return {
          titulo: 'Reporte de Servicios',
          subtitulo,
          columnas: ['Servicio', 'Citas completadas'],
          filas: r.porServicio.map((s) => [s.servicioNombre, s.cantidad]),
          totales: [{ label: 'Total de citas completadas', valor: String(r.totalCompletadas) }],
        };
      }
      if (tipoReporte === 'inventario') {
        const r = await obtenerReporteInventario();
        return {
          titulo: 'Reporte de Inventario',
          subtitulo,
          columnas: ['Producto', 'Marca', 'Presentación', 'Stock actual'],
          filas: r.presentacionesBajoStock.map((p) => [p.producto.nombre, p.producto.marca, p.tamanio, p.stock]),
          totales: [
            { label: 'Total de presentaciones', valor: String(r.totalPresentaciones) },
            { label: 'Con stock bajo (≤5)', valor: String(r.presentacionesBajoStock.length) },
          ],
        };
      }
      const r = await obtenerReporteClientes(desde, hasta);
      return {
        titulo: 'Reporte de Clientes',
        subtitulo,
        columnas: ['Nombre', 'Correo', 'Fecha de alta'],
        filas: r.clientes.map((c) => [c.nombre, c.email, fmtFecha(c.creadoEn)]),
        totales: [{ label: 'Clientes nuevos en el rango', valor: String(r.totalNuevos) }],
      };
    };

    construir()
      .then(setTabla)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo generar el reporte'))
      .finally(() => setLoading(false));
  }, [tipoReporte, desde, hasta]);

  useEffect(() => { cargarReporte(); }, [cargarReporte]);

  const handleDescargar = () => {
    if (!tabla) return;
    if (formato === 'pdf') exportarReportePdf(tabla);
    else exportarReporteExcel(tabla);
  };

  const tipoLabel = useMemo(() => TIPOS_REPORTE.find((t) => t.value === tipoReporte)?.label ?? '', [tipoReporte]);

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Reportes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Genera reportes automáticos y personalizados sobre las operaciones del negocio
          </p>
        </div>

        {/* KPIs (mes en curso) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BarChart3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Ventas del Mes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--oro-texto)' }}>{loadingKpis ? '…' : fmtMoneda(kpiVentasMonto)}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Scissors size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Servicios del Mes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loadingKpis ? '…' : kpiServiciosCompletados}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <UserPlus size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Clientes Nuevos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loadingKpis ? '…' : kpiClientesNuevos}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <ShoppingBag size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Productos Vendidos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loadingKpis ? '…' : kpiUnidadesVendidas}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Generar Reporte
          </h2>
          <div className="space-y-4">
            <Select
              label="Tipo de Reporte"
              value={tipoReporte}
              onChange={(e) => setTipoReporte(e.target.value as TipoReporte)}
              options={TIPOS_REPORTE}
              fullWidth
            />
            {tipoReporte !== 'inventario' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha Inicio" type="date" value={desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} fullWidth />
                <Input label="Fecha Fin" type="date" value={hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} fullWidth />
              </div>
            )}
            <Select
              label="Formato"
              value={formato}
              onChange={(e) => setFormato(e.target.value as 'pdf' | 'excel')}
              options={[{ value: 'pdf', label: 'PDF' }, { value: 'excel', label: 'Excel' }]}
              fullWidth
            />
            <Button fullWidth onClick={handleDescargar} disabled={loading || !tabla}>
              Descargar {formato === 'pdf' ? 'PDF' : 'Excel'}
            </Button>
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            {tipoLabel}
          </h2>
          {error && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{error}</p>}
          {loading ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Generando…</p>
          ) : !tabla || tabla.filas.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Sin datos en el rango seleccionado.</p>
          ) : (
            <div className="space-y-3">
              {tabla.totales?.map((t) => (
                <p key={t.label} className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{t.label}:</span> {t.valor}
                </p>
              ))}
            </div>
          )}
        </Card>
        </div>

        {!loading && tabla && tabla.filas.length > 0 && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
              Detalle
            </h2>
            <Table headers={tabla.columnas} headerSutil>
              {tabla.filas.map((fila, idx) => (
                <TableRow key={idx}>
                  {fila.map((celda, ci) => (
                    <TableCell key={ci} rowPadding="lg">{celda}</TableCell>
                  ))}
                </TableRow>
              ))}
            </Table>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
