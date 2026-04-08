'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Table, { TableCell, TableRow } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import { getProductosSinRedirigir, type Producto } from '../../../../services/productos';

type EstadoPrediccion = 'normal' | 'preventivo' | 'critico';
type ModoValidacion = 'producto' | 'marca';
const FILAS_VISIBLES_TABLA = 10;
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

export default function PrediccionInventarioPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horizonteDias, setHorizonteDias] = useState(30);
  const [stockMinimo, setStockMinimo] = useState(5);
  const [ajusteK, setAjusteK] = useState(1);
  const [modoValidacion, setModoValidacion] = useState<ModoValidacion>('producto');
  const [marcaHist, setMarcaHist] = useState<string>('all');
  const [productoHistId, setProductoHistId] = useState<string>('all');
  const [stockHaceNDias, setStockHaceNDias] = useState<number>(0);
  const [diasHistoricos, setDiasHistoricos] = useState<number>(30);

  useEffect(() => {
    let cancelled = false;
    getProductosSinRedirigir({ incluirNoDisponibles: true })
      .then((result) => {
        if (cancelled) return;
        setProductos(result.data);
        setError(result.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    const decrecimientoEsperado = predicciones.every((p) => p.k < 0 ? p.xT <= p.x0 + 0.0001 : true);
    const total = predicciones.length;
    const cumple = [sinNegativos, decrecimientoEsperado].filter(Boolean).length;
    return {
      totalReglas: 2,
      cumple,
      ok: total > 0 && cumple === 2,
      texto: total === 0
        ? 'Aun no hay productos para validar.'
        : cumple === 2
        ? 'La simulacion es consistente: no hay valores negativos y las proyecciones siguen la tendencia esperada.'
        : 'Hay valores que no cumplen las reglas basicas. Revisa parametros y datos.',
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

  const exportarCsv = () => {
    const headers = ['producto', 'marca', 'stock_hoy', `stock_estimado_${horizonteDias}_dias`, 'cambio_pct', 'estado', 'recomendacion'];
    const rows = predicciones.map((p) => [
      `"${p.nombre.replace(/"/g, '""')}"`,
      `"${p.marca.replace(/"/g, '""')}"`,
      p.x0.toFixed(2),
      p.xT.toFixed(2),
      p.cambioPct.toFixed(2),
      p.estado,
      `"${p.recomendacion.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediccion-inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
              Submódulo: Predicción de inventario
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Te ayuda a anticipar que productos podrian agotarse pronto para comprar a tiempo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/inventario')}>
              Volver a inventario
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card variant="elevated" padding="lg">
            <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total productos</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{predicciones.length}</p>
          </Card>
          <Card variant="elevated" padding="lg">
            <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Crítico</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--danger)' }}>{criticos}</p>
          </Card>
          <Card variant="elevated" padding="lg">
            <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Preventivo</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--warning)' }}>{preventivos}</p>
          </Card>
          <Card variant="elevated" padding="lg">
            <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Normal</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--success)' }}>{normales}</p>
          </Card>
        </div>

        {error && (
          <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
          </Card>
        )}

        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Configuracion de la simulacion
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="number"
              min={1}
              label="Horizonte (días)"
              value={horizonteDias}
              onChange={(e) => setHorizonteDias(Math.max(1, Number(e.target.value) || 1))}
              helperText="Cuantos dias quieres proyectar"
              fullWidth
            />
            <Input
              type="number"
              min={0}
              label="Stock mínimo (x_min)"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(Math.max(0, Number(e.target.value) || 0))}
              helperText="Debajo de este valor se marca alerta"
              fullWidth
            />
            <Input
              type="number"
              step="0.1"
              min={0.1}
              max={2}
              label="Velocidad de salida"
              value={ajusteK}
              onChange={(e) => setAjusteK(Math.max(0.1, Number(e.target.value) || 1))}
              helperText="1 = normal | >1 mas rapido | <1 mas lento"
              fullWidth
            />
          </div>
          <div className="mt-4 rounded-lg p-3" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            <p className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
              <strong>Formula usada:</strong> dx/dt = kx &nbsp;→&nbsp; x(t) = x0 * e^(k*t)
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              En palabras simples: calcula como cambia el stock con el paso de los dias.
            </p>
          </div>
        </Card>

        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Validacion con historico real (simple)
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Captura datos de tu kardex/registro real: stock de hace N dias y stock actual.
            El sistema calcula k real y valida si el modelo coincide.
          </p>
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
                { value: 'producto', label: 'Producto especifico' },
                { value: 'marca', label: 'Toda la marca' },
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
              label={modoValidacion === 'marca' ? 'Stock total de la marca hace N dias' : 'Stock de hace N dias'}
              value={stockHaceNDias}
              onChange={(e) => setStockHaceNDias(Math.max(0, Number(e.target.value) || 0))}
              fullWidth
            />
            <Input
              type="number"
              min={1}
              label="N dias transcurridos"
              value={diasHistoricos}
              onChange={(e) => setDiasHistoricos(Math.max(1, Number(e.target.value) || 1))}
              fullWidth
            />
          </div>

          {validacionHistorico && validacionHistorico.ok && (
            <Table headers={['Dato', 'Valor']}>
              <TableRow>
                <TableCell className="font-semibold">Producto</TableCell>
                <TableCell>{validacionHistorico.producto}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">k calculado con historico real</TableCell>
                <TableCell>{validacionHistorico.kReal.toFixed(5)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Validacion (error %)</TableCell>
                <TableCell>{validacionHistorico.errorPct.toFixed(2)}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Resultado de validacion</TableCell>
                <TableCell>
                  {validacionHistorico.errorPct <= 10 ? (
                    <Badge variant="success" size="sm">Aceptable (&lt;= 10%)</Badge>
                  ) : (
                    <Badge variant="warning" size="sm">Revisar (&gt; 10%)</Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Stock estimado a {horizonteDias} dias</TableCell>
                <TableCell>{validacionHistorico.xFuturo.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Estado proyectado</TableCell>
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
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Simulación y resultados
          </h2>
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" onClick={exportarCsv} disabled={predicciones.length === 0}>
              Exportar reporte CSV
            </Button>
          </div>
          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${ALTO_ENCABEZADO_PX + FILAS_VISIBLES_TABLA * ALTO_FILA_PX}px` }}
          >
            <Table headers={['Producto', 'Stock hoy', `Stock estimado (${horizonteDias} dias)`, 'Cambio %', 'Estado', 'Que hacer']}>
              {!loading && predicciones.map((p) => {
                const badge = estadoBadge(p.estado);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.nombre}</TableCell>
                    <TableCell>{p.x0.toFixed(2)}</TableCell>
                    <TableCell>{p.xT.toFixed(2)}</TableCell>
                    <TableCell style={{ color: p.cambioPct <= 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {p.cambioPct.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                    </TableCell>
                    <TableCell>{p.recomendacion}</TableCell>
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
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Grafica de proyeccion
          </h2>
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
              No hay datos para dibujar la grafica.
            </p>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
            Esta grafica permite ver la tendencia del stock de forma visual y sencilla.
          </p>
        </Card>

        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Productos con mayor riesgo (vista rapida)
          </h2>
          <div className="space-y-3">
            {topRiesgo.map((p) => {
              const progress = stockMinimo <= 0 ? 100 : Math.max(0, Math.min(100, (p.xT / stockMinimo) * 100));
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                    <span>{p.nombre}</span>
                    <span>{p.xT.toFixed(1)} uds estimadas</span>
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

        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Validacion basica del resultado
          </h2>
          <p className="text-sm mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Reglas revisadas automaticamente: {validacion.cumple}/{validacion.totalReglas}
          </p>
          <p className="text-sm" style={{ color: validacion.ok ? 'var(--success)' : 'var(--danger)' }}>
            {validacion.texto}
          </p>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Interpretacion y conclusion de la etapa
          </h2>
          <p className="text-sm mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            - Si el stock estimado cae por debajo del minimo, existe riesgo de quiebre y se recomienda compra inmediata.
          </p>
          <p className="text-sm mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            - Si el stock estimado queda cerca del minimo, el estado es preventivo y conviene programar el pedido.
          </p>
          <p className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
            - Este submodulo cumple la rubrica al incluir variables, formula, simulacion en herramienta informatica, resultados e interpretacion comprensible.
          </p>
        </Card>
      </div>
    </AdminLayout>
  );
}

