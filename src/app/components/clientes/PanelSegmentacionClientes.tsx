'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  BrainCircuit,
  CircleDollarSign,
  RefreshCw,
  ShoppingBag,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Table, { TableCell, TableRow } from '../ui/Table';
import {
  listarSegmentacionClientes,
  type ModeloClusteringApi,
  type SegmentacionClienteApi,
} from '../../services/clientes';

const SEGMENTOS = [
  'Sin compras registradas',
  'Recientes de consumo bajo',
  'Clientes ocasionales por reactivar',
  'Frecuentes de alto valor',
];

/**
 * Mismo color por segmento en las 4 gráficas y en los badges de la tabla
 * (Badge.tsx usa exactamente estas variables para cada variant). Usar las
 * variables CSS directamente (no un hex fijo) para que respete el tema
 * claro/oscuro sin duplicar la paleta de marca en otro lugar.
 */
const COLOR_SEGMENTO: Record<string, string> = {
  'Sin compras registradas': 'var(--enlaces-textos-interactivos)', // cluster 1 · Badge "info"
  'Recientes de consumo bajo': 'var(--logo-branding)', // cluster 0 · Badge "default"
  'Frecuentes de alto valor': 'var(--success)', // cluster 2 · Badge "success"
  'Clientes ocasionales por reactivar': 'var(--warning)', // cluster 3 · Badge "warning"
};

/**
 * El validador de paleta (skill dataviz) marca ΔE insuficiente entre el azul y el
 * verde de marca para un lector con daltonismo — no se puede recolorear sin romper
 * la identidad ya usada en los badges de la tabla, así que el scatter (única gráfica
 * donde el color es la única codificación por punto) usa además una forma distinta
 * por segmento como codificación secundaria.
 */
/** Cortes limpios en unidades reales para los ticks del scatter (ver formatoTickGastoLog). */
const CORTES_GASTO = [0, 100, 1000, 10000, 100000, 1000000];
const CORTES_FRECUENCIA = [0, 1, 2, 5, 10, 20, 50, 100, 200];

const FORMA_SEGMENTO: Record<
  string,
  'circle' | 'diamond' | 'triangle' | 'square'
> = {
  'Sin compras registradas': 'diamond',
  'Recientes de consumo bajo': 'circle',
  'Frecuentes de alto valor': 'triangle',
  'Clientes ocasionales por reactivar': 'square',
};

function varianteSegmento(
  cluster: number
): 'default' | 'success' | 'warning' | 'info' {
  if (cluster === 2) return 'success';
  if (cluster === 3) return 'warning';
  if (cluster === 0) return 'info';
  return 'default';
}

function moneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(valor);
}

function monedaCorta(valor: number): string {
  if (valor >= 1000) return `$${(valor / 1000).toFixed(1)}k`;
  return `$${Math.round(valor)}`;
}

/**
 * Formatea un tick del eje Y del scatter (log-transformado) a un monto limpio y redondo.
 * `v` es el valor en espacio log10(gasto+1); se deshace el log y se redondea antes de
 * formatear para no arrastrar el ruido de punto flotante del log/exp (999.999998 → $1k,
 * no "$999.999998").
 */
function formatoTickGastoLog(v: number): string {
  const real = Math.round(10 ** v - 1);
  if (real >= 1_000_000) return `$${Math.round(real / 1_000_000)}M`;
  if (real >= 1000) return `$${Math.round(real / 1000)}k`;
  return `$${real}`;
}

/** Tooltip compartido: mismos tokens de color que el resto de la pantalla, no colores de recharts por defecto. */
function TooltipGrafica({
  active,
  payload,
  label,
  render,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; value?: number | string; name?: string }>;
  label?: string;
  render: (payload: Record<string, unknown>, label?: string) => ReactNode;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-sm shadow-lg"
      style={{
        backgroundColor: 'var(--fondo-general)',
        borderColor: 'var(--borde-sutil)',
        color: 'var(--menu-texto-principal)',
      }}
    >
      {render(payload[0].payload, label)}
    </div>
  );
}

interface PanelSegmentacionClientesProps {
  /**
   * Base de la ruta del botón "Ver" — cada contexto tiene su propia ficha de cliente
   * (admin/clientes-crm/[id] vs. operacion/clientes-crm/[id]), con acciones distintas
   * en cada una (editar/eliminar son admin-only).
   */
  rutaBasePerfil?: string;
}

export default function PanelSegmentacionClientes({
  rutaBasePerfil = '/admin/clientes-crm',
}: PanelSegmentacionClientesProps) {
  const router = useRouter();
  const [clientes, setClientes] = useState<SegmentacionClienteApi[]>([]);
  const [modelo, setModelo] = useState<ModeloClusteringApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [segmento, setSegmento] = useState('');

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const respuesta = await listarSegmentacionClientes(true);
      setClientes(respuesta.data);
      setModelo(respuesta.modelo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo calcular la segmentación de clientes.'
      );
      setClientes([]);
      setModelo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const resumen = useMemo(
    () =>
      clientes.reduce<Record<string, number>>((acc, cliente) => {
        acc[cliente.segmento] = (acc[cliente.segmento] ?? 0) + 1;
        return acc;
      }, {}),
    [clientes]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clientes.filter((cliente) => {
      const coincideTexto =
        !q ||
        cliente.clienteNombre.toLowerCase().includes(q) ||
        cliente.clienteEmail.toLowerCase().includes(q);
      const coincideSegmento = !segmento || cliente.segmento === segmento;
      return coincideTexto && coincideSegmento;
    });
  }, [busqueda, clientes, segmento]);

  const gastoTotal = clientes.reduce(
    (total, cliente) => total + cliente.variables.gasto_total,
    0
  );

  /** Conteo y gasto promedio por segmento — base de las gráficas 1 y 2. */
  const datosPorSegmento = useMemo(
    () =>
      SEGMENTOS.map((nombre) => {
        const enSegmento = clientes.filter((c) => c.segmento === nombre);
        const gastoPromedio =
          enSegmento.length > 0
            ? enSegmento.reduce((sum, c) => sum + c.variables.gasto_total, 0) /
              enSegmento.length
            : 0;
        return {
          segmento: nombre,
          conteo: enSegmento.length,
          gastoPromedio,
          color: COLOR_SEGMENTO[nombre],
        };
      }),
    [clientes]
  );

  /**
   * Un punto por cliente (frecuencia vs. gasto), agrupado por segmento para poder pintar
   * cada grupo con su color/forma. La mayoría de clientes tiene gasto y frecuencia bajos
   * (muchos en 0 — el segmento "Sin compras registradas" cae exactamente en x=0,y=0) y
   * unos pocos de alto valor estiran el eje hasta los $80k, así que se grafica log10(v+1)
   * en vez del valor crudo: aplana la cola larga sin descartar los ceros (log10(0+1)=0,
   * un punto real y visible en el origen, no -Infinity) — el valor real sin transformar
   * se conserva en `xReal`/`yReal` para el tooltip y los ejes.
   *
   * Jitter: la frecuencia es entera, así que sin ruido 1010 clientes caen en un puñado de
   * columnas verticales exactas (se ve a rayas, no a nube). Se suma un offset aleatorio
   * ±0.3 a la frecuencia ANTES del log — solo afecta dónde se dibuja el punto, nunca el
   * valor mostrado en el tooltip ni en los ejes (eso usa xReal/yReal sin jitter).
   * Con eso no basta para el racimo de clientes sin ninguna compra (frecuencia=0 Y
   * gasto=0 a la vez): además de la columna, también son todos el mismo punto en Y, así
   * que ese grupo puntual recibe también un jitter vertical pequeño (0 a +5 pesos antes
   * del log) para que se lea como una nube de puntos, no un solo diamante.
   */
  const dispersionPorSegmento = useMemo(
    () =>
      SEGMENTOS.map((nombre) => ({
        segmento: nombre,
        puntos: clientes
          .filter((c) => c.segmento === nombre)
          .map((c) => {
            const xReal = c.variables.frecuencia_total;
            const yReal = c.variables.gasto_total;
            const sinNingunaCompra = xReal === 0 && yReal === 0;
            const jitterX = (Math.random() - 0.5) * 0.6; // ±0.3
            const jitterY = sinNingunaCompra ? Math.random() * 5 : 0; // 0 a +5, solo racimo del origen
            return {
              x: Math.log10(xReal + jitterX + 1),
              y: Math.log10(yReal + jitterY + 1),
              xReal,
              yReal,
              nombre: c.clienteNombre,
            };
          }),
      })),
    [clientes]
  );

  /** Tope real de cada eje (sin jitter) — el dominio del gráfico no debe extenderse más allá de esto. */
  const frecuenciaMaximaReal = useMemo(
    () => clientes.reduce((max, c) => Math.max(max, c.variables.frecuencia_total), 0),
    [clientes]
  );
  const gastoMaximoReal = useMemo(
    () => clientes.reduce((max, c) => Math.max(max, c.variables.gasto_total), 0),
    [clientes]
  );

  /**
   * Ticks explícitos en vez de dejar que recharts genere "números redondos" en el espacio
   * ya transformado (log): un tick "redondo" ahí (p. ej. 2) se traduce al deshacer el log
   * a 10²-1=99, no a $100 — de ahí salían los "$99"/"$100000.0k" rotos. Se listan los
   * cortes limpios en unidades reales, se recorta a los que caben en el dato real (nunca
   * más allá del máximo real) y solo entonces se pasan por log10(v+1).
   */
  const ticksGasto = useMemo(
    () => CORTES_GASTO.filter((v) => v <= gastoMaximoReal).map((v) => Math.log10(v + 1)),
    [gastoMaximoReal]
  );
  const ticksFrecuencia = useMemo(
    () =>
      CORTES_FRECUENCIA.filter((v) => v <= frecuenciaMaximaReal).map((v) => Math.log10(v + 1)),
    [frecuenciaMaximaReal]
  );
  // +1.3 de colchón: el jitter puede empujar el punto más extremo hasta 0.3/5 unidades
  // más allá del valor real, y no queremos que el dominio recorte ese punto.
  const dominioXMax = Math.log10(frecuenciaMaximaReal + 1.3 + 1);
  const dominioYMax = Math.log10(gastoMaximoReal + 5 + 1);

  /**
   * Reparto de canal global: proporción real del gasto (online vs. en salón), ponderada
   * por el gasto de cada cliente — no el promedio de `proporcion_online` por cliente, que
   * subestimaría el canal online al pesar igual a una clienta sin compras que a una con
   * miles de pesos en línea.
   */
  const proporcionCanal = useMemo(() => {
    const totales = clientes.reduce(
      (acc, c) => {
        acc.online += c.datosOrigen.gastoOnline;
        acc.local += c.datosOrigen.gastoLocal;
        return acc;
      },
      { online: 0, local: 0 }
    );
    const total = totales.online + totales.local;
    return [
      {
        name: 'Online',
        value: totales.online,
        pct: total > 0 ? (totales.online / total) * 100 : 0,
        color: 'var(--enlaces-textos-interactivos)',
      },
      {
        name: 'En salón',
        value: totales.local,
        pct: total > 0 ? (totales.local / total) * 100 : 0,
        color: 'var(--logo-branding)',
      },
    ];
  }, [clientes]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1
            className="text-elegant-title"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            Segmentación de clientes
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--encabezados-alterno)' }}
          >
            Perfiles comerciales calculados desde compras online y ventas locales
          </p>
        </div>
        <Button
          variant="outline"
          onClick={cargar}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Calculando…' : 'Actualizar segmentos'}
        </Button>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--fondos-suaves)' }}
          >
            <BrainCircuit
              size={26}
              style={{ color: 'var(--encabezados-alterno)' }}
            />
          </div>
          <div className="flex-1">
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Modelo K-Means de patrones de compra
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--encabezados-alterno)' }}
            >
              El modelo asigna el grupo más cercano usando frecuencia, productos,
              servicios, gasto, ticket, canal y recencia. Es una segmentación, no
              una probabilidad ni una calificación del cliente.
            </p>
          </div>
          {modelo && (
            <div className="text-sm lg:text-right">
              <p style={{ color: 'var(--menu-texto-principal)' }}>
                Entrenamiento: {modelo.filasEntrenamiento.toLocaleString('es-MX')} clientes
              </p>
              <p style={{ color: 'var(--encabezados-alterno)' }}>
                Silhouette: {modelo.silhouette.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Card
          padding="md"
          className="border-l-4"
          style={{ borderLeftColor: 'var(--danger)' }}
        >
          <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>
            {error}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {SEGMENTOS.map((nombre, index) => (
          <Card key={nombre} variant="elevated" padding="lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--encabezados-alterno)' }}
                >
                  {nombre}
                </p>
                <p
                  className="text-3xl font-bold mt-2"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  {loading ? '…' : resumen[nombre] ?? 0}
                </p>
              </div>
              <Badge
                variant={varianteSegmento(
                  nombre === 'Sin compras registradas'
                    ? 1
                    : nombre === 'Recientes de consumo bajo'
                      ? 0
                      : nombre === 'Frecuentes de alto valor'
                        ? 2
                        : 3
                )}
                size="sm"
              >
                Grupo {index + 1}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3">
            <Users size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Clientes segmentados
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                {clientes.length}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Compras registradas
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                {clientes.reduce(
                  (total, cliente) =>
                    total + cliente.variables.frecuencia_total,
                  0
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3">
            <CircleDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Gasto histórico analizado
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                {moneda(gastoTotal)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {!loading && clientes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="elevated" padding="lg">
            <h3
              className="text-base font-semibold mb-4"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Clientes por segmento
            </h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={datosPorSegmento} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--borde-sutil)" vertical={false} />
                  <XAxis
                    dataKey="segmento"
                    tick={{ fill: 'var(--encabezados-alterno)', fontSize: 11 }}
                    tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 14)}…` : v)}
                    axisLine={{ stroke: 'var(--borde-sutil)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--encabezados-alterno)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--fondos-suaves)', opacity: 0.4 }}
                    content={
                      <TooltipGrafica
                        render={(p) => (
                          <>
                            <p className="font-semibold">{String(p.segmento)}</p>
                            <p style={{ color: 'var(--encabezados-alterno)' }}>
                              {String(p.conteo)} clientes
                            </p>
                          </>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="conteo" radius={[4, 4, 0, 0]} maxBarSize={64}>
                    {datosPorSegmento.map((entry) => (
                      <Cell key={entry.segmento} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <h3
              className="text-base font-semibold mb-4"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Gasto promedio por segmento
            </h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={datosPorSegmento} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--borde-sutil)" vertical={false} />
                  <XAxis
                    dataKey="segmento"
                    tick={{ fill: 'var(--encabezados-alterno)', fontSize: 11 }}
                    tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 14)}…` : v)}
                    axisLine={{ stroke: 'var(--borde-sutil)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--encabezados-alterno)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => monedaCorta(v)}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--fondos-suaves)', opacity: 0.4 }}
                    content={
                      <TooltipGrafica
                        render={(p) => (
                          <>
                            <p className="font-semibold">{String(p.segmento)}</p>
                            <p style={{ color: 'var(--encabezados-alterno)' }}>
                              {moneda(Number(p.gastoPromedio))} promedio
                            </p>
                          </>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="gastoPromedio" radius={[4, 4, 0, 0]} maxBarSize={64}>
                    {datosPorSegmento.map((entry) => (
                      <Cell key={entry.segmento} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <h3
              className="text-base font-semibold mb-1"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Gasto vs. frecuencia de compra
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
              Cada punto es una clienta — color y forma indican su segmento. Escala
              logarítmica: la mayoría de clientes tiene valores bajos y unas pocas de
              alto valor estirarían el eje sin ella.
            </p>
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--borde-sutil)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Compras"
                    domain={[0, dominioXMax]}
                    ticks={ticksFrecuencia}
                    tick={{ fill: 'var(--encabezados-alterno)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--borde-sutil)' }}
                    tickLine={false}
                    tickFormatter={(v: number) => Math.round(10 ** v - 1).toLocaleString('es-MX')}
                    label={{
                      value: 'Frecuencia de compra',
                      position: 'bottom',
                      offset: 0,
                      fill: 'var(--encabezados-alterno)',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Gasto"
                    domain={[0, dominioYMax]}
                    ticks={ticksGasto}
                    tick={{ fill: 'var(--encabezados-alterno)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatoTickGastoLog}
                  />
                  <ZAxis range={[36, 36]} />
                  <Tooltip
                    cursor={{ stroke: 'var(--encabezados-alterno)', strokeDasharray: '3 3' }}
                    content={
                      <TooltipGrafica
                        render={(p) => (
                          <>
                            <p className="font-semibold">{String(p.nombre)}</p>
                            <p style={{ color: 'var(--encabezados-alterno)' }}>
                              {String(p.xReal)} compras · {moneda(Number(p.yReal))}
                            </p>
                          </>
                        )}
                      />
                    }
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={10}
                    wrapperStyle={{
                      fontSize: 11,
                      color: 'var(--encabezados-alterno)',
                      lineHeight: '1.3',
                      width: 112,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  />
                  {dispersionPorSegmento.map(({ segmento, puntos }) => (
                    <Scatter
                      key={segmento}
                      name={segmento}
                      data={puntos}
                      fill={COLOR_SEGMENTO[segmento]}
                      shape={FORMA_SEGMENTO[segmento]}
                      fillOpacity={0.75}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <h3
              className="text-base font-semibold mb-1"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Canal de compra
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
              Reparto del gasto total: tienda en línea vs. venta en salón
            </p>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip
                    content={
                      <TooltipGrafica
                        render={(p) => (
                          <>
                            <p className="font-semibold">{String(p.name)}</p>
                            <p style={{ color: 'var(--encabezados-alterno)' }}>
                              {moneda(Number(p.value))} · {Number(p.pct).toFixed(1)}%
                            </p>
                          </>
                        )}
                      />
                    }
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 12, color: 'var(--encabezados-alterno)' }}
                  />
                  <Pie
                    data={proporcionCanal}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    label={(props: unknown) => `${Number((props as { pct?: number }).pct ?? 0).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {proporcionCanal.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      <Card variant="elevated" padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            placeholder="Buscar por nombre o correo…"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            fullWidth
          />
          <Select
            value={segmento}
            onChange={(event) => setSegmento(event.target.value)}
            options={[
              { value: '', label: 'Todos los segmentos' },
              ...SEGMENTOS.map((nombre) => ({
                value: nombre,
                label: nombre,
              })),
            ]}
            fullWidth
          />
        </div>

        {loading ? (
          <p
            className="py-10 text-center text-sm"
            style={{ color: 'var(--encabezados-alterno)' }}
          >
            Calculando segmentos con el historial de compras…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table
              headers={[
                'Cliente',
                'Segmento',
                'Compras',
                'Gasto',
                'Recencia',
                'Acción sugerida',
                'Perfil',
              ]}
              headerSutil
            >
              {filtrados.map((cliente) => (
                <TableRow key={cliente.clienteId}>
                  <TableCell>
                    <p className="font-semibold">{cliente.clienteNombre}</p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: 'var(--encabezados-alterno)' }}
                    >
                      {cliente.clienteEmail}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={varianteSegmento(cliente.cluster)} size="sm">
                      {cliente.segmento}
                    </Badge>
                  </TableCell>
                  <TableCell>{cliente.variables.frecuencia_total}</TableCell>
                  <TableCell className="font-semibold">
                    {moneda(cliente.variables.gasto_total)}
                  </TableCell>
                  <TableCell>
                    {cliente.variables.recencia_dias.toLocaleString('es-MX')} días
                  </TableCell>
                  <TableCell
                    className="min-w-[220px] max-w-[320px]"
                    style={{ whiteSpace: 'normal' }}
                  >
                    <span className="text-sm">{cliente.accionSugerida}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `${rutaBasePerfil}/${cliente.clienteId}`
                        )
                      }
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <p
            className="py-8 text-center text-sm"
            style={{ color: 'var(--encabezados-alterno)' }}
          >
            No hay clientes que coincidan con los filtros.
          </p>
        )}
      </Card>
    </div>
  );
}
