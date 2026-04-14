'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Table, { TableCell, TableRow } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import { Drawer } from '../../../../components/ui/Drawer';
import { InventarioAnalisisCategoriasPanel } from '../../../../components/inventario/InventarioAnalisisCategoriasPanel';
import { getProductosSinRedirigir, type Producto } from '../../../../services/productos';
import {
  cargarLineasVentasDesdePedidosOnline,
  filtrarLineasDesdeFecha,
  filtrarLineasPorProducto,
  promedioUnidadesPorDia,
  proyeccionDemandaUnidades,
  type LineaVentaProducto,
} from '../../../../utils/inventarioVentasOnline';

type EstadoPrediccion = 'normal' | 'preventivo' | 'critico';
type ModoValidacion = 'producto' | 'marca';
const FILAS_VISIBLES_TABLA = 15;
const ALTO_FILA_PX = 44;
const ALTO_ENCABEZADO_PX = 44;

interface PrediccionProducto {
  id: string | number;
  nombre: string;
  marca: string;
  x0: number;
  k: number;
  xT: number;
  estado: EstadoPrediccion;
  recomendacion: string;
  cambioPct: number;
}

interface PuntoGrafica {
  dia: number;
  valor: number;
}

function estimarKPorProducto(producto: Producto): number {
  const stock = Math.max(0, producto.stockCantidad ?? 0);
  if (stock >= 25) return -0.01;
  if (stock >= 10) return -0.02;
  if (stock > 0) return -0.035;
  return -0.05;
}

function estadoDesdePrediccion(xT: number, xMin: number): EstadoPrediccion {
  if (xT <= xMin) return 'critico';
  if (xT <= xMin * 1.5) return 'preventivo';
  return 'normal';
}

function estadoBadge(estado: EstadoPrediccion): { variant: 'success' | 'warning' | 'danger'; label: string } {
  if (estado === 'critico') return { variant: 'danger', label: 'Crítico' };
  if (estado === 'preventivo') return { variant: 'warning', label: 'Preventivo' };
  return { variant: 'success', label: 'Normal' };
}

type MetricaVentaProd = { unidades: number; promD: number; demH: number };

function cruceModeloVentas(
  p: PrediccionProducto,
  mv: MetricaVentaProd,
  stockMinimo: number
): { variant: 'success' | 'warning' | 'danger' | 'default'; label: string } {
  if (mv.unidades === 0) {
    if (p.estado === 'critico') {
      return { variant: 'warning', label: 'Stock bajo, casi sin pedidos' };
    }
    return { variant: 'default', label: 'Sin ventas en el período' };
  }
  if (mv.demH > p.xT + 0.01 && mv.demH > stockMinimo) {
    return { variant: 'warning', label: 'Pedidos más altos que el modelo' };
  }
  if ((p.estado === 'critico' || p.estado === 'preventivo') && mv.unidades >= 3) {
    return { variant: 'danger', label: 'Prioridad: se vende y el stock cae' };
  }
  if (p.estado === 'normal' && mv.demH <= p.x0 + 0.01) return { variant: 'success', label: 'Modelo y ventas alineados' };
  return { variant: 'default', label: 'Revisar con calma' };
}

type SugerenciaCelda = { accion: string; detalle: string };

function sugerenciaAccion(p: PrediccionProducto, mv: MetricaVentaProd, horizonteDias: number): SugerenciaCelda {
  const detalle =
    mv.unidades > 0
      ? `Pedidos recientes: ${mv.unidades} u. Si el ritmo se mantuviera, en ${horizonteDias} días saldrían unas ${mv.demH.toFixed(0)} u. (extrapolación lineal).`
      : 'No hay unidades en pedidos válidos en la ventana que elegiste; prueba más días en configuración o revisa si el producto tiene movimiento.';
  return { accion: p.recomendacion, detalle };
}

function sugerenciaExportText(s: SugerenciaCelda): string {
  return `${s.accion} ${s.detalle}`;
}

function ventanaDesdeHorizonte(h: number): 7 | 30 | 90 {
  const r = Math.round(Math.max(1, h));
  if (r <= 10) return 7;
  if (r <= 45) return 30;
  return 90;
}

export default function PrediccionInventarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lineasVentas, setLineasVentas] = useState<LineaVentaProducto[]>([]);
  const [pedidosVentasCount, setPedidosVentasCount] = useState(0);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);
  const [diasVentanaVentas, setDiasVentanaVentas] = useState<7 | 30 | 90>(30);

  const [horizonteDias, setHorizonteDias] = useState(30);
  const [stockMinimo, setStockMinimo] = useState(5);
  const [ajusteK, setAjusteK] = useState(1);
  const [modoValidacion, setModoValidacion] = useState<ModoValidacion>('producto');
  const [modoTecnico, setModoTecnico] = useState(false);
  const [marcaHist, setMarcaHist] = useState<string>('all');
  const [productoHistId, setProductoHistId] = useState<string>('all');
  const [stockHaceNDias, setStockHaceNDias] = useState<number>(0);
  const [diasHistoricos, setDiasHistoricos] = useState<number>(30);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getProductosSinRedirigir({ incluirNoDisponibles: true }),
      cargarLineasVentasDesdePedidosOnline(),
    ])
      .then(([prodRes, ventasRes]) => {
        if (cancelled) return;
        setProductos(prodRes.data);
        setError(prodRes.error);
        setLineasVentas(ventasRes.lineas);
        setPedidosVentasCount(ventasRes.pedidosAnalizados);
        setErrorVentas(ventasRes.error ?? null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar datos');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pid = searchParams.get('producto');
    if (!pid || productos.length === 0) return;
    const exists = productos.some((p) => String(p.id) === String(pid));
    if (!exists) return;
    const sp = new URLSearchParams(searchParams.toString());
    if (!sp.has('tab')) return;
    sp.delete('tab');
    router.replace(`/admin/inventario/prediccion?${sp.toString()}`, { scroll: false });
  }, [searchParams, productos, router]);

  const predicciones = useMemo<PrediccionProducto[]>(() => {
    return productos.map((p) => {
      const x0 = Math.max(0, p.stockCantidad ?? 0);
      const kBase = estimarKPorProducto(p);
      const k = kBase * ajusteK;
      const xT = x0 * Math.exp(k * horizonteDias);
      const cambioPct = x0 > 0 ? ((xT - x0) / x0) * 100 : 0;
      const estado = estadoDesdePrediccion(xT, stockMinimo);
      const recomendacion =
        estado === 'critico'
          ? 'Reabastecer de inmediato.'
          : estado === 'preventivo'
          ? 'Programar compra en el siguiente ciclo.'
          : 'Mantener monitoreo normal.';

      return {
        id: p.id,
        nombre: p.nombre,
        marca: (p.marca && p.marca.trim()) ? p.marca.trim() : 'Sin marca',
        x0,
        k,
        xT,
        cambioPct,
        estado,
        recomendacion,
      };
    });
  }, [productos, ajusteK, horizonteDias, stockMinimo]);

  const criticos = predicciones.filter((p) => p.estado === 'critico').length;
  const preventivos = predicciones.filter((p) => p.estado === 'preventivo').length;
  const normales = predicciones.filter((p) => p.estado === 'normal').length;
  const topRiesgo = [...predicciones]
    .sort((a, b) => a.xT - b.xT)
    .slice(0, 5);

  const validacion = useMemo(() => {
    const sinNegativos = predicciones.every((p) => p.xT >= 0);
    const decrecimientoEsperado = predicciones.every((p) => (p.k < 0 ? p.xT <= p.x0 + 0.0001 : true));
    const total = predicciones.length;
    const cumple = [sinNegativos, decrecimientoEsperado].filter(Boolean).length;
    const reglas = [
      {
        ok: sinNegativos,
        titulo: 'Stock futuro no negativo',
        ayuda: 'El modelo no debe proyectar existencias por debajo de cero.',
      },
      {
        ok: decrecimientoEsperado,
        titulo: 'Salida de inventario coherente',
        ayuda: 'Con consumo estimado, el stock proyectado no debería subir solo.',
      },
    ] as const;
    return {
      totalReglas: 2,
      cumple,
      ok: total > 0 && cumple === 2,
      reglas,
      resumen:
        total === 0
          ? 'Sin productos no hay comprobación automática.'
          : cumple === 2
            ? 'Las comprobaciones automáticas pasaron.'
            : 'Revisa parámetros o datos: alguna comprobación no pasó.',
    };
  }, [predicciones]);

  const opcionesProductos = useMemo(
    () => {
      const base = marcaHist === 'all'
        ? predicciones
        : predicciones.filter((p) => p.marca === marcaHist);

      return [
        { value: 'all', label: 'Selecciona un producto' },
        ...base.map((p) => ({ value: String(p.id), label: `${p.nombre} (${p.marca})` })),
      ];
    },
    [predicciones, marcaHist]
  );

  const opcionesMarcas = useMemo(
    () => [
      { value: 'all', label: 'Selecciona una marca' },
      ...Array.from(new Set(predicciones.map((p) => p.marca))).sort((a, b) => a.localeCompare(b))
        .map((m) => ({ value: m, label: m })),
    ],
    [predicciones]
  );

  const validacionHistorico = useMemo(() => {
    if (modoValidacion === 'marca') {
      if (marcaHist === 'all') return null;
      const productosMarca = predicciones.filter((p) => p.marca === marcaHist);
      if (productosMarca.length === 0) return null;
      const xActual = productosMarca.reduce((acc, p) => acc + p.x0, 0);
      const xPasado = Math.max(0, stockHaceNDias);
      const dias = Math.max(1, diasHistoricos);

      if (xPasado <= 0 || xActual <= 0) {
        return {
          ok: false,
          mensaje: 'Para calcular con historico real de la marca, captura un stock pasado y actual mayores a 0.',
        } as const;
      }

      const kReal = Math.log(xActual / xPasado) / dias;
      const xHoyCalculado = xPasado * Math.exp(kReal * dias);
      const errorPct = xActual !== 0 ? Math.abs((xHoyCalculado - xActual) / xActual) * 100 : 0;
      const xFuturo = xActual * Math.exp(kReal * horizonteDias);

      return {
        ok: true,
        producto: `Marca ${marcaHist} (${productosMarca.length} productos)`,
        xPasado,
        xActual,
        dias,
        kReal,
        xHoyCalculado,
        errorPct,
        xFuturo,
        estadoFuturo: estadoDesdePrediccion(xFuturo, stockMinimo),
      } as const;
    }

    if (productoHistId === 'all') return null;
    const producto = predicciones.find((p) => String(p.id) === productoHistId);
    if (!producto) return null;
    const xActual = producto.x0;
    const xPasado = Math.max(0, stockHaceNDias);
    const dias = Math.max(1, diasHistoricos);

    if (xPasado <= 0 || xActual <= 0) {
      return {
        ok: false,
        mensaje: 'Para calcular con historico real, captura un stock pasado y actual mayores a 0.',
      } as const;
    }

    const kReal = Math.log(xActual / xPasado) / dias;
    const xHoyCalculado = xPasado * Math.exp(kReal * dias);
    const errorPct = xActual !== 0 ? Math.abs((xHoyCalculado - xActual) / xActual) * 100 : 0;
    const xFuturo = xActual * Math.exp(kReal * horizonteDias);

    return {
      ok: true,
      producto: producto.nombre,
      xPasado,
      xActual,
      dias,
      kReal,
      xHoyCalculado,
      errorPct,
      xFuturo,
      estadoFuturo: estadoDesdePrediccion(xFuturo, stockMinimo),
    } as const;
  }, [modoValidacion, marcaHist, productoHistId, predicciones, stockHaceNDias, diasHistoricos, horizonteDias, stockMinimo]);

  const puntosGrafica = useMemo<PuntoGrafica[]>(() => {
    const base =
      validacionHistorico && validacionHistorico.ok
        ? { x0: validacionHistorico.xActual, k: validacionHistorico.kReal }
        : predicciones[0]
        ? { x0: predicciones[0].x0, k: predicciones[0].k }
        : null;

    if (!base) return [];
    const tramos = [0, Math.round(horizonteDias / 3), Math.round((2 * horizonteDias) / 3), horizonteDias];
    return tramos.map((d) => ({ dia: d, valor: base.x0 * Math.exp(base.k * d) }));
  }, [validacionHistorico, predicciones, horizonteDias]);

  const graficaPath = useMemo(() => {
    if (puntosGrafica.length === 0) return '';
    const width = 520;
    const height = 180;
    const padding = 24;
    const maxY = Math.max(...puntosGrafica.map((p) => p.valor), 1);
    const minY = Math.min(...puntosGrafica.map((p) => p.valor), 0);
    const yRange = Math.max(maxY - minY, 1);
    const xMax = Math.max(...puntosGrafica.map((p) => p.dia), 1);
    const toX = (d: number) => padding + (d / xMax) * (width - padding * 2);
    const toY = (v: number) => height - padding - ((v - minY) / yRange) * (height - padding * 2);
    return puntosGrafica
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.dia).toFixed(1)} ${toY(p.valor).toFixed(1)}`)
      .join(' ');
  }, [puntosGrafica]);

  const desdeVentas = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - diasVentanaVentas);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [diasVentanaVentas]);

  const lineasVentanaVentas = useMemo(
    () => filtrarLineasDesdeFecha(lineasVentas, desdeVentas),
    [lineasVentas, desdeVentas]
  );

  const contextoPedidos = useMemo(() => {
    const u = lineasVentanaVentas.reduce((s, l) => s + l.cantidad, 0);
    return {
      unidades: u,
      lineas: lineasVentanaVentas.length,
      pedidos: pedidosVentasCount,
      dias: diasVentanaVentas,
    };
  }, [pedidosVentasCount, lineasVentanaVentas, diasVentanaVentas]);

  const metricasVentasPorProducto = useMemo(() => {
    const m = new Map<number, MetricaVentaProd>();
    for (const p of predicciones) {
      const pid = Number(p.id);
      if (!Number.isFinite(pid)) continue;
      const lines = filtrarLineasPorProducto(lineasVentanaVentas, pid);
      const unidades = lines.reduce((s, l) => s + l.cantidad, 0);
      const promD = promedioUnidadesPorDia(lines);
      const demH = proyeccionDemandaUnidades(promD, horizonteDias);
      m.set(pid, { unidades, promD, demH });
    }
    return m;
  }, [predicciones, lineasVentanaVentas, horizonteDias]);

  const drawerProductoId = useMemo(() => {
    const raw = searchParams.get('producto');
    if (!raw || productos.length === 0) return null;
    return productos.some((p) => String(p.id) === String(raw)) ? raw : null;
  }, [searchParams, productos]);

  const abrirDetalleProducto = (id: string | number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('tab');
    sp.set('producto', String(id));
    router.replace(`/admin/inventario/prediccion?${sp.toString()}`, { scroll: false });
  };

  const cerrarDrawerProducto = () => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('tab');
    if (!sp.has('producto')) return;
    sp.delete('producto');
    const q = sp.toString();
    router.replace(q ? `/admin/inventario/prediccion?${q}` : '/admin/inventario/prediccion', { scroll: false });
  };

  const drawerTitulo = useMemo(() => {
    if (!drawerProductoId) return 'Detalle de producto';
    const p = predicciones.find((x) => String(x.id) === drawerProductoId);
    return p ? `Consumo y reorden · ${p.nombre}` : 'Detalle de producto';
  }, [drawerProductoId, predicciones]);

  const exportarCsv = () => {
    const headers = [
      'producto',
      'marca',
      'stock_actual',
      `unidades_vendidas_${diasVentanaVentas}_dias`,
      `demanda_desde_ventas_${horizonteDias}_dias`,
      `stock_proyectado_modelo_${horizonteDias}_dias`,
      'variacion_stock_pct',
      'alerta_modelo',
      'comparacion_ventas_vs_modelo',
      'sugerencia',
    ];
    const rows = predicciones.map((p) => {
      const mv = metricasVentasPorProducto.get(Number(p.id)) ?? { unidades: 0, promD: 0, demH: 0 };
      const cr = cruceModeloVentas(p, mv, stockMinimo);
      const q = sugerenciaExportText(sugerenciaAccion(p, mv, horizonteDias));
      return [
        `"${p.nombre.replace(/"/g, '""')}"`,
        `"${p.marca.replace(/"/g, '""')}"`,
        p.x0.toFixed(2),
        String(mv.unidades),
        mv.demH.toFixed(2),
        p.xT.toFixed(2),
        p.cambioPct.toFixed(2),
        p.estado,
        `"${cr.label.replace(/"/g, '""')}"`,
        `"${q.replace(/"/g, '""')}"`,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediccion-inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const seccionesNav = [
    { id: 'prediccion-parametros', label: '1. Configuración' },
    { id: 'prediccion-simulacion', label: '2. Resultados' },
    { id: 'prediccion-validacion', label: '3. Validación' },
    { id: 'prediccion-categorias', label: '4. Categorías' },
    { id: 'prediccion-cierre', label: '5. Qué significa' },
  ] as const;

  const irASeccion = (id: string) => {
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) el.open = true;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
              Predicción de inventario
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Cruza el stock proyectado con ventas reales de la tienda. La tabla central es la guía principal; «Ver»
              abre una vista superpuesta con consumo y punto de reorden del producto. El menú lleva a configuración,
              validación opcional y análisis por categorías.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/inventario')}>
            Volver a inventario
          </Button>
        </div>

        <nav
          className="sticky top-0 z-[5] flex flex-wrap gap-2 border-b py-3 mb-6 -mx-1 px-1 scroll-mt-20"
          style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'var(--fondos-suaves)' }}
          aria-label="Ir a una sección de la página"
        >
          {seccionesNav.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                irASeccion(item.id);
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-90"
              style={{
                color: 'var(--menu-texto-principal)',
                border: `1px solid var(--encabezados-alterno)`,
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {error && (
          <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
          </Card>
        )}
        {errorVentas && (
          <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--warning)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
              Ventas online: {errorVentas}
            </p>
          </Card>
        )}

        <details
          id="prediccion-parametros"
          className="scroll-mt-28 mb-6 rounded-lg border px-4 py-3"
          style={{ borderColor: 'var(--encabezados-alterno)' }}
        >
          <summary
            className="cursor-pointer text-lg font-semibold list-none [&::-webkit-details-marker]:hidden"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            Configuración — 1. Parámetros del modelo y de los pedidos
          </summary>
          <div className="space-y-6 pt-4">
        <Card variant="elevated" padding="lg">
          <div className="mb-3 flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setModoTecnico((v) => !v)}>
              {modoTecnico ? 'Ocultar modo técnico' : 'Mostrar modo técnico'}
            </Button>
          </div>
          <h2 className="text-lg font-semibold mb-2 sr-only">
            1. Parámetros del modelo y de los pedidos
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Afectan la tabla de resultados: cuántos días mirar hacia adelante, cuándo marcar alerta y qué tan rápido baja
            el stock en la simulación. La ventana de pedidos define el período de «ventas recientes» en la tabla.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="number"
              min={1}
              label="Días a proyectar"
              value={horizonteDias}
              onChange={(e) => setHorizonteDias(Math.max(1, Number(e.target.value) || 1))}
              helperText="Hasta cuándo se calcula el stock futuro y la demanda desde ventas"
              fullWidth
            />
            <Input
              type="number"
              min={0}
              label="Stock mínimo (alerta)"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(Math.max(0, Number(e.target.value) || 0))}
              helperText="Si el modelo cae por debajo, el estado pasa a preventivo o crítico"
              fullWidth
            />
            <Input
              type="number"
              step="0.1"
              min={0.1}
              max={2}
              label={modoTecnico ? 'Ritmo de consumo (ajuste técnico)' : 'Ritmo de salida'}
              value={ajusteK}
              onChange={(e) => setAjusteK(Math.max(0.1, Number(e.target.value) || 1))}
              helperText={
                modoTecnico
                  ? '1 = ritmo base; mayor = el inventario cae más rápido en la simulación.'
                  : 'Déjalo en 1 salvo que quieras simular un consumo más rápido o más lento.'
              }
              fullWidth
            />
          </div>
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 items-end" style={{ borderColor: 'var(--encabezados-alterno)' }}>
            <div className="min-w-[160px]">
              <Select
                label="Ventas recientes: período (días)"
                value={String(diasVentanaVentas)}
                onChange={(e) => setDiasVentanaVentas(Number(e.target.value) as 7 | 30 | 90)}
                options={[
                  { value: '7', label: '7 días' },
                  { value: '30', label: '30 días' },
                  { value: '90', label: '90 días' },
                ]}
                fullWidth
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDiasVentanaVentas(ventanaDesdeHorizonte(horizonteDias))}
            >
              Igualar período con «Días a proyectar»
            </Button>
          </div>
          <p className="text-xs mt-3 flex flex-wrap gap-2 items-center" style={{ color: 'var(--encabezados-alterno)' }}>
            <span>Líneas de pedido en ese período</span>
            <Badge variant="info">{loading ? 'Cargando…' : `${lineasVentanaVentas.length}`}</Badge>
          </p>
          {!modoTecnico && (
            <div className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--encabezados-alterno)' }}>
              <p style={{ color: 'var(--menu-texto-principal)' }} className="font-medium mb-1">
                Recomendación rápida
              </p>
              <p style={{ color: 'var(--encabezados-alterno)' }}>
                Si no tienes un caso especial, usa: <strong>30 días</strong>, <strong>stock mínimo 5</strong> y
                <strong> ritmo 1</strong>. Luego revisa la columna «Acción sugerida» en la tabla.
              </p>
            </div>
          )}
          {modoTecnico && (
            <details className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--encabezados-alterno)' }}>
              <summary className="cursor-pointer font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                Fórmulas breves (modo técnico)
              </summary>
              <div className="mt-3 space-y-2 pl-1" style={{ color: 'var(--encabezados-alterno)' }}>
                <p>
                  <strong style={{ color: 'var(--menu-texto-principal)' }}>Stock simulado:</strong> stock futuro ≈ stock
                  actual × e<sup>kt</sup>.
                </p>
                <p>
                  <strong style={{ color: 'var(--menu-texto-principal)' }}>Salida estimada:</strong> (unidades vendidas en
                  la ventana ÷ días de ventana) × días a proyectar.
                </p>
              </div>
            </details>
          )}
        </Card>
          </div>
        </details>

        <div id="prediccion-simulacion" className="scroll-mt-28 space-y-6 mb-6">
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          2. Resultados
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
          Esta tabla te ayuda a decidir compras. Verás qué productos requieren acción hoy, cuáles vigilar y cuáles están
          estables según stock actual y ventas recientes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Catálogo simulado</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{predicciones.length}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>Productos con stock en el modelo</p>
          </Card>
          <Card variant="elevated" padding="lg">
            <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Crítico</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--danger)' }}>{criticos}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>Stock proyectado bajo el mínimo</p>
          </Card>
          <Card variant="elevated" padding="lg">
            <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Preventivo</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--warning)' }}>{preventivos}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>Cerca del mínimo: conviene planear</p>
          </Card>
          <Card variant="elevated" padding="lg">
            <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Normal</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--success)' }}>{normales}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>Por encima del umbral de alerta</p>
          </Card>
        </div>

        <Card variant="elevated" padding="lg" className="mb-6 scroll-mt-24">
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Tabla principal
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Unidades = piezas vendidas en pedidos pagados a entregados. «Salida estimada» es una referencia rápida para
            decidir compras, no un pronóstico exacto.
          </p>
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" onClick={exportarCsv} disabled={predicciones.length === 0}>
              Exportar CSV
            </Button>
          </div>
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: `${ALTO_ENCABEZADO_PX + FILAS_VISIBLES_TABLA * ALTO_FILA_PX}px`, scrollbarGutter: 'stable' }}
          >
            <Table
              className="min-w-[1260px]"
              headersLegibles
              stickyFirstColumn
              headers={[
                'Producto',
                'Stock actual',
                `Unidades vendidas (${diasVentanaVentas} d)`,
                `Salida estimada (${horizonteDias} d)`,
                `Stock estimado (${horizonteDias} d)`,
                'Variación %',
                'Nivel de alerta',
                'Riesgo actual',
                'Acción sugerida',
                'Detalle',
              ]}
            >
              {!loading &&
                predicciones.map((p) => {
                  const badge = estadoBadge(p.estado);
                  const mv = metricasVentasPorProducto.get(Number(p.id)) ?? { unidades: 0, promD: 0, demH: 0 };
                  const cr = cruceModeloVentas(p, mv, stockMinimo);
                  const sug = sugerenciaAccion(p, mv, horizonteDias);
                  return (
                    <TableRow key={p.id}>
                      <TableCell stickyLeft className="font-semibold whitespace-nowrap min-w-[180px] max-w-[260px] truncate">
                        {p.nombre}
                      </TableCell>
                      <TableCell>{p.x0.toFixed(1)}</TableCell>
                      <TableCell>{mv.unidades}</TableCell>
                      <TableCell>{mv.demH.toFixed(1)}</TableCell>
                      <TableCell>{p.xT.toFixed(1)}</TableCell>
                      <TableCell style={{ color: p.cambioPct <= 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {p.cambioPct.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} size="sm">
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cr.variant} size="sm">
                          {cr.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm align-top min-w-[320px] max-w-[420px]">
                        <p className="font-medium leading-snug" style={{ color: 'var(--menu-texto-principal)' }}>
                          {sug.accion}
                        </p>
                        <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: 'var(--encabezados-alterno)' }}>
                          {sug.detalle}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-[90px]">
                        <Button size="sm" variant="outline" onClick={() => abrirDetalleProducto(p.id)}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </Table>
          </div>
          {loading && (
            <p className="text-sm mt-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Cargando productos para simular...
            </p>
          )}
        </Card>

        <Card variant="elevated" padding="lg" className="mb-6">
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Evolución estimada del stock
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
            Te muestra cómo podría verse el stock en los próximos días con la configuración actual.
          </p>
          {puntosGrafica.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 520 180" width="100%" height="180" role="img" aria-label="Grafica de proyeccion de stock">
                <line x1="24" y1="156" x2="496" y2="156" stroke="var(--encabezados-alterno)" strokeWidth="1" />
                <line x1="24" y1="24" x2="24" y2="156" stroke="var(--encabezados-alterno)" strokeWidth="1" />
                <path d={graficaPath} fill="none" stroke="var(--warning)" strokeWidth="3" />
                {puntosGrafica.map((p) => {
                  const xMax = Math.max(...puntosGrafica.map((x) => x.dia), 1);
                  const maxY = Math.max(...puntosGrafica.map((x) => x.valor), 1);
                  const minY = Math.min(...puntosGrafica.map((x) => x.valor), 0);
                  const yRange = Math.max(maxY - minY, 1);
                  const x = 24 + (p.dia / xMax) * (520 - 48);
                  const y = 180 - 24 - ((p.valor - minY) / yRange) * (180 - 48);
                  return (
                    <g key={`p-${p.dia}`}>
                      <circle cx={x} cy={y} r="4" fill="var(--danger)" />
                      <text x={x} y={170} textAnchor="middle" fontSize="11" fill="var(--menu-texto-principal)">
                        {p.dia}d
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Completa validación con histórico o espera a que haya productos cargados.
            </p>
          )}
        </Card>

        <Card variant="elevated" padding="lg" className="mb-6">
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
            Mayor riesgo de quiebre (ordenados)
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            La barra compara stock proyectado por el modelo con tu stock mínimo de alerta: llena hacia la derecha =
            más cerca del umbral (100% ≈ llega al mínimo).
          </p>
          <div className="space-y-3">
            {topRiesgo.map((p) => {
              const progress = stockMinimo <= 0 ? 100 : Math.max(0, Math.min(100, (p.xT / stockMinimo) * 100));
              const mvR = metricasVentasPorProducto.get(Number(p.id));
              const vendidas =
                mvR && mvR.unidades > 0
                  ? `${mvR.unidades} u. vendidas en ${diasVentanaVentas} d`
                  : 'Sin unidades en pedidos en la ventana';
              return (
                <div key={p.id}>
                  <div className="flex flex-wrap justify-between items-center gap-2 text-sm mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                    <span className="font-medium">{p.nombre}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                        Modelo → {p.xT.toFixed(1)} u. · {vendidas}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => abrirDetalleProducto(p.id)}>
                        Ver consumo
                      </Button>
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress <= 100 ? 'var(--warning)' : 'var(--success)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {!loading && topRiesgo.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                No hay datos suficientes para mostrar riesgo.
              </p>
            )}
          </div>
        </Card>

        </div>

        <details
          id="prediccion-validacion"
          className="scroll-mt-28 mb-6 rounded-lg border px-4 py-3"
          style={{ borderColor: 'var(--encabezados-alterno)' }}
        >
          <summary
            className="cursor-pointer text-lg font-semibold list-none [&::-webkit-details-marker]:hidden"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            3. Validación con tus datos (opcional)
          </summary>
          <div className="space-y-6 pt-4">
        <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
          Opcional: introduce stock antiguo y stock actual (o por marca). Verás si la velocidad de bajada encaja con la
          simulación.
        </p>
        <Card variant="elevated" padding="lg" className="mb-6">
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Entrada de histórico
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Select
              label="Modo"
              value={modoValidacion}
              onChange={(e) => {
                const modo = e.target.value as ModoValidacion;
                setModoValidacion(modo);
                setProductoHistId('all');
              }}
              options={[
                { value: 'producto', label: 'Un solo producto' },
                { value: 'marca', label: 'Todos los de una marca' },
              ]}
              fullWidth
            />
            <Select
              label="Marca"
              value={marcaHist}
              onChange={(e) => {
                setMarcaHist(e.target.value);
                setProductoHistId('all');
              }}
              options={opcionesMarcas}
              fullWidth
            />
            {modoValidacion === 'producto' ? (
            <Select
              label="Producto"
              value={productoHistId}
              onChange={(e) => setProductoHistId(e.target.value)}
              options={opcionesProductos}
              fullWidth
            />
            ) : (
              <Input
                label="Producto"
                value={marcaHist === 'all' ? 'Selecciona una marca' : `Todos los productos de ${marcaHist}`}
                disabled
                fullWidth
              />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              type="number"
              min={0}
              label={modoValidacion === 'marca' ? 'Stock total de la marca (hace N días)' : 'Stock del producto (hace N días)'}
              value={stockHaceNDias}
              onChange={(e) => setStockHaceNDias(Math.max(0, Number(e.target.value) || 0))}
              fullWidth
            />
            <Input
              type="number"
              min={1}
              label="Días entre el stock antiguo y hoy"
              value={diasHistoricos}
              onChange={(e) => setDiasHistoricos(Math.max(1, Number(e.target.value) || 1))}
              fullWidth
            />
          </div>

          {validacionHistorico && validacionHistorico.ok && (
            <Table headers={['Concepto', 'Valor']} headersLegibles>
              <TableRow>
                <TableCell className="font-semibold">Ámbito</TableCell>
                <TableCell>{validacionHistorico.producto}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Ritmo real (constante k)</TableCell>
                <TableCell>{validacionHistorico.kReal.toFixed(5)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Desviación frente al modelo</TableCell>
                <TableCell>{validacionHistorico.errorPct.toFixed(2)}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">¿Encaja con el modelo?</TableCell>
                <TableCell>
                  {validacionHistorico.errorPct <= 10 ? (
                    <Badge variant="success" size="sm">Sí, dentro del 10%</Badge>
                  ) : (
                    <Badge variant="warning" size="sm">Convienen más datos o revisar supuestos</Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Stock que sugeriría el ritmo real en {horizonteDias} días</TableCell>
                <TableCell>{validacionHistorico.xFuturo.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Alerta con ese ritmo</TableCell>
                <TableCell>
                  <Badge variant={estadoBadge(validacionHistorico.estadoFuturo).variant} size="sm">
                    {estadoBadge(validacionHistorico.estadoFuturo).label}
                  </Badge>
                </TableCell>
              </TableRow>
            </Table>
          )}
          {validacionHistorico && !validacionHistorico.ok && (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {validacionHistorico.mensaje}
            </p>
          )}
        </Card>

        <Card variant="elevated" padding="lg" className="mb-6">
          <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
            Comprobación rápida del modelo
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            {validacion.resumen}
          </p>
          <ul className="space-y-3">
            {validacion.reglas.map((r) => (
              <li
                key={r.titulo}
                className="flex gap-3 rounded-lg border p-3 text-sm"
                style={{ borderColor: 'var(--encabezados-alterno)' }}
              >
                <span className="text-lg shrink-0" aria-hidden style={{ color: r.ok ? 'var(--success)' : 'var(--danger)' }}>
                  {r.ok ? '✓' : '✗'}
                </span>
                <div>
                  <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                    {r.titulo}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    {r.ayuda}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
          </div>
        </details>

        <details
          id="prediccion-categorias"
          className="scroll-mt-28 mb-6 rounded-lg border px-4 py-3"
          style={{ borderColor: 'var(--encabezados-alterno)' }}
        >
          <summary
            className="cursor-pointer text-lg font-semibold list-none [&::-webkit-details-marker]:hidden"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            4. Categorías, rotación y consumo (análisis completo)
          </summary>
          <div className="pt-4">
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Mismos pedidos que la tabla. Aquí puedes filtrar por categoría y ver rankings; no incluye entradas de compra
            hasta integrar almacén.
          </p>
          <InventarioAnalisisCategoriasPanel
            productos={productos}
            lineasVentas={lineasVentas}
            pedidosContados={pedidosVentasCount}
            loading={loading}
            error={errorVentas}
          />
          </div>
        </details>

        <details
          id="prediccion-cierre"
          className="scroll-mt-28 mb-6 rounded-lg border px-4 py-3"
          style={{ borderColor: 'var(--encabezados-alterno)' }}
        >
          <summary
            className="cursor-pointer text-lg font-semibold list-none [&::-webkit-details-marker]:hidden"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            5. Cómo leer modelo y ventas juntos
          </summary>
          <div className="pt-4">
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-2 sr-only">
            5. Cómo leer modelo y ventas juntos
          </h2>
          <div className="grid gap-3 mb-6">
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--encabezados-alterno)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--warning)' }}>
                Riesgo de quiebre
              </p>
              <p className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                Si el stock estimado cae bajo el mínimo y además «Riesgo actual» marca prioridad, actúa antes en
                compra o exhibición.
              </p>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--encabezados-alterno)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--enlaces-textos-interactivos)' }}>
                Posible sobrestock
              </p>
              <p className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                Si el modelo avisa pero casi no hay pedidos en la ventana, puede sobrar inventario o faltar visibilidad
                en la tienda.
              </p>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--encabezados-alterno)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--success)' }}>
                Una sola lectura
              </p>
              <p className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                La tabla junta simulación de stock, ventas recientes y una sugerencia en lenguaje claro para decidir el
                siguiente paso.
              </p>
            </div>
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'var(--fondos-suaves)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              Pedidos que alimentan las columnas
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              <span>
                <strong style={{ color: 'var(--menu-texto-principal)' }}>{contextoPedidos.pedidos}</strong> pedidos
                analizados
              </span>
              <span>
                <strong style={{ color: 'var(--menu-texto-principal)' }}>{contextoPedidos.lineas}</strong> líneas en los
                últimos {contextoPedidos.dias} días
              </span>
              <span>
                <strong style={{ color: 'var(--menu-texto-principal)' }}>{contextoPedidos.unidades}</strong> unidades
                vendidas en ese período
              </span>
            </div>
            {contextoPedidos.unidades === 0 && (
              <p className="text-xs mt-3" style={{ color: 'var(--warning)' }}>
                No hay unidades contadas: amplía «Ventas recientes» en configuración o revisa estados de pedido
                (pagado → entregado).
              </p>
            )}
          </div>
        </Card>
          </div>
        </details>

        <Drawer open={Boolean(drawerProductoId)} title={drawerTitulo} onClose={cerrarDrawerProducto}>
          {drawerProductoId && (
            <InventarioAnalisisCategoriasPanel
              productos={productos}
              lineasVentas={lineasVentas}
              pedidosContados={pedidosVentasCount}
              loading={loading}
              error={errorVentas}
              productoIdExterno={drawerProductoId}
              variante="soloConsumoProducto"
            />
          )}
        </Drawer>
      </div>
    </AdminLayout>
  );
}

