'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, Download, Package, PackageX, Search, ShoppingBag } from 'lucide-react';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import TarjetaKpi from '../../../../components/ui/TarjetaKpi';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Badge from '../../../../components/ui/Badge';
import Table, { TableCell, TableRow } from '../../../../components/ui/Table';
import { obtenerPrediccionInventario, type PrediccionInventario } from '../../../../services/inventario';
import { fechaCortaEnMexico } from '../../../../utils/fechaSoloDia';
import { TEXTO_METODO_PREDICCION, csvPrediccion, filtrarFilasPrediccion, textoCobertura } from './prediccionVentas';

const fmt = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 2 });

/**
 * Predicción del inventario con ventas reales (GET /api/inventario/prediccion): por presentación,
 * promedio semanal de las últimas 8 semanas (tienda en línea y salón), promedio diario y días de
 * cobertura del stock actual. `?producto=<id>` deja solo ese producto (enlace desde su análisis).
 */
export default function PrediccionInventarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productoFiltro = searchParams.get('producto');

  const [datos, setDatos] = useState<PrediccionInventario>({ filas: [], ventana: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let cancelado = false;
    obtenerPrediccionInventario()
      .then((d) => {
        if (!cancelado) setDatos(d);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : 'No se pudo cargar la predicción del inventario.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const filas = useMemo(
    () => filtrarFilasPrediccion(datos.filas, { texto: busqueda, productoId: productoFiltro }),
    [datos.filas, busqueda, productoFiltro],
  );
  const conVentas = filas.filter((f) => !f.sinVentasRecientes).length;
  const unidades = filas.reduce((s, f) => s + f.unidades8Semanas, 0);
  const nombreProductoFiltro = productoFiltro
    ? datos.filas.find((f) => String(f.productoId) === productoFiltro)?.producto ?? null
    : null;

  // `hasta` es exclusivo (00:00 de hoy en México): el último día con ventas contadas es ayer.
  const periodo = datos.ventana
    ? {
        desde: fechaCortaEnMexico(datos.ventana.desde),
        hasta: fechaCortaEnMexico(new Date(new Date(datos.ventana.hasta).getTime() - 1)),
      }
    : null;

  const exportarCsv = () => {
    const blob = new Blob([csvPrediccion(filas)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediccion-inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Predicción del inventario
            </h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--menu-texto-principal)' }}>
              {TEXTO_METODO_PREDICCION}
            </p>
            {periodo && (
              <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                Ventas contadas del {periodo.desde} al {periodo.hasta} (hora de México).
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                const q = productoFiltro ? `?producto=${encodeURIComponent(productoFiltro)}` : '';
                router.push(`/admin/inventario/historial-ventas${q}`);
              }}
            >
              Historial de ventas
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push('/admin/inventario')}>
              Volver a inventario
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <TarjetaKpi icono={Package} etiqueta="Presentaciones" cargando={loading} valor={filas.length} detalle="Productos activos" />
          <TarjetaKpi icono={Activity} etiqueta="Con ventas recientes" cargando={loading} valor={conVentas} detalle="Últimas 8 semanas" />
          <TarjetaKpi
            icono={PackageX}
            etiqueta="Sin ventas recientes"
            cargando={loading}
            valor={filas.length - conVentas}
            detalle="Sin días de cobertura"
          />
          <TarjetaKpi icono={ShoppingBag} etiqueta="Unidades vendidas" cargando={loading} valor={fmt(unidades)} detalle="Últimas 8 semanas" />
        </div>

        {error && (
          <Card padding="md" role="alert">
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {/* Sin relleno alrededor de la tabla: con tarjeta y marco, en móvil solo cabían 1 o 2 columnas. */}
        <Card id="seccion-modulo-prediccion" variant="elevated" padding="lg" className="scroll-mt-24 !p-0 overflow-hidden">
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <Input
                label="Buscar"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Producto, marca o presentación"
                icon={<Search size={16} aria-hidden />}
                fullWidth
              />
            </div>
            <Button variant="outline" onClick={exportarCsv} disabled={filas.length === 0}>
              <span className="inline-flex items-center gap-1.5">
                <Download size={16} aria-hidden />
                Exportar CSV
              </span>
            </Button>
          </div>
          {productoFiltro && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="info" size="sm">
                Solo {nombreProductoFiltro ?? 'este producto'}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => router.replace('/admin/inventario/prediccion', { scroll: false })}>
                Ver todos los productos
              </Button>
            </div>
          )}
          </div>

            <Table
              className="min-w-[860px]"
              headersLegibles
              stickyFirstColumn
              etiqueta="Predicción: desplaza para ver más columnas"
              headers={[
                'Producto',
                'Presentación',
                'Stock actual',
                'Vendidas (8 semanas)',
                'Promedio semanal',
                'Promedio diario',
                'Días de cobertura',
              ]}
            >
              {!loading &&
                filas.map((f) => (
                  <TableRow key={f.presentacionId}>
                    <TableCell stickyLeft className="font-semibold min-w-[180px]">
                      {f.producto}
                      {f.marca && (
                        <span className="block text-xs font-normal" style={{ color: 'var(--encabezados-alterno)' }}>
                          {f.marca}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{f.tamanio || 'Sin presentación'}</TableCell>
                    <TableCell>{fmt(f.stock)}</TableCell>
                    <TableCell>{fmt(f.unidades8Semanas)}</TableCell>
                    <TableCell>{fmt(f.promedioSemanal)}</TableCell>
                    <TableCell>{fmt(f.promedioDiario)}</TableCell>
                    <TableCell>
                      {f.sinVentasRecientes ? (
                        <Badge variant="default" size="sm">{textoCobertura(f)}</Badge>
                      ) : (
                        <span className="font-semibold">{textoCobertura(f)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </Table>
          {loading && (
            <p className="text-sm px-4 py-4 sm:px-6" style={{ color: 'var(--encabezados-alterno)' }}>Cargando predicción…</p>
          )}
          {!loading && !error && filas.length === 0 && (
            <p className="text-sm px-4 py-4 sm:px-6" style={{ color: 'var(--encabezados-alterno)' }}>
              No hay presentaciones de productos activos con este filtro.
            </p>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
