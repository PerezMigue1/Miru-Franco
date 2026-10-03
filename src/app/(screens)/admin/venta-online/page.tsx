'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import TarjetaKpi from '../../../components/ui/TarjetaKpi';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, CreditCard, Package, PackageCheck, RotateCcw } from 'lucide-react';
import {
  listarPedidosPaginado,
  actualizarPedido,
  listarEnviosPorPedido,
  listarPagosPorPedido,
  actualizarPagoParcial,
  crearPedido,
  etiquetaEstadoPedido,
  etiquetaMetodoPagoPedido,
  varianteBadgeEstadoPedido,
  METODO_PAGO_EN_SALON,
  type PedidoApi,
  type EnvioApi,
  type EstadoPedidoUi,
} from '../../../services/ecommerce';
import { getUsuarios, type Usuario } from '../../../services/usuarios';
import { showAlert, showConfirm, showToast } from '../../../utils/toast';
import { mensajeUsuarioDesdeErrorApi } from '../../../utils/apiErrorMessage';
import { emitCatalogStockChanged } from '../../../utils/catalogStockSync';
import { accionesPedido, siguientesEstadosSinCobro, type AccionPedido } from '../../../utils/flujoPedido';

const TAMANO_PAGINA = 20;

type LineaManual = {
  id: string;
  productoId: string;
  presentacionId: string;
  cantidad: string;
};

/** Estados con los que se puede registrar un pedido nuevo (todo se recoge en el salón: nunca 'enviado'). */
const OPCIONES_ESTADO_INICIAL: { value: EstadoPedidoUi; label: string }[] = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'pendiente_pago', label: 'Pendiente de pago' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'preparando', label: 'En preparación' },
  { value: 'listo_recoger', label: 'Listo para recoger' },
  { value: 'entregado', label: 'Entregado en el salón' },
];

const OPCIONES_METODO_PAGO = [
  { value: '', label: 'Sin especificar' },
  { value: METODO_PAGO_EN_SALON, label: 'Pago al recoger en el salón' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
];

/** Botones rápidos de la tabla según el siguiente paso válido (utils/flujoPedido.ts). Solo cambian
 *  el estado: el cobro con registro de pago está en "Pedidos por recoger". */
const ACCION_RAPIDA: Record<AccionPedido, { etiqueta: string; estado: EstadoPedidoUi }> = {
  cobrar: { etiqueta: 'Marcar pagado', estado: 'pagado' },
  preparar: { etiqueta: 'Preparar', estado: 'preparando' },
  listo: { etiqueta: 'Listo para recoger', estado: 'listo_recoger' },
  entregar: { etiqueta: 'Entregar', estado: 'entregado' },
  cobrarEntregar: { etiqueta: 'Entregar', estado: 'entregado' },
  cancelar: { etiqueta: 'Cancelar', estado: 'cancelado' },
};

function variantEstadoEnvio(estado?: string): 'default' | 'warning' | 'success' | 'danger' | 'info' {
  switch (estado) {
    case 'preparando':
      return 'warning';
    case 'en_transito':
      return 'info';
    case 'entregado':
      return 'success';
    case 'fallido':
      return 'danger';
    default:
      return 'default';
  }
}

function fmtMoneda(n: number, moneda = 'MXN') {
  return `${new Intl.NumberFormat('es-MX').format(n)} ${moneda}`;
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VentaOnlinePage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filtroUsuarioId, setFiltroUsuarioId] = useState<string>('');
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);

  const [formPedido, setFormPedido] = useState({
    estado: '',
    impuestos: '0',
    descuento: '0',
    metodoPago: '',
    referenciaPago: '',
  });

  /** Envío registrado de un pedido anterior (solo lectura: ya no hay envío a domicilio). */
  const [envioActual, setEnvioActual] = useState<EnvioApi | null>(null);

  const [formNuevoPedido, setFormNuevoPedido] = useState({
    usuarioId: '',
    estado: 'pendiente_pago',
    metodoPago: '',
    notasCliente: '',
  });
  const [lineasManual, setLineasManual] = useState<LineaManual[]>([
    { id: crypto.randomUUID(), productoId: '', presentacionId: '', cantidad: '1' },
  ]);

  const usersMap = useMemo(() => {
    const m = new Map<string, Usuario>();
    usuarios.forEach((u) => m.set(u.id, u));
    return m;
  }, [usuarios]);

  /** Paginación del servidor (antes solo se veían los primeros 20 pedidos). */
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  /** Indicadores sobre todos los pedidos (con el filtro de clienta), no solo los de la página. */
  const [stats, setStats] = useState({ pendiente: 0, preparando: 0, listo: 0, entregado: 0 });

  const selectedPedido = useMemo(
    () => pedidos.find((p) => p.id === selectedPedidoId) ?? null,
    [pedidos, selectedPedidoId]
  );

  async function cargarDatosBase() {
    setLoading(true);
    setError(null);
    try {
      const usuarioId = filtroUsuarioId || undefined;
      const contar = async (estado: EstadoPedidoUi) => (await listarPedidosPaginado({ estado, usuarioId, limit: 1 })).count;
      const [res, borradores, pendientes, preparando, listos, entregados] = await Promise.all([
        listarPedidosPaginado({ page: pagina, limit: TAMANO_PAGINA, usuarioId }),
        contar('borrador'),
        contar('pendiente_pago'),
        contar('preparando'),
        contar('listo_recoger'),
        contar('entregado'),
      ]);
      setPedidos(res.data);
      setTotalPaginas(Math.max(1, res.totalPages));
      setTotalPedidos(res.count);
      setStats({ pendiente: borradores + pendientes, preparando, listo: listos, entregado: entregados });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar venta online');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void getUsuarios().then(setUsuarios).catch(() => setUsuarios([]));
  }, []);

  useEffect(() => {
    void cargarDatosBase();
  }, [pagina, filtroUsuarioId]);

  useEffect(() => {
    if (!selectedPedido) {
      setEnvioActual(null);
      return;
    }
    setFormPedido({
      estado: selectedPedido.estado || 'pendiente_pago',
      impuestos: String(selectedPedido.impuestos ?? 0),
      descuento: String(selectedPedido.descuento ?? 0),
      metodoPago: selectedPedido.metodoPago ?? '',
      referenciaPago: selectedPedido.referenciaPago ?? '',
    });
    void (async () => {
      try {
        const envs = await listarEnviosPorPedido(selectedPedido.id);
        setEnvioActual(envs[0] ?? null);
      } catch {
        setEnvioActual(null);
      }
    })();
  }, [selectedPedido]);

  async function accionEstadoRapida(id: number, estado: string) {
    if (estado === 'cancelado') {
      const ok = await showConfirm('Los productos vuelven al inventario y la clienta recibe el aviso. No se puede deshacer.', {
        title: `¿Cancelar el pedido #${id}?`,
        confirmText: 'Sí, cancelar pedido',
        cancelText: 'No',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await actualizarPedido(id, { estado: estado as PedidoApi['estado'] });
      emitCatalogStockChanged();
      await cargarDatosBase();
      showToast(`Pedido #${id} actualizado a ${etiquetaEstadoPedido(estado)}.`, 'success');
    } catch (e) {
      void showAlert(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setSaving(false);
    }
  }

  async function guardarPedidoSeleccionado() {
    if (!selectedPedido) return;
    setSaving(true);
    try {
      await actualizarPedido(selectedPedido.id, {
        estado: formPedido.estado as PedidoApi['estado'],
        impuestos: Number(formPedido.impuestos || 0),
        descuento: Number(formPedido.descuento || 0),
        metodoPago: formPedido.metodoPago || undefined,
        referenciaPago: formPedido.referenciaPago || undefined,
      });
      emitCatalogStockChanged();
      await cargarDatosBase();
      showToast('Pedido actualizado.', 'success');
    } catch (e) {
      void showAlert(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setSaving(false);
    }
  }

  async function aprobarPagoYMarcarPagado() {
    if (!selectedPedido) return;
    setSaving(true);
    try {
      const pagos = await listarPagosPorPedido(selectedPedido.id);
      if (!pagos.length) {
        throw new Error('Este pedido no tiene pagos registrados.');
      }
      const ultimo = pagos[pagos.length - 1];
      await actualizarPagoParcial(ultimo.id, {
        estado: 'aprobado',
        monto: selectedPedido.total,
      });
      await actualizarPedido(selectedPedido.id, { estado: 'pagado' });
      await cargarDatosBase();
      showToast('Pago aprobado y pedido marcado como pagado.', 'success');
    } catch (e) {
      void showAlert(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setSaving(false);
    }
  }

  function agregarLineaManual() {
    setLineasManual((prev) => [
      ...prev,
      { id: crypto.randomUUID(), productoId: '', presentacionId: '', cantidad: '1' },
    ]);
  }

  function quitarLineaManual(id: string) {
    setLineasManual((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  async function crearPedidoManualAdmin() {
    if (!formNuevoPedido.usuarioId) {
      void showAlert('Selecciona un cliente.');
      return;
    }
    const lineas = lineasManual.map((l) => ({
      productoId: Number(l.productoId),
      presentacionId: Number(l.presentacionId),
      cantidad: Number(l.cantidad),
    }));
    if (
      lineas.some(
        (l) =>
          !Number.isFinite(l.productoId) ||
          l.productoId < 1 ||
          !Number.isFinite(l.presentacionId) ||
          l.presentacionId < 1 ||
          !Number.isFinite(l.cantidad) ||
          l.cantidad < 1
      )
    ) {
      void showAlert('Revisa líneas: productoId, presentacionId y cantidad deben ser válidos.');
      return;
    }

    setSaving(true);
    try {
      const creado = await crearPedido({
        usuarioId: formNuevoPedido.usuarioId,
        estado: formNuevoPedido.estado as PedidoApi['estado'],
        metodoPago: formNuevoPedido.metodoPago || undefined,
        notasCliente: formNuevoPedido.notasCliente || undefined,
        items: lineas,
      });
      emitCatalogStockChanged();
      await cargarDatosBase();
      setSelectedPedidoId(creado.id);
      showToast(`Pedido #${creado.id} creado.`, 'success');
    } catch (e) {
      void showAlert(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Venta Online
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {totalPedidos.toLocaleString('es-MX')} pedido{totalPedidos === 1 ? '' : 's'} · todo se recoge en el salón
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => router.push('/admin/pagos')}>
              <CreditCard size={14} />
              Pagos
            </Button>
            <Button size="sm" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => router.push('/admin/devoluciones-cambios')}>
              <RotateCcw size={14} />
              Devoluciones
            </Button>
            <Button size="sm" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => router.push('/admin/pedidos-por-recoger')}>
              <PackageCheck size={14} />
              Pedidos por recoger
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <TarjetaKpi icono={Clock3} etiqueta="Pendientes" valor={stats.pendiente} />
          <TarjetaKpi icono={Package} etiqueta="En preparación" valor={stats.preparando} />
          <TarjetaKpi icono={PackageCheck} etiqueta="Listos para recoger" valor={stats.listo} />
          <TarjetaKpi icono={CheckCircle2} etiqueta="Entregados" valor={stats.entregado} />
        </div>

        {error && (
          <Card padding="md" role="alert" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--badge-base))', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--danger-texto) 35%, transparent)' }}>
            <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

      <Card variant="elevated" padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Select
            label="Filtrar por cliente"
            value={filtroUsuarioId}
            onChange={(e) => {
              setFiltroUsuarioId(e.target.value);
              setPagina(1);
            }}
            options={[
              { value: '', label: 'Todos' },
              ...usuarios.map((u) => ({ value: u.id, label: `${u.nombre} — ${u.email}` })),
            ]}
            fullWidth
          />
          <div className="md:col-span-3 flex gap-2">
            <Button variant="outline" onClick={() => void cargarDatosBase()} disabled={loading || saving}>
              Recargar
            </Button>
            <span className="text-sm self-center" style={{ color: 'var(--encabezados-alterno)' }}>
              {loading ? 'Cargando pedidos…' : `${totalPedidos.toLocaleString('es-MX')} pedidos`}
            </span>
          </div>
        </div>
      </Card>

      <Card variant="elevated" padding="lg">
        <Table headers={['Pedido', 'Cliente', 'Total', 'Método', 'Estado', 'Fecha', 'Acciones']} headerSutil>
          {pedidos.map((p) => (
            <TableRow key={p.id}>
              <TableCell rowPadding="lg">#{p.id}</TableCell>
              <TableCell rowPadding="lg">
                {usersMap.get(p.usuarioId ?? '')?.nombre ?? p.usuarioId ?? '—'}
              </TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{fmtMoneda(p.total, p.moneda)}</TableCell>
              <TableCell rowPadding="lg">{p.metodoPago ? etiquetaMetodoPagoPedido(p.metodoPago) : '—'}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={varianteBadgeEstadoPedido(p.estado)}>{etiquetaEstadoPedido(p.estado, p.metodoPago)}</Badge>
              </TableCell>
              <TableCell rowPadding="lg">{formatearFecha(p.creadoEn)}</TableCell>
              <TableCell rowPadding="lg">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedPedidoId(p.id)}>Editar</Button>
                  {/* Cobrar va por "Aprobar pago" o por Pedidos por recoger, que registran el pago. */}
                  {accionesPedido(p.estado, p.metodoPago).filter((a) => a !== 'cobrar' && a !== 'cobrarEntregar').map((accion) => (
                    <Button
                      key={accion}
                      size="sm"
                      variant="outline"
                      onClick={() => void accionEstadoRapida(p.id, ACCION_RAPIDA[accion].estado)}
                      disabled={saving}
                    >
                      {ACCION_RAPIDA[accion].etiqueta}
                    </Button>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
          <p className="text-xs mf-cifras" style={{ color: 'var(--encabezados-alterno)' }}>
            Página {pagina} de {totalPaginas} · {totalPedidos.toLocaleString('es-MX')} pedidos
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="inline-flex items-center gap-1" onClick={() => setPagina((n) => Math.max(1, n - 1))} disabled={pagina <= 1 || loading}>
              <ChevronLeft size={14} aria-hidden /> Anterior
            </Button>
            <Button size="sm" variant="outline" className="inline-flex items-center gap-1" onClick={() => setPagina((n) => Math.min(totalPaginas, n + 1))} disabled={pagina >= totalPaginas || loading}>
              Siguiente <ChevronRight size={14} aria-hidden />
            </Button>
          </div>
        </div>
      </Card>

      {selectedPedido && (
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Editar pedido #{selectedPedido.id}
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            El estado solo avanza al siguiente paso del pedido. Al cancelarlo, el inventario recupera los productos y las vistas de
            productos se recargan al guardar; un pedido cancelado o entregado ya no cambia.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Estado pedido"
              value={formPedido.estado}
              onChange={(e) => setFormPedido((p) => ({ ...p, estado: e.target.value }))}
              options={[
                selectedPedido.estado,
                ...siguientesEstadosSinCobro(selectedPedido.estado, selectedPedido.metodoPago),
              ].map((estado) => ({ value: estado, label: etiquetaEstadoPedido(estado, selectedPedido.metodoPago) }))}
              fullWidth
            />
            <Input label="Impuestos" type="number" value={formPedido.impuestos} onChange={(e) => setFormPedido((p) => ({ ...p, impuestos: e.target.value }))} fullWidth />
            <Input label="Descuento" type="number" value={formPedido.descuento} onChange={(e) => setFormPedido((p) => ({ ...p, descuento: e.target.value }))} fullWidth />
            <Input label="Método pago" value={formPedido.metodoPago} onChange={(e) => setFormPedido((p) => ({ ...p, metodoPago: e.target.value }))} fullWidth />
            <Input label="Referencia pago" value={formPedido.referenciaPago} onChange={(e) => setFormPedido((p) => ({ ...p, referenciaPago: e.target.value }))} fullWidth />
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button onClick={() => void guardarPedidoSeleccionado()} disabled={saving}>Guardar pedido</Button>
            {accionesPedido(selectedPedido.estado, selectedPedido.metodoPago).includes('cobrar') && (
              <Button variant="outline" onClick={() => void aprobarPagoYMarcarPagado()} disabled={saving}>Aprobar pago + marcar pagado</Button>
            )}
          </div>

          {/* Pedidos anteriores: el envío y su costo quedan como historial, de solo lectura. */}
          {(envioActual || selectedPedido.costoEnvio > 0) && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
              <h3 className="text-subtitle mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                Envío registrado (pedido anterior)
              </h3>
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                {selectedPedido.costoEnvio > 0 && (
                  <div>
                    <dt className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Costo de envío</dt>
                    <dd className="mf-cifras">{fmtMoneda(selectedPedido.costoEnvio, selectedPedido.moneda)}</dd>
                  </div>
                )}
                {envioActual && (
                  <>
                    <div>
                      <dt className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Empresa y guía</dt>
                      <dd>{[envioActual.empresaEnvio, envioActual.numeroGuia].filter(Boolean).join(' · ') || '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Estado del envío</dt>
                      <dd>
                        <Badge variant={variantEstadoEnvio(envioActual.estadoEnvio)}>{envioActual.estadoEnvio}</Badge>
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          )}
        </Card>
      )}

      <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Nuevo pedido online (admin)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Cliente"
            value={formNuevoPedido.usuarioId}
            onChange={(e) => setFormNuevoPedido((p) => ({ ...p, usuarioId: e.target.value }))}
            options={[
              { value: '', label: 'Selecciona cliente' },
              ...usuarios.map((u) => ({ value: u.id, label: `${u.nombre} — ${u.email}` })),
            ]}
            fullWidth
          />
          <Select
            label="Estado inicial"
            value={formNuevoPedido.estado}
            onChange={(e) => setFormNuevoPedido((p) => ({ ...p, estado: e.target.value }))}
            options={OPCIONES_ESTADO_INICIAL}
            fullWidth
          />
          <Select
            label="Método pago"
            value={formNuevoPedido.metodoPago}
            onChange={(e) => setFormNuevoPedido((p) => ({ ...p, metodoPago: e.target.value }))}
            options={OPCIONES_METODO_PAGO}
            fullWidth
          />
          <div className="md:col-span-2">
            <Input
              label="Notas cliente"
              value={formNuevoPedido.notasCliente}
              onChange={(e) => setFormNuevoPedido((p) => ({ ...p, notasCliente: e.target.value }))}
              fullWidth
            />
          </div>
        </div>

        <h3 className="text-subtitle mt-6 mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
          Líneas del pedido
        </h3>
        <div className="space-y-3">
          {lineasManual.map((linea, idx) => (
            <div key={linea.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <Input
                label={`Producto ID #${idx + 1}`}
                value={linea.productoId}
                onChange={(e) =>
                  setLineasManual((prev) =>
                    prev.map((x) => (x.id === linea.id ? { ...x, productoId: e.target.value } : x))
                  )
                }
                fullWidth
              />
              <Input
                label="Presentación ID"
                value={linea.presentacionId}
                onChange={(e) =>
                  setLineasManual((prev) =>
                    prev.map((x) => (x.id === linea.id ? { ...x, presentacionId: e.target.value } : x))
                  )
                }
                fullWidth
              />
              <Input
                label="Cantidad"
                type="number"
                min={1}
                value={linea.cantidad}
                onChange={(e) =>
                  setLineasManual((prev) =>
                    prev.map((x) => (x.id === linea.id ? { ...x, cantidad: e.target.value } : x))
                  )
                }
                fullWidth
              />
              <Button variant="outline" onClick={() => quitarLineaManual(linea.id)}>
                Quitar línea
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button variant="outline" onClick={agregarLineaManual}>Agregar línea</Button>
          <Button onClick={() => void crearPedidoManualAdmin()} disabled={saving}>Registrar pedido</Button>
        </div>
      </Card>
      </div>
    </AdminLayout>
  );
}
