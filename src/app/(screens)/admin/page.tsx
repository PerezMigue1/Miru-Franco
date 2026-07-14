'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import AdminLayout from '../../components/layouts/AdminLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { getProductosParaDashboard } from '../../services/productos';
import { listarVentas } from '../../services/pos';
import { listarCitasDelDia, listarCitas, type CitaApi } from '../../services/citas';
import { listarClientes, type ClienteApi } from '../../services/clientes';
import { getUsuarios } from '../../services/usuarios';
import { listarQuejas, type QuejaApi } from '../../services/quejas';
import { listarPedidos, etiquetaEstadoPedido, type PedidoApi } from '../../services/ecommerce';
import {
  obtenerAlertasStock,
  obtenerCaducidades,
  type AlertaStockApi,
  type CaducidadApi,
} from '../../services/inventarioMovimientos';
import {
  AlertTriangle,
  CalendarClock,
  CircleX,
  Clock3,
  Database,
  LineChart as LineChartIcon,
  MessageSquareWarning,
  Package,
  PackageX,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

// Paleta de gráficos derivada de la marca — orden fijo, nunca cíclico.
const PALETA_GRAFICOS = ['#710014', '#9f6d1f', '#A64B63', '#6E7D57', '#D98E04'];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function precioANumero(precio: string | undefined): number {
  if (!precio) return 0;
  const s = String(precio).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

function formatearMoneda(valor: number): string {
  return `$${valor.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatearHora(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function formatearFechaRelativa(iso?: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  const diffMs = Date.now() - fecha.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return 'ayer';
  return `hace ${diffD} días`;
}

const ETIQUETAS_ESTADO_CITA: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_curso: 'En curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada',
  no_asistio: 'No asistió',
};

const ETIQUETAS_ROL: Record<string, string> = {
  cliente: 'Cliente',
  admin: 'Administrador',
  estilista: 'Estilista',
  empleado: 'Empleado',
  becario: 'Becado',
  becado: 'Becado',
};

function rolNormalizado(rol: string): string {
  const r = String(rol || '').toLowerCase().trim();
  return r === 'becado' ? 'becario' : r;
}

type Seccion<T> = { loading: boolean; error: boolean; data: T };
const seccionInicial = <T,>(vacio: T): Seccion<T> => ({ loading: true, error: false, data: vacio });

type ItemActividad = {
  id: string;
  tipo: 'venta' | 'cita' | 'queja';
  titulo: string;
  subtitulo: string;
  creadoEn: string;
};

export default function AdminDashboardPage() {
  const reducedMotion = usePrefersReducedMotion();

  const [productos, setProductos] = useState<Seccion<Awaited<ReturnType<typeof getProductosParaDashboard>>>>(seccionInicial([]));
  const [totalClientes, setTotalClientes] = useState<Seccion<number>>(seccionInicial(0));
  const [citasHoy, setCitasHoy] = useState<Seccion<CitaApi[]>>(seccionInicial([]));
  const [citasTodas, setCitasTodas] = useState<Seccion<CitaApi[]>>(seccionInicial([]));
  const [ventasPagadas, setVentasPagadas] = useState<Seccion<Awaited<ReturnType<typeof listarVentas>>['data']>>(seccionInicial([]));
  const [usuarios, setUsuarios] = useState<Seccion<Awaited<ReturnType<typeof getUsuarios>>>>(seccionInicial([]));
  const [quejas, setQuejas] = useState<Seccion<QuejaApi[]>>(seccionInicial([]));
  const [alertasStock, setAlertasStock] = useState<Seccion<AlertaStockApi[]>>(seccionInicial([]));
  const [caducidades, setCaducidades] = useState<Seccion<CaducidadApi[]>>(seccionInicial([]));
  const [clientesRecientes, setClientesRecientes] = useState<Seccion<ClienteApi[]>>(seccionInicial([]));
  const [pedidosOnline, setPedidosOnline] = useState<Seccion<PedidoApi[]>>(seccionInicial([]));

  useEffect(() => {
    let cancelled = false;
    const hoy = new Date().toISOString().slice(0, 10);

    Promise.allSettled([
      getProductosParaDashboard()
        .then((data) => { if (!cancelled) setProductos({ loading: false, error: false, data }); })
        .catch(() => { if (!cancelled) setProductos((p) => ({ ...p, loading: false, error: true })); }),

      listarClientes({ limit: 1 })
        .then((res) => { if (!cancelled) setTotalClientes({ loading: false, error: false, data: res.total }); })
        .catch(() => { if (!cancelled) setTotalClientes((p) => ({ ...p, loading: false, error: true })); }),

      listarCitasDelDia(hoy)
        .then((data) => { if (!cancelled) setCitasHoy({ loading: false, error: false, data }); })
        .catch(() => { if (!cancelled) setCitasHoy((p) => ({ ...p, loading: false, error: true })); }),

      listarCitas({ limit: 200 })
        .then((res) => { if (!cancelled) setCitasTodas({ loading: false, error: false, data: res.data }); })
        .catch(() => { if (!cancelled) setCitasTodas((p) => ({ ...p, loading: false, error: true })); }),

      listarVentas({ estado: 'pagada', limit: 100 })
        .then((res) => { if (!cancelled) setVentasPagadas({ loading: false, error: false, data: res.data }); })
        .catch(() => { if (!cancelled) setVentasPagadas((p) => ({ ...p, loading: false, error: true })); }),

      getUsuarios()
        .then((data) => { if (!cancelled) setUsuarios({ loading: false, error: false, data }); })
        .catch(() => { if (!cancelled) setUsuarios((p) => ({ ...p, loading: false, error: true })); }),

      listarQuejas({ limit: 50 })
        .then((res) => { if (!cancelled) setQuejas({ loading: false, error: false, data: res.data }); })
        .catch(() => { if (!cancelled) setQuejas((p) => ({ ...p, loading: false, error: true })); }),

      listarClientes({ limit: 5 })
        .then((res) => { if (!cancelled) setClientesRecientes({ loading: false, error: false, data: res.data }); })
        .catch(() => { if (!cancelled) setClientesRecientes((p) => ({ ...p, loading: false, error: true })); }),

      listarPedidos()
        .then((data) => { if (!cancelled) setPedidosOnline({ loading: false, error: false, data }); })
        .catch(() => { if (!cancelled) setPedidosOnline((p) => ({ ...p, loading: false, error: true })); }),

      obtenerAlertasStock(5)
        .then((data) => { if (!cancelled) setAlertasStock({ loading: false, error: false, data }); })
        .catch(() => { if (!cancelled) setAlertasStock((p) => ({ ...p, loading: false, error: true })); }),

      obtenerCaducidades(30)
        .then((data) => { if (!cancelled) setCaducidades({ loading: false, error: false, data }); })
        .catch(() => { if (!cancelled) setCaducidades((p) => ({ ...p, loading: false, error: true })); }),
    ]);

    return () => { cancelled = true; };
  }, []);

  // ── KPIs de inventario ──────────────────────────────────────────────────
  const totalProductos = productos.data.length;
  const stockBajo = productos.data.filter((p) => { const t = p.stockCantidad ?? 0; return t > 0 && t <= 5; }).length;
  const sinStock = productos.data.filter((p) => (p.stockCantidad ?? 0) === 0).length;
  const valorInventario = productos.data.reduce(
    (acc, p) => acc + (p.presentaciones ?? []).reduce((s, pr) => s + precioANumero(pr.precio) * pr.stock, 0),
    0
  );

  // ── Gráfico 1: citas por estado ─────────────────────────────────────────
  const citasPorEstado = useMemo(() => {
    const conteo = new Map<string, number>();
    citasTodas.data.forEach((c) => conteo.set(c.estado, (conteo.get(c.estado) ?? 0) + 1));
    return Array.from(conteo.entries())
      .map(([estado, valor]) => ({ estado, nombre: ETIQUETAS_ESTADO_CITA[estado] ?? estado, valor }))
      .sort((a, b) => b.valor - a.valor)
      .map((d, i) => ({ ...d, color: PALETA_GRAFICOS[i % PALETA_GRAFICOS.length] }));
  }, [citasTodas.data]);

  // ── Gráfico 2: ventas pagadas por método (conteo, no monto) ─────────────
  const ventasPorMetodo = useMemo(() => {
    const conteo = new Map<string, number>();
    ventasPagadas.data.forEach((v) => conteo.set(v.metodoPago, (conteo.get(v.metodoPago) ?? 0) + 1));
    const etiquetas: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', mixto: 'Mixto' };
    return Array.from(conteo.entries())
      .map(([metodo, valor]) => ({ metodo, nombre: etiquetas[metodo] ?? metodo, valor }))
      .sort((a, b) => b.valor - a.valor)
      .map((d, i) => ({ ...d, color: PALETA_GRAFICOS[i % PALETA_GRAFICOS.length] }));
  }, [ventasPagadas.data]);

  // ── Gráfico 3: usuarios por rol ──────────────────────────────────────────
  const usuariosPorRol = useMemo(() => {
    const conteo = new Map<string, number>();
    usuarios.data.forEach((u) => { const r = rolNormalizado(u.rol); conteo.set(r, (conteo.get(r) ?? 0) + 1); });
    return Array.from(conteo.entries())
      .map(([rol, valor]) => ({ rol, nombre: ETIQUETAS_ROL[rol] ?? rol, valor }))
      .sort((a, b) => b.valor - a.valor)
      .map((d, i) => ({ ...d, color: PALETA_GRAFICOS[i % PALETA_GRAFICOS.length] }));
  }, [usuarios.data]);

  const alertasOrdenadas = [...alertasStock.data].sort((a, b) => a.stockActual - b.stockActual).slice(0, 5);
  const caducidadesOrdenadas = [...caducidades.data].sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 5);
  const quejasAbiertas = quejas.data.filter((q) => q.estado === 'abierta' || q.estado === 'en_proceso');

  // ── Servicios más solicitados (agregado de citas ya cargadas, sin llamada nueva) ─
  const serviciosTop = useMemo(() => {
    const conteo = new Map<string, number>();
    citasTodas.data.forEach((c) => {
      const nombre = c.servicioNombre ?? 'Sin especificar';
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
    });
    return Array.from(conteo.entries())
      .map(([nombre, valor]) => ({ nombre, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [citasTodas.data]);

  // ── Especialistas con más citas (mismo dataset, sin llamada nueva) ──────
  const especialistasTop = useMemo(() => {
    const conteo = new Map<string, number>();
    citasTodas.data.forEach((c) => {
      const nombre = c.especialistaNombre ?? 'Sin asignar';
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
    });
    return Array.from(conteo.entries())
      .map(([nombre, valor]) => ({ nombre, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [citasTodas.data]);

  const maxServicios = Math.max(1, ...serviciosTop.map((s) => s.valor));
  const maxEspecialistas = Math.max(1, ...especialistasTop.map((e) => e.valor));

  // ── Pedidos online por estado (canal e-commerce, separado del POS local) ─
  const pedidosPorEstado = useMemo(() => {
    const conteo = new Map<string, number>();
    pedidosOnline.data.forEach((p) => conteo.set(p.estado, (conteo.get(p.estado) ?? 0) + 1));
    return Array.from(conteo.entries())
      .map(([estado, valor]) => ({ nombre: etiquetaEstadoPedido(estado), valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [pedidosOnline.data]);
  const maxPedidos = Math.max(1, ...pedidosPorEstado.map((p) => p.valor));

  const pedidosRecientes = useMemo(
    () => [...pedidosOnline.data].sort((a, b) => new Date(b.creadoEn ?? 0).getTime() - new Date(a.creadoEn ?? 0).getTime()).slice(0, 5),
    [pedidosOnline.data]
  );

  // ── Actividad reciente: ventas + citas + quejas, unificadas por fecha ───
  const actividadReciente = useMemo(() => {
    const items: ItemActividad[] = [];
    ventasPagadas.data.slice(0, 5).forEach((v) => {
      items.push({
        id: `venta-${v.id}`,
        tipo: 'venta',
        titulo: `Venta #${v.id}`,
        subtitulo: `${formatearMoneda(v.total ?? 0)} · ${v.metodoPago}`,
        creadoEn: v.creadoEn ?? '',
      });
    });
    citasTodas.data.slice(0, 5).forEach((c) => {
      items.push({
        id: `cita-${c.id}`,
        tipo: 'cita',
        titulo: c.clienteNombre ?? 'Cliente',
        subtitulo: `${c.servicioNombre ?? 'Servicio'} · ${ETIQUETAS_ESTADO_CITA[c.estado] ?? c.estado}`,
        creadoEn: c.creadoEn ?? '',
      });
    });
    quejas.data.slice(0, 5).forEach((q) => {
      items.push({
        id: `queja-${q.id}`,
        tipo: 'queja',
        titulo: q.asunto || 'Queja',
        subtitulo: q.clienteNombre ?? 'Cliente',
        creadoEn: q.creadoEn ?? '',
      });
    });
    return items
      .filter((i) => i.creadoEn)
      .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
      .slice(0, 8);
  }, [ventasPagadas.data, citasTodas.data, quejas.data]);

  const actividadCargando = ventasPagadas.loading || citasTodas.loading || quejas.loading;
  const actividadConError = ventasPagadas.error && citasTodas.error && quejas.error;

  const fechaHoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const fechaCapitalizada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  return (
    <AdminLayout>
      <div className="w-full max-w-none">

        {/* Encabezado discreto */}
        <header className="mb-8">
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Resumen del negocio
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {fechaCapitalizada}
          </p>
        </header>

        {/* KPIs con jerarquía */}
        <section className="mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard icon={Package} label="Total productos" loading={productos.loading} error={productos.error} value={totalProductos} />
            <KpiCard icon={AlertTriangle} label="Stock bajo" loading={productos.loading} error={productos.error} value={stockBajo} valueColor="var(--warning)" />
            <KpiCard
              icon={CircleX}
              label="Sin stock"
              loading={productos.loading}
              error={productos.error}
              value={sinStock}
              valueColor="var(--danger)"
              destacado
            />
            <KpiCard icon={Wallet} label="Valor inventario" loading={productos.loading} error={productos.error} value={formatearMoneda(valorInventario)} />
            <KpiCard icon={Users} label="Total clientes" loading={totalClientes.loading} error={totalClientes.error} value={totalClientes.data} />
          </div>
        </section>

        {/* Distribución: los 3 gráficos agrupados por naturaleza (proporciones/conteos) */}
        <section className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
            Distribución
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="elevated" padding="lg">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>Citas por estado</h3>
              {citasTodas.loading ? (
                <SkeletonGrafico />
              ) : citasTodas.error ? (
                <MensajeError texto="No se pudieron cargar las citas." />
              ) : citasPorEstado.length > 0 ? (
                <DonutConLeyenda datos={citasPorEstado} reducedMotion={reducedMotion} />
              ) : (
                <MensajeVacio texto="Aún no hay citas registradas." />
              )}
            </Card>

            <Card variant="elevated" padding="lg">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>Ventas pagadas por método</h3>
              {ventasPagadas.loading ? (
                <SkeletonGrafico />
              ) : ventasPagadas.error ? (
                <MensajeError texto="No se pudo cargar el detalle de ventas." />
              ) : ventasPorMetodo.length > 0 ? (
                <BarraVentasPorMetodo datos={ventasPorMetodo} reducedMotion={reducedMotion} />
              ) : (
                <MensajeVacio texto="Sin ventas registradas — las ventas del POS aparecerán aquí." />
              )}
            </Card>

            <Card variant="elevated" padding="lg">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>Usuarios por rol</h3>
              {usuarios.loading ? (
                <SkeletonGrafico />
              ) : usuarios.error ? (
                <MensajeError texto="No se pudieron cargar los usuarios." />
              ) : usuariosPorRol.length > 0 ? (
                <DonutConLeyenda datos={usuariosPorRol} reducedMotion={reducedMotion} />
              ) : (
                <MensajeVacio texto="Sin usuarios registrados." />
              )}
            </Card>
          </div>
        </section>

        {/* Operación del día: agenda, alertas y actividad, agrupadas por ser accionables hoy */}
        <section className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
            Operación del día
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock3 size={17} style={{ color: 'var(--hover)' }} />
                  <h3 className="text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Agenda de hoy</h3>
                </div>
                <Link href="/operacion/gestion-citas" className="text-xs font-medium hover:opacity-80" style={{ color: 'var(--texto-enlace-sobre-calido)' }}>
                  Ver agenda →
                </Link>
              </div>
              {citasHoy.loading ? (
                <SkeletonLista />
              ) : citasHoy.error ? (
                <MensajeError texto="No se pudieron cargar las citas de hoy." />
              ) : citasHoy.data.length > 0 ? (
                <div className="space-y-2">
                  {citasHoy.data.slice(0, 6).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: 'var(--fondo-general)' }}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--menu-texto-principal)' }} title={c.clienteNombre ?? undefined}>
                          {c.clienteNombre ?? 'Cliente'} — {c.servicioNombre ?? 'Servicio'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--encabezados-alterno)' }}>
                          {formatearHora(c.fechaHoraInicio)} · {c.especialistaNombre ?? '—'}
                        </p>
                      </div>
                      <Badge variant="info">{ETIQUETAS_ESTADO_CITA[c.estado] ?? c.estado}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <MensajeVacio texto="No hay citas para hoy." />
              )}
            </Card>

            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Alertas</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--encabezados-alterno)' }}>Stock bajo</span>
                    </div>
                    <Link href="/admin/inventario" className="text-xs font-medium hover:opacity-80" style={{ color: 'var(--texto-enlace-sobre-calido)' }}>
                      Ver todos →
                    </Link>
                  </div>
                  {alertasStock.loading ? (
                    <SkeletonLista lineas={2} />
                  ) : alertasStock.error ? (
                    <MensajeError texto="No se pudieron cargar las alertas de stock." />
                  ) : alertasOrdenadas.length > 0 ? (
                    <div className="space-y-1.5">
                      {alertasOrdenadas.map((a) => (
                        <div key={a.presentacionId} className="flex items-center justify-between text-sm">
                          <span className="truncate" style={{ color: 'var(--menu-texto-principal)' }} title={a.productoNombre ?? undefined}>
                            {a.productoNombre ?? 'Producto sin nombre'}
                          </span>
                          <Badge variant={a.stockActual === 0 ? 'danger' : 'warning'} size="sm">
                            {a.stockActual === 0 ? 'Sin stock' : `${a.stockActual} u.`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <MensajeVacio texto="Sin alertas de stock bajo." compacto />
                  )}
                </div>

                <div className="pt-4 border-t" style={{ borderColor: 'var(--fondo-general)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <PackageX size={14} style={{ color: 'var(--danger)' }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--encabezados-alterno)' }}>Por caducar</span>
                    </div>
                    <Link href="/admin/control-caducidad" className="text-xs font-medium hover:opacity-80" style={{ color: 'var(--texto-enlace-sobre-calido)' }}>
                      Ver todos →
                    </Link>
                  </div>
                  {caducidades.loading ? (
                    <SkeletonLista lineas={2} />
                  ) : caducidades.error ? (
                    <MensajeError texto="No se pudieron cargar las caducidades." />
                  ) : caducidadesOrdenadas.length > 0 ? (
                    <div className="space-y-1.5">
                      {caducidadesOrdenadas.map((c) => (
                        <div key={c.presentacionId} className="flex items-center justify-between text-sm">
                          <span className="truncate" style={{ color: 'var(--menu-texto-principal)' }} title={c.productoNombre ?? undefined}>
                            {c.productoNombre ?? 'Producto sin nombre'}
                          </span>
                          <Badge variant={c.vencida ? 'danger' : 'warning'} size="sm">
                            {c.vencida ? `Vencido hace ${Math.abs(c.diasRestantes)}d` : `Vence en ${c.diasRestantes}d`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <MensajeVacio texto="Sin productos por caducar." compacto />
                  )}
                </div>

                <div className="pt-4 border-t" style={{ borderColor: 'var(--fondo-general)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MessageSquareWarning size={14} style={{ color: 'var(--danger)' }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--encabezados-alterno)' }}>Quejas abiertas</span>
                    </div>
                    <Link href="/admin/quejas-garantias" className="text-xs font-medium hover:opacity-80" style={{ color: 'var(--texto-enlace-sobre-calido)' }}>
                      Ver todas →
                    </Link>
                  </div>
                  {quejas.loading ? (
                    <SkeletonLista lineas={2} />
                  ) : quejas.error ? (
                    <MensajeError texto="No se pudieron cargar las quejas." />
                  ) : quejasAbiertas.length > 0 ? (
                    <div className="space-y-1.5">
                      {quejasAbiertas.slice(0, 5).map((q) => (
                        <div key={q.id} className="flex items-center justify-between text-sm">
                          <span className="truncate" style={{ color: 'var(--menu-texto-principal)' }} title={q.asunto}>{q.asunto}</span>
                          <Badge variant="danger" size="sm">{q.estado === 'abierta' ? 'Abierta' : 'En proceso'}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <MensajeVacio texto="Sin quejas abiertas — todo al día." compacto />
                  )}
                </div>
              </div>
            </Card>

            <Card variant="elevated" padding="lg">
              <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>Actividad reciente</h3>
              {actividadCargando ? (
                <SkeletonLista lineas={4} />
              ) : actividadConError ? (
                <MensajeError texto="No se pudo cargar la actividad reciente." />
              ) : actividadReciente.length > 0 ? (
                <div className="space-y-1">
                  {actividadReciente.slice(0, 6).map((item) => (
                    <ItemActividadFila key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <MensajeVacio texto="Aún no hay actividad — las ventas, citas y quejas aparecerán aquí." />
              )}
            </Card>
          </div>
        </section>

        {/* Rendimiento: qué servicios/especialistas mueven el negocio + quién llega nuevo */}
        <section className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
            Rendimiento
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={17} style={{ color: 'var(--hover)' }} />
                <h3 className="text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Servicios más solicitados</h3>
              </div>
              {citasTodas.loading ? (
                <SkeletonLista />
              ) : citasTodas.error ? (
                <MensajeError texto="No se pudieron cargar los servicios." />
              ) : serviciosTop.length > 0 ? (
                <BarraRanking items={serviciosTop} max={maxServicios} />
              ) : (
                <MensajeVacio texto="Aún no hay citas suficientes para ver un ranking." />
              )}
            </Card>

            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <UserCog size={17} style={{ color: 'var(--hover)' }} />
                <h3 className="text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Especialistas con más citas</h3>
              </div>
              {citasTodas.loading ? (
                <SkeletonLista />
              ) : citasTodas.error ? (
                <MensajeError texto="No se pudieron cargar las citas." />
              ) : especialistasTop.length > 0 ? (
                <BarraRanking items={especialistasTop} max={maxEspecialistas} />
              ) : (
                <MensajeVacio texto="Aún no hay citas suficientes para ver un ranking." />
              )}
            </Card>

            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus size={17} style={{ color: 'var(--hover)' }} />
                  <h3 className="text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Clientes nuevos</h3>
                </div>
                <Link href="/admin/clientes-crm" className="text-xs font-medium hover:opacity-80" style={{ color: 'var(--texto-enlace-sobre-calido)' }}>
                  Ver todos →
                </Link>
              </div>
              {clientesRecientes.loading ? (
                <SkeletonLista />
              ) : clientesRecientes.error ? (
                <MensajeError texto="No se pudieron cargar los clientes." />
              ) : clientesRecientes.data.length > 0 ? (
                <div className="space-y-2">
                  {clientesRecientes.data.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="truncate" style={{ color: 'var(--menu-texto-principal)' }} title={c.nombre ?? undefined}>
                        {c.nombre || 'Sin nombre'}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--encabezados-alterno)' }}>
                        {formatearFechaRelativa(c.creadoEn)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <MensajeVacio texto="Aún no hay clientes registrados." />
              )}
            </Card>
          </div>
        </section>

        {/* Canal online: pedidos de la tienda, separado de las ventas POS locales */}
        <section className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
            Canal online
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag size={17} style={{ color: 'var(--hover)' }} />
                <h3 className="text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Pedidos online por estado</h3>
              </div>
              {pedidosOnline.loading ? (
                <SkeletonLista />
              ) : pedidosOnline.error ? (
                <MensajeError texto="No se pudieron cargar los pedidos." />
              ) : pedidosPorEstado.length > 0 ? (
                <BarraRanking items={pedidosPorEstado} max={maxPedidos} />
              ) : (
                <MensajeVacio texto="Aún no hay pedidos en la tienda online." />
              )}
            </Card>

            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Pedidos recientes</h3>
                <Link href="/admin/venta-online" className="text-xs font-medium hover:opacity-80" style={{ color: 'var(--texto-enlace-sobre-calido)' }}>
                  Ver todos →
                </Link>
              </div>
              {pedidosOnline.loading ? (
                <SkeletonLista />
              ) : pedidosOnline.error ? (
                <MensajeError texto="No se pudieron cargar los pedidos." />
              ) : pedidosRecientes.length > 0 ? (
                <div className="space-y-2">
                  {pedidosRecientes.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: 'var(--fondo-general)' }}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Pedido #{p.id}</p>
                        <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>{formatearMoneda(p.total)} · {formatearFechaRelativa(p.creadoEn)}</p>
                      </div>
                      <Badge variant={
                        p.estado === 'entregado' || p.estado === 'pagado' ? 'success'
                        : p.estado === 'cancelado' ? 'danger'
                        : p.estado === 'pendiente_pago' ? 'warning'
                        : 'info'
                      }>
                        {etiquetaEstadoPedido(p.estado)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <MensajeVacio texto="Aún no hay pedidos en la tienda online." />
              )}
            </Card>
          </div>
        </section>

        {/* Accesos: barra delgada + herramientas de análisis, discretos */}
        <section className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {[
              { href: '/admin/inventario', icon: Package, label: 'Inventario' },
              { href: '/admin/venta-local', icon: Store, label: 'Venta local' },
              { href: '/admin/clientes-crm', icon: Users, label: 'Clientes CRM' },
              { href: '/admin/servicios', icon: Scissors, label: 'Servicios' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-150 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: 'var(--tarjetas-paneles)', color: 'var(--menu-texto-principal)', outlineColor: 'var(--hover)' }}
              >
                <Icon size={14} aria-hidden />
                {label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { href: '/admin/inventario/prediccion', icon: TrendingUp, label: 'Predicción de inventario' },
              { href: '/admin/inventario/ventas-analisis', icon: LineChartIcon, label: 'Análisis de ventas' },
              { href: '/admin/base-datos/monitoreo', icon: Database, label: 'Monitoreo de base de datos' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all duration-150 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: 'var(--encabezados-alterno)', color: 'var(--encabezados-alterno)', outlineColor: 'var(--hover)' }}
              >
                <Icon size={12} aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  loading,
  error,
  value,
  valueColor = 'var(--menu-texto-principal)',
  destacado,
}: {
  icon: LucideIcon;
  label: string;
  loading: boolean;
  error: boolean;
  value: string | number;
  valueColor?: string;
  destacado?: boolean;
}) {
  return (
    <Card
      variant="elevated"
      padding="lg"
      className="transition-all duration-200"
      style={destacado ? { boxShadow: '0 0 0 1.5px var(--danger), 0 4px 12px rgba(0,0,0,0.15)' } : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: destacado ? 'rgba(113, 0, 20, 0.15)' : 'var(--fondo-general)' }}
        >
          <Icon size={17} style={{ color: destacado ? 'var(--danger)' : 'var(--encabezados-alterno)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--encabezados-alterno)' }}>{label}</p>
          {loading ? (
            <div className={`h-7 w-14 rounded bg-current opacity-20 animate-pulse mt-1`} />
          ) : error ? (
            <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Error</p>
          ) : (
            <p className={`font-bold mt-0.5 truncate ${destacado ? 'text-3xl' : 'text-xl'}`} style={{ color: valueColor }}>
              {value}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function DonutConLeyenda({
  datos,
  reducedMotion,
}: {
  datos: { nombre: string; valor: number; color: string }[];
  reducedMotion: boolean;
}) {
  const total = datos.reduce((acc, d) => acc + d.valor, 0);
  return (
    <div className="flex flex-col items-center gap-4">
      <div style={{ width: '100%', maxWidth: 160, height: 160 }} className="shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="valor"
              nameKey="nombre"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              cornerRadius={4}
              stroke="none"
              isAnimationActive={!reducedMotion}
            >
              {datos.map((d) => (
                <Cell key={d.nombre} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const v = Number(value) || 0;
                return [`${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, name];
              }}
              contentStyle={{ backgroundColor: 'var(--header-footer)', border: 'none', borderRadius: 8, color: 'var(--texto-fondo-oscuro)' }}
              itemStyle={{ color: 'var(--texto-fondo-oscuro)' }}
              labelStyle={{ color: 'var(--texto-fondo-oscuro)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 w-full space-y-1.5">
        {datos.map((d) => (
          <li key={d.nombre} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} aria-hidden />
              <span className="truncate" style={{ color: 'var(--menu-texto-principal)' }}>{d.nombre}</span>
            </span>
            <span className="font-semibold shrink-0" style={{ color: 'var(--encabezados-alterno)' }}>{d.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarraVentasPorMetodo({
  datos,
  reducedMotion,
}: {
  datos: { nombre: string; valor: number; color: string }[];
  reducedMotion: boolean;
}) {
  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nombre"
            width={90}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--menu-texto-principal)', fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--fondo-general)' }}
            formatter={(value) => {
              const v = Number(value) || 0;
              return [`${v} venta${v === 1 ? '' : 's'}`, ''];
            }}
            contentStyle={{ backgroundColor: 'var(--header-footer)', border: 'none', borderRadius: 8, color: 'var(--texto-fondo-oscuro)' }}
            itemStyle={{ color: 'var(--texto-fondo-oscuro)' }}
            labelStyle={{ color: 'var(--texto-fondo-oscuro)' }}
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={!reducedMotion}>
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.color} />
            ))}
            <LabelList dataKey="valor" position="right" style={{ fill: 'var(--menu-texto-principal)', fontSize: 13, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarraRanking({ items, max }: { items: { nombre: string; valor: number }[]; max: number }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.nombre}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="truncate" style={{ color: 'var(--menu-texto-principal)' }} title={item.nombre}>{item.nombre}</span>
            <span className="font-semibold shrink-0 ml-2" style={{ color: 'var(--encabezados-alterno)' }}>{item.valor}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--fondo-general)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.valor / max) * 100}%`, backgroundColor: PALETA_GRAFICOS[i % PALETA_GRAFICOS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const TIPO_ACTIVIDAD: Record<ItemActividad['tipo'], { icon: LucideIcon; color: string; bg: string }> = {
  venta: { icon: ShoppingCart, color: 'var(--success)', bg: 'rgba(110, 125, 87, 0.18)' },
  cita: { icon: CalendarClock, color: 'var(--enlaces-textos-interactivos)', bg: 'rgba(74, 123, 167, 0.18)' },
  queja: { icon: MessageSquareWarning, color: 'var(--danger)', bg: 'rgba(113, 0, 20, 0.12)' },
};

function ItemActividadFila({ item }: { item: ItemActividad }) {
  const { icon: Icon, color, bg } = TIPO_ACTIVIDAD[item.tipo];
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
        <Icon size={14} style={{ color }} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--menu-texto-principal)' }}>{item.titulo}</p>
        <p className="text-xs truncate" style={{ color: 'var(--encabezados-alterno)' }}>{item.subtitulo}</p>
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--encabezados-alterno)' }}>{formatearFechaRelativa(item.creadoEn)}</span>
    </div>
  );
}

function SkeletonLista({ lineas = 3 }: { lineas?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lineas }).map((_, i) => (
        <div key={i} className="h-9 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--fondo-general)' }} />
      ))}
    </div>
  );
}

function SkeletonGrafico() {
  return <div className="h-[180px] rounded-lg animate-pulse" style={{ backgroundColor: 'var(--fondo-general)' }} />;
}

function MensajeVacio({ texto, compacto }: { texto: string; compacto?: boolean }) {
  return (
    <p className={`text-sm ${compacto ? 'py-2' : 'py-6'}`} style={{ color: 'var(--encabezados-alterno)' }}>
      {texto}
    </p>
  );
}

function MensajeError({ texto }: { texto: string }) {
  return (
    <p className="text-sm py-2" style={{ color: 'var(--danger)' }}>
      {texto}
    </p>
  );
}
