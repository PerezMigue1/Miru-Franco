'use client';

import { useEffect, useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Table, { TableCell, TableRow } from '../ui/Table';
import Badge from '../ui/Badge';
import { Drawer } from '../ui/Drawer';
import { SvgLineaVentas, SvgBarrasVentas } from './VentasMiniCharts';
import { SvgPastelParticipacion } from './SvgPastelParticipacion';
import { type Producto } from '../../services/productos';
import { filtrarLineasDesdeFecha, type LineaVentaProducto } from '../../utils/inventarioVentasOnline';
import {
  etiquetaTendencia,
  parseCategoriaSub,
  participacionPorProducto,
  puntoReorden,
  promedioDiarioProducto,
  serieConsumoProducto,
  stockProyectadoLineal,
  tendenciaDesdeSerieDiaria,
  unidadesVendidasProducto,
} from '../../utils/inventarioInteligente';
import {
  listarMovimientosInventario,
  type InventarioMovimientoApi,
  type TipoMovimientoInventario,
} from '../../services/inventarioMovimientos';

const FILAS_LISTA = 12;
const ALTO_LISTA = 44 * FILAS_LISTA + 44;

type Gran = 'dia' | 'semana' | 'mes';

export type InventarioAnalisisCategoriasPanelProps = {
  productos: Producto[];
  lineasVentas: LineaVentaProducto[];
  pedidosContados: number;
  loading: boolean;
  error?: string | null;
  /** Deep link: abre el detalle de este producto si existe en catálogo */
  productoIdExterno?: string | null;
  /** En drawer: solo período/reorden + detalle de un producto fijado por productoIdExterno */
  variante?: 'completo' | 'soloConsumoProducto';
};

function productoPerteneceCatSub(p: Producto, cat: string, sub: string): boolean {
  const { categoriaPrincipal, subcategoria } = parseCategoriaSub(p.categoria || '');
  const okCat = !cat || categoriaPrincipal === cat;
  const okSub = !sub || subcategoria === sub;
  return okCat && okSub;
}

export function InventarioAnalisisCategoriasPanel({
  productos,
  lineasVentas,
  pedidosContados,
  loading,
  error,
  productoIdExterno,
  variante = 'completo',
}: InventarioAnalisisCategoriasPanelProps) {
  const soloConsumo = variante === 'soloConsumoProducto';
  const [categoriaSel, setCategoriaSel] = useState('');
  const [subcategoriaSel, setSubcategoriaSel] = useState('');
  const [productoSel, setProductoSel] = useState('');
  const [diasAnalisis, setDiasAnalisis] = useState<90 | 180>(90);
  const [granularidad, setGranularidad] = useState<Gran>('dia');
  const [leadTimeDias, setLeadTimeDias] = useState(7);
  const [stockSeguridad, setStockSeguridad] = useState(5);
  const [graficaModal, setGraficaModal] = useState<'linea' | 'barras' | null>(null);
  const [movimientosApi, setMovimientosApi] = useState<InventarioMovimientoApi[]>([]);
  const [movimientosLoading, setMovimientosLoading] = useState(false);
  const [movimientosError, setMovimientosError] = useState<string | null>(null);

  useEffect(() => {
    if (!productoIdExterno) {
      if (soloConsumo) setProductoSel('');
      return;
    }
    const ok = productos.some((p) => String(p.id) === String(productoIdExterno));
    if (ok) setProductoSel(String(productoIdExterno));
  }, [productoIdExterno, productos, soloConsumo]);

  const arbolCatSub = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const p of productos) {
      const { categoriaPrincipal, subcategoria } = parseCategoriaSub(p.categoria || '');
      if (!m.has(categoriaPrincipal)) m.set(categoriaPrincipal, new Set());
      if (subcategoria.trim()) m.get(categoriaPrincipal)!.add(subcategoria);
    }
    return m;
  }, [productos]);

  const categoriasOpciones = useMemo(
    () => ['', ...Array.from(arbolCatSub.keys()).sort((a, b) => a.localeCompare(b))],
    [arbolCatSub]
  );

  const subcategoriasOpciones = useMemo(() => {
    if (!categoriaSel) return [''];
    const subs = arbolCatSub.get(categoriaSel);
    if (!subs || subs.size === 0) return [''];
    return ['', ...Array.from(subs).sort((a, b) => a.localeCompare(b))];
  }, [arbolCatSub, categoriaSel]);

  const haySubcategoriasEnCategoria = Boolean(
    categoriaSel && (arbolCatSub.get(categoriaSel)?.size ?? 0) > 0
  );

  useEffect(() => {
    if (!categoriaSel) {
      setSubcategoriaSel('');
      return;
    }
    const subs = arbolCatSub.get(categoriaSel);
    if (!subs || subs.size === 0) {
      setSubcategoriaSel('');
      return;
    }
    if (!subs.has(subcategoriaSel)) setSubcategoriaSel('');
  }, [categoriaSel, arbolCatSub, subcategoriaSel]);

  const desde = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - diasAnalisis);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [diasAnalisis]);

  const lineasVentana = useMemo(() => filtrarLineasDesdeFecha(lineasVentas, desde), [lineasVentas, desde]);

  const productosFiltrados = useMemo(
    () => productos.filter((p) => productoPerteneceCatSub(p, categoriaSel, subcategoriaSel)),
    [productos, categoriaSel, subcategoriaSel]
  );

  const mostrarColumnaSubcategoria = useMemo(
    () => productosFiltrados.some((p) => parseCategoriaSub(p.categoria || '').subcategoria.trim()),
    [productosFiltrados]
  );

  const headersListadoProductos = useMemo(() => {
    const h = ['Producto', 'Categoría'];
    if (mostrarColumnaSubcategoria) h.push('Subcategoría');
    h.push('Stock', 'Vendido periodo', 'P. reorden', 'Tendencia');
    return h;
  }, [mostrarColumnaSubcategoria]);

  const productoActivo = useMemo(
    () => (productoSel ? productos.find((p) => String(p.id) === productoSel) ?? null : null),
    [productos, productoSel]
  );

  useEffect(() => {
    let cancel = false;
    if (!productoActivo) {
      setMovimientosApi([]);
      setMovimientosError(null);
      return;
    }
    const productoId = Number(productoActivo.id);
    if (!Number.isFinite(productoId)) {
      setMovimientosApi([]);
      setMovimientosError('No se pudo consultar movimientos: id de producto inválido.');
      return;
    }

    setMovimientosLoading(true);
    setMovimientosError(null);
    listarMovimientosInventario({
      productoId,
      desde: desde.toISOString(),
      hasta: new Date().toISOString(),
      page: 1,
      limit: 100,
      sort: 'creadoEn:desc',
    })
      .then((r) => {
        if (cancel) return;
        setMovimientosApi(r.data);
      })
      .catch((e) => {
        if (cancel) return;
        setMovimientosApi([]);
        setMovimientosError(e instanceof Error ? e.message : 'No se pudo cargar el historial de movimientos.');
      })
      .finally(() => {
        if (!cancel) setMovimientosLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [productoActivo, desde]);

  const etiquetaMotivo = (motivo: string): string => {
    const map: Record<string, string> = {
      pedido_creado: 'Pedido creado',
      item_agregado: 'Ítem agregado',
      item_incrementado: 'Aumento de cantidad',
      item_reducido: 'Reducción de cantidad',
      item_eliminado: 'Ítem eliminado',
      pedido_cancelado: 'Pedido cancelado',
      pedido_reactivado: 'Pedido reactivado',
      pedido_eliminado: 'Pedido eliminado',
    };
    return map[motivo] ?? motivo.replace(/_/g, ' ');
  };

  const badgeTipoMovimiento = (tipo: TipoMovimientoInventario): { variant: 'warning' | 'info' | 'success'; label: string } => {
    if (tipo === 'entrada') return { variant: 'success', label: 'Entrada' };
    if (tipo === 'ajuste') return { variant: 'info', label: 'Ajuste' };
    return { variant: 'warning', label: 'Salida' };
  };

  const serieActiva = useMemo(() => {
    if (!productoActivo) return [];
    return serieConsumoProducto(lineasVentana, Number(productoActivo.id), desde, granularidad);
  }, [productoActivo, lineasVentana, desde, granularidad]);

  const chartSeries = useMemo(
    () => serieActiva.map((s) => ({ etiqueta: s.etiqueta, valor: s.unidades })),
    [serieActiva]
  );
  const puntosSerie = chartSeries.length;

  const serieDiaVals = useMemo(() => {
    if (!productoActivo) return [];
    const s = serieConsumoProducto(lineasVentana, Number(productoActivo.id), desde, 'dia');
    return s.map((x) => x.unidades);
  }, [productoActivo, lineasVentana, desde]);

  const metricasProducto = useMemo(() => {
    if (!productoActivo) return null;
    const id = Number(productoActivo.id);
    const stock = productoActivo.stockCantidad ?? 0;
    const uDia = promedioDiarioProducto(lineasVentana, id, desde);
    const vendidas = unidadesVendidasProducto(lineasVentana, id);
    const tend = tendenciaDesdeSerieDiaria(serieDiaVals);
    const pr = puntoReorden(uDia, leadTimeDias, stockSeguridad);
    const proj30 = stockProyectadoLineal(stock, uDia, 30);
    const proj60 = stockProyectadoLineal(stock, uDia, 60);
    const proj90 = stockProyectadoLineal(stock, uDia, 90);
    return { stock, uDia, vendidas, tend, pr, proj30, proj60, proj90 };
  }, [productoActivo, lineasVentana, desde, serieDiaVals, leadTimeDias, stockSeguridad]);

  const filtroSubFn = useMemo(() => {
    return (p: Producto) => productoPerteneceCatSub(p, categoriaSel, subcategoriaSel);
  }, [categoriaSel, subcategoriaSel]);

  const pastelSub = useMemo(
    () => participacionPorProducto(productos, lineasVentana, filtroSubFn),
    [productos, lineasVentana, filtroSubFn]
  );

  const consumoGlobalSub = useMemo(() => {
    let u = 0;
    for (const l of lineasVentana) {
      const pr = productos.find((x) => Number(x.id) === l.productoId);
      if (pr && filtroSubFn(pr)) u += l.cantidad;
    }
    const dias = Math.max(1, diasAnalisis);
    const promD = u / dias;
    const pred30 = promD * 30;
    const pred90 = promD * 90;
    return { unidades: u, promD, pred30, pred90 };
  }, [lineasVentana, productos, filtroSubFn, diasAnalisis]);

  const rankingSub = useMemo(() => {
    const rows = productosFiltrados.map((p) => {
      const id = Number(p.id);
      const u = unidadesVendidasProducto(lineasVentana, id);
      const stock = p.stockCantidad ?? 0;
      const ratio = stock > 0 ? u / stock : u;
      return { p, u, stock, ratio };
    });
    const masDemandados = [...rows].filter((r) => r.u > 0).sort((a, b) => b.u - a.u).slice(0, 8);
    const menorRot = [...rows]
      .filter((r) => r.stock > 0)
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 8);
    return { masDemandados, menorRot };
  }, [productosFiltrados, lineasVentana]);

  const tendenciaBadge = (t: 'alta' | 'baja' | 'estable') => {
    if (t === 'alta') return { variant: 'warning' as const, label: 'Alta' };
    if (t === 'baja') return { variant: 'info' as const, label: 'Baja' };
    return { variant: 'success' as const, label: 'Estable' };
  };

  const productoFijoNombre = useMemo(() => {
    if (!productoIdExterno) return null;
    const p = productos.find((x) => String(x.id) === String(productoIdExterno));
    return p?.nombre ?? null;
  }, [productoIdExterno, productos]);

  return (
    <div className="space-y-6">
      {error && (
        <Card padding="md" className="border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        </Card>
      )}

      <Card variant="elevated" padding="lg">
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          {soloConsumo ? 'Opciones de análisis' : 'Filtros y período de análisis'}
        </h3>
        {soloConsumo && (
          <p className="text-sm mb-4 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
            {productoFijoNombre ?? 'Producto no encontrado'}
          </p>
        )}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
            soloConsumo
              ? 'lg:grid-cols-2'
              : haySubcategoriasEnCategoria
                ? 'lg:grid-cols-4'
                : 'lg:grid-cols-3'
          }`}
        >
          {!soloConsumo && (
            <>
              <Select
                label="Categoría"
                value={categoriaSel}
                onChange={(e) => {
                  setCategoriaSel(e.target.value);
                  setProductoSel('');
                }}
                options={[
                  { value: '', label: 'Todas las categorías' },
                  ...categoriasOpciones.filter(Boolean).map((c) => ({ value: c, label: c })),
                ]}
                fullWidth
              />
              {haySubcategoriasEnCategoria && (
                <Select
                  label="Subcategoría"
                  value={subcategoriaSel}
                  onChange={(e) => {
                    setSubcategoriaSel(e.target.value);
                    setProductoSel('');
                  }}
                  options={[
                    { value: '', label: 'Todas en la categoría' },
                    ...subcategoriasOpciones.filter(Boolean).map((s) => ({ value: s, label: s })),
                  ]}
                  fullWidth
                />
              )}
              <Select
                label="Producto"
                value={productoSel}
                onChange={(e) => setProductoSel(e.target.value)}
                options={[
                  { value: '', label: 'Todos (vista lista)' },
                  ...productosFiltrados.map((p) => ({ value: String(p.id), label: p.nombre })),
                ]}
                fullWidth
              />
            </>
          )}
          <Select
            label="Periodo de análisis"
            value={String(diasAnalisis)}
            onChange={(e) => setDiasAnalisis(Number(e.target.value) as 90 | 180)}
            options={[
              { value: '90', label: 'Últimos 90 días' },
              { value: '180', label: 'Últimos 180 días' },
            ]}
            fullWidth
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Select
            label="Agrupación gráficas de consumo"
            value={granularidad}
            onChange={(e) => setGranularidad(e.target.value as Gran)}
            options={[
              { value: 'dia', label: 'Diario' },
              { value: 'semana', label: 'Semanal' },
              { value: 'mes', label: 'Mensual' },
            ]}
            fullWidth
          />
          <Input
            type="number"
            min={0}
            label="Tiempo de entrega (días) — punto de reorden"
            value={leadTimeDias}
            onChange={(e) => setLeadTimeDias(Math.max(0, Number(e.target.value) || 0))}
            fullWidth
          />
          <Input
            type="number"
            min={0}
            label="Stock de seguridad (unidades)"
            value={stockSeguridad}
            onChange={(e) => setStockSeguridad(Math.max(0, Number(e.target.value) || 0))}
            fullWidth
          />
        </div>
        {!soloConsumo && (
          <p className="text-xs mt-3" style={{ color: 'var(--encabezados-alterno)' }}>
            Pedidos contados: {pedidosContados}. La subcategoría solo aplica si en el texto de categoría hay separador
            (p. ej. «Cabello &gt; Shampoos»); si no existe, no se muestra filtro ni columna de subcategoría.
          </p>
        )}
        {soloConsumo && (
          <p className="text-xs mt-3" style={{ color: 'var(--encabezados-alterno)' }}>
            Pedidos contados en el sistema: {pedidosContados}.
          </p>
        )}
      </Card>

      {!soloConsumo && categoriaSel && subcategoriaSel && (
        <Card variant="elevated" padding="lg">
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Vista subcategoría: {categoriaSel} · {subcategoriaSel}
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Consumo global en el periodo: <strong>{consumoGlobalSub.unidades}</strong> u. · promedio diario{' '}
            <strong>{consumoGlobalSub.promD.toFixed(2)}</strong> u/día. Proyección lineal agregada ~30 días:{' '}
            <strong>{consumoGlobalSub.pred30.toFixed(0)}</strong> u. · ~90 días:{' '}
            <strong>{consumoGlobalSub.pred90.toFixed(0)}</strong> u.
          </p>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Participación por producto (unidades vendidas)
          </h3>
          <SvgPastelParticipacion segmentos={pastelSub} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                Mayor demanda (unidades)
              </h3>
              <Table headers={['Producto', 'Unidades', 'Stock']}>
                {rankingSub.masDemandados.map((r) => (
                  <TableRow key={r.p.id}>
                    <TableCell className="font-medium">{r.p.nombre}</TableCell>
                    <TableCell>{r.u}</TableCell>
                    <TableCell>{r.stock}</TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                Menor rotación (u. vendidas / stock)
              </h3>
              <Table headers={['Producto', 'Unidades', 'Stock', 'Ratio']}>
                {rankingSub.menorRot.map((r) => (
                  <TableRow key={r.p.id}>
                    <TableCell className="font-medium">{r.p.nombre}</TableCell>
                    <TableCell>{r.u}</TableCell>
                    <TableCell>{r.stock}</TableCell>
                    <TableCell>{r.ratio.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          </div>
        </Card>
      )}

      {!soloConsumo && (
      <Card variant="elevated" padding="lg">
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Listado de productos {categoriaSel || subcategoriaSel ? '(filtrado)' : ''}
        </h3>
        <div className="overflow-auto rounded border" style={{ borderColor: 'var(--encabezados-alterno)', maxHeight: ALTO_LISTA }}>
          <Table headers={headersListadoProductos}>
            {!loading &&
              productosFiltrados.map((p) => {
                const id = Number(p.id);
                const { categoriaPrincipal, subcategoria } = parseCategoriaSub(p.categoria || '');
                const subTxt = subcategoria.trim();
                const stock = p.stockCantidad ?? 0;
                const u = unidadesVendidasProducto(lineasVentana, id);
                const uDia = promedioDiarioProducto(lineasVentana, id, desde);
                const pr = puntoReorden(uDia, leadTimeDias, stockSeguridad);
                const vals = serieConsumoProducto(lineasVentana, id, desde, 'dia').map((x) => x.unidades);
                const tend = tendenciaDesdeSerieDiaria(vals);
                const tb = tendenciaBadge(tend);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="font-semibold text-left underline-offset-2 hover:underline"
                        style={{ color: 'var(--menu-texto-principal)' }}
                        onClick={() => setProductoSel(String(p.id))}
                      >
                        {p.nombre}
                      </button>
                    </TableCell>
                    <TableCell>{categoriaPrincipal}</TableCell>
                    {mostrarColumnaSubcategoria && (
                      <TableCell>{subTxt ? subTxt : ''}</TableCell>
                    )}
                    <TableCell>{stock}</TableCell>
                    <TableCell>{u}</TableCell>
                    <TableCell>{pr}</TableCell>
                    <TableCell>
                      <Badge variant={tb.variant} size="sm">
                        {tb.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
          </Table>
        </div>
      </Card>
      )}

      {soloConsumo && !productoFijoNombre && !loading && (
        <Card padding="md">
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            No hay datos de este producto en el catálogo cargado.
          </p>
        </Card>
      )}

      {productoActivo && metricasProducto && (
        <>
          <Card variant="elevated" padding="lg">
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              Detalle: {productoActivo.nombre}
            </h3>
            <div className="flex flex-wrap gap-3 mb-4">
              <Badge variant="info">Stock actual: {metricasProducto.stock}</Badge>
              <Badge variant="info">Vendido ({diasAnalisis}d): {metricasProducto.vendidas} u.</Badge>
              <Badge variant={tendenciaBadge(metricasProducto.tend).variant}>
                Tendencia: {etiquetaTendencia(metricasProducto.tend)}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                  Punto de reorden
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>
                  {metricasProducto.pr} u.
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                  Consumo medio/día × entrega + seguridad
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                  Stock proyectado 30 d
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>
                  {metricasProducto.proj30.toFixed(0)} u.
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                  Stock proyectado 60 d
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>
                  {metricasProducto.proj60.toFixed(0)} u.
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                  Stock proyectado 90 d
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>
                  {metricasProducto.proj90.toFixed(0)} u.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  Consumo — líneas
                </h3>
                <Button type="button" size="sm" variant="outline" onClick={() => setGraficaModal('linea')}>
                  Ver grande
                </Button>
              </div>
              <div className="rounded-lg border p-2" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                <SvgLineaVentas series={chartSeries} />
              </div>
              {puntosSerie <= 1 && (
                <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                  Hay pocos datos para línea (solo {puntosSerie} período). Prueba cambiar período o agrupación.
                </p>
              )}
            </Card>
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  Consumo — barras
                </h3>
                <Button type="button" size="sm" variant="outline" onClick={() => setGraficaModal('barras')}>
                  Ver grande
                </Button>
              </div>
              <div className="rounded-lg border p-2" style={{ borderColor: 'var(--encabezados-alterno)' }}>
                <SvgBarrasVentas series={chartSeries} />
              </div>
              {puntosSerie === 1 && (
                <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                  Solo hay 1 período con ventas; por eso ves una sola barra.
                </p>
              )}
            </Card>
          </div>

          <Card variant="elevated" padding="lg">
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
              Histórico de movimientos (entradas, salidas y ajustes)
            </h3>
            <div className="overflow-auto rounded border mb-3" style={{ borderColor: 'var(--encabezados-alterno)', maxHeight: 320 }}>
              <Table headers={['Fecha', 'Tipo', 'Cantidad', 'Stock antes', 'Stock después', 'Motivo', 'Referencia']}>
                {movimientosApi.map((m) => {
                  const tb = badgeTipoMovimiento(m.tipo);
                  const ref = m.referenciaTipo && m.referenciaId ? `${m.referenciaTipo} #${m.referenciaId}` : '—';
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.creadoEn).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                      <TableCell>
                        <Badge variant={tb.variant} size="sm">
                          {tb.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.cantidad}</TableCell>
                      <TableCell>{m.stockAntes ?? '—'}</TableCell>
                      <TableCell>{m.stockDespues ?? '—'}</TableCell>
                      <TableCell>{etiquetaMotivo(m.motivo)}</TableCell>
                      <TableCell>{ref}</TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            </div>
            {movimientosLoading && (
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Cargando movimientos desde backend...
              </p>
            )}
            {!movimientosLoading && movimientosApi.length === 0 && !movimientosError && (
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                No hay movimientos para este producto en el período seleccionado.
              </p>
            )}
            {movimientosError && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {movimientosError}
              </p>
            )}
          </Card>

          <Card variant="elevated" padding="lg">
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              Tabla de consumo ({granularidad === 'dia' ? 'diario' : granularidad === 'semana' ? 'semanal' : 'mensual'})
            </h3>
            <div className="overflow-auto rounded border" style={{ borderColor: 'var(--encabezados-alterno)', maxHeight: 320 }}>
              <Table headers={['Periodo', 'Unidades', 'Importe']}>
                {[...serieActiva].reverse().map((row) => (
                  <TableRow key={row.clave}>
                    <TableCell>{row.etiqueta}</TableCell>
                    <TableCell>{row.unidades}</TableCell>
                    <TableCell>{row.monto.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          </Card>
        </>
      )}

      {!soloConsumo && (
      <Card variant="elevated" padding="lg">
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Uso para decisiones
        </h3>
        <ul className="list-disc pl-5 text-sm space-y-1" style={{ color: 'var(--encabezados-alterno)' }}>
          <li>Priorizar reabastecimiento si el stock actual está por debajo del punto de reorden.</li>
          <li>Detectar sobreinventario: alta tendencia de baja en consumo con stock alto.</li>
          <li>Detectar baja rotación: listado «menor rotación» y productos con pocas ventas y stock persistente.</li>
          <li>Ajustar compras y exhibición usando la vista por subcategoría y el pastel de participación.</li>
        </ul>
      </Card>
      )}

      <Drawer
        open={graficaModal !== null}
        title={graficaModal === 'linea' ? 'Consumo por período — vista ampliada (línea)' : 'Consumo por período — vista ampliada (barras)'}
        onClose={() => setGraficaModal(null)}
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Períodos con datos: {puntosSerie}. Agrupación: {granularidad}.
          </p>
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--encabezados-alterno)' }}>
            {graficaModal === 'linea' ? (
              <SvgLineaVentas series={chartSeries} height={220} />
            ) : (
              <SvgBarrasVentas series={chartSeries} height={220} />
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
