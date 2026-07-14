'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { CheckCircle2, Clock3, Package, Truck } from 'lucide-react';
import {
  listarPedidos,
  actualizarPedido,
  listarEnviosPorPedido,
  crearEnvio,
  actualizarEnvio,
  listarPagosPorPedido,
  actualizarPagoParcial,
  crearPedido,
  etiquetaEstadoPedido,
  varianteBadgeEstadoPedido,
  type PedidoApi,
  type EnvioApi,
} from '../../../services/ecommerce';
import { getUsuarios, type Usuario } from '../../../services/usuarios';
import { listarDireccionesUsuario, type DireccionUsuarioDTO } from '../../../services/perfil';
import { showAlert, showToast } from '../../../utils/toast';
import { mensajeUsuarioDesdeErrorApi } from '../../../utils/apiErrorMessage';
import { emitCatalogStockChanged } from '../../../utils/catalogStockSync';

type EstadoEnvioUi = 'preparando' | 'en_transito' | 'entregado' | 'fallido';

type LineaManual = {
  id: string;
  productoId: string;
  presentacionId: string;
  cantidad: string;
};

const OPCIONES_ESTADO_PEDIDO = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'pendiente_pago', label: 'Pendiente de pago' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'preparando', label: 'Preparando' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const OPCIONES_ESTADO_ENVIO: { value: EstadoEnvioUi; label: string }[] = [
  { value: 'preparando', label: 'Preparando' },
  { value: 'en_transito', label: 'En tránsito' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'fallido', label: 'Fallido' },
];

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
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filtroUsuarioId, setFiltroUsuarioId] = useState<string>('');
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);

  const [formPedido, setFormPedido] = useState({
    estado: '',
    costoEnvio: '0',
    impuestos: '0',
    descuento: '0',
    metodoPago: '',
    referenciaPago: '',
  });

  const [envioActual, setEnvioActual] = useState<EnvioApi | null>(null);
  const [formEnvio, setFormEnvio] = useState({
    empresaEnvio: '',
    numeroGuia: '',
    estadoEnvio: 'preparando' as EstadoEnvioUi,
    fechaEnvio: '',
    fechaEntrega: '',
    notas: '',
  });

  const [formNuevoPedido, setFormNuevoPedido] = useState({
    usuarioId: '',
    direccionEnvioId: '',
    estado: 'pendiente_pago',
    metodoPago: '',
    notasCliente: '',
  });
  const [direccionesUsuario, setDireccionesUsuario] = useState<DireccionUsuarioDTO[]>([]);
  const [lineasManual, setLineasManual] = useState<LineaManual[]>([
    { id: crypto.randomUUID(), productoId: '', presentacionId: '', cantidad: '1' },
  ]);

  const usersMap = useMemo(() => {
    const m = new Map<string, Usuario>();
    usuarios.forEach((u) => m.set(u.id, u));
    return m;
  }, [usuarios]);

  const pedidosFiltrados = useMemo(() => {
    if (!filtroUsuarioId) return pedidos;
    return pedidos.filter((p) => p.usuarioId === filtroUsuarioId);
  }, [pedidos, filtroUsuarioId]);

  const stats = useMemo(() => {
    const s = { pendiente: 0, preparando: 0, enviado: 0, entregado: 0 };
    for (const p of pedidosFiltrados) {
      if (p.estado === 'pendiente_pago' || p.estado === 'borrador') s.pendiente += 1;
      else if (p.estado === 'preparando') s.preparando += 1;
      else if (p.estado === 'enviado') s.enviado += 1;
      else if (p.estado === 'entregado') s.entregado += 1;
    }
    return s;
  }, [pedidosFiltrados]);

  const selectedPedido = useMemo(
    () => pedidos.find((p) => p.id === selectedPedidoId) ?? null,
    [pedidos, selectedPedidoId]
  );

  async function cargarDatosBase() {
    setLoading(true);
    setError(null);
    try {
      const [peds, usrs] = await Promise.all([listarPedidos(), getUsuarios()]);
      setPedidos(peds);
      setUsuarios(usrs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar venta online');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargarDatosBase();
  }, []);

  useEffect(() => {
    if (!selectedPedido) {
      setEnvioActual(null);
      return;
    }
    setFormPedido({
      estado: selectedPedido.estado || 'pendiente_pago',
      costoEnvio: String(selectedPedido.costoEnvio ?? 0),
      impuestos: String(selectedPedido.impuestos ?? 0),
      descuento: String(selectedPedido.descuento ?? 0),
      metodoPago: selectedPedido.metodoPago ?? '',
      referenciaPago: selectedPedido.referenciaPago ?? '',
    });
    void (async () => {
      try {
        const envs = await listarEnviosPorPedido(selectedPedido.id);
        const e = envs[0] ?? null;
        setEnvioActual(e);
        setFormEnvio({
          empresaEnvio: e?.empresaEnvio ?? '',
          numeroGuia: e?.numeroGuia ?? '',
          estadoEnvio: (e?.estadoEnvio as EstadoEnvioUi) || 'preparando',
          fechaEnvio: e?.fechaEnvio ? String(e.fechaEnvio).slice(0, 10) : '',
          fechaEntrega: e?.fechaEntrega ? String(e.fechaEntrega).slice(0, 10) : '',
          notas: e?.notas ?? '',
        });
      } catch {
        setEnvioActual(null);
      }
    })();
  }, [selectedPedido]);

  useEffect(() => {
    const uid = formNuevoPedido.usuarioId;
    if (!uid) {
      setDireccionesUsuario([]);
      setFormNuevoPedido((p) => ({ ...p, direccionEnvioId: '' }));
      return;
    }
    void (async () => {
      try {
        const dirs = await listarDireccionesUsuario({ usuarioId: uid });
        setDireccionesUsuario(dirs);
      } catch {
        setDireccionesUsuario([]);
      }
    })();
  }, [formNuevoPedido.usuarioId]);

  async function accionEstadoRapida(id: number, estado: string) {
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
        costoEnvio: Number(formPedido.costoEnvio || 0),
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

  async function guardarEnvio() {
    if (!selectedPedido) return;
    setSaving(true);
    try {
      const payload = {
        pedidoId: selectedPedido.id,
        empresaEnvio: formEnvio.empresaEnvio || undefined,
        numeroGuia: formEnvio.numeroGuia || undefined,
        estadoEnvio: formEnvio.estadoEnvio,
        fechaEnvio: formEnvio.fechaEnvio || undefined,
        fechaEntrega: formEnvio.fechaEntrega || undefined,
        notas: formEnvio.notas || undefined,
      };
      if (envioActual) {
        await actualizarEnvio(envioActual.id, payload);
      } else {
        await crearEnvio(payload);
      }
      const envs = await listarEnviosPorPedido(selectedPedido.id);
      setEnvioActual(envs[0] ?? null);
      showToast('Envío guardado.', 'success');
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'No se pudo guardar el envío');
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
        direccionEnvioId: formNuevoPedido.direccionEnvioId || null,
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
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Venta Online
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {pedidos.length} pedido{pedidos.length === 1 ? '' : 's'} · conectado a pedidos, pagos y envíos
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Pendientes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{stats.pendiente}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Package size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Preparando</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{stats.preparando}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Truck size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Enviados</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{stats.enviado}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Entregados</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{stats.entregado}</p>
              </div>
            </div>
          </Card>
        </div>

        {error && (
          <Card className="border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

      <Card variant="elevated" padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Select
            label="Filtrar por cliente"
            value={filtroUsuarioId}
            onChange={(e) => setFiltroUsuarioId(e.target.value)}
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
              {loading ? 'Cargando pedidos…' : `${pedidosFiltrados.length} pedidos`}
            </span>
          </div>
        </div>
      </Card>

      <Card variant="elevated" padding="lg">
        <Table headers={['Pedido', 'Cliente', 'Total', 'Método', 'Estado', 'Fecha', 'Acciones']} headerSutil>
          {pedidosFiltrados.map((p) => (
            <TableRow key={p.id}>
              <TableCell rowPadding="lg">#{p.id}</TableCell>
              <TableCell rowPadding="lg">
                {usersMap.get(p.usuarioId ?? '')?.nombre ?? p.usuarioId ?? '—'}
              </TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{fmtMoneda(p.total, p.moneda)}</TableCell>
              <TableCell rowPadding="lg">{p.metodoPago || '—'}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={varianteBadgeEstadoPedido(p.estado)}>{etiquetaEstadoPedido(p.estado)}</Badge>
              </TableCell>
              <TableCell rowPadding="lg">{formatearFecha(p.creadoEn)}</TableCell>
              <TableCell rowPadding="lg">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedPedidoId(p.id)}>Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => void accionEstadoRapida(p.id, 'preparando')} disabled={saving}>Preparar</Button>
                  <Button size="sm" variant="outline" onClick={() => void accionEstadoRapida(p.id, 'enviado')} disabled={saving}>Enviar</Button>
                  <Button size="sm" variant="outline" onClick={() => void accionEstadoRapida(p.id, 'entregado')} disabled={saving}>Entregar</Button>
                  <Button size="sm" variant="outline" onClick={() => void accionEstadoRapida(p.id, 'cancelado')} disabled={saving}>Cancelar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      {selectedPedido && (
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Editar pedido #{selectedPedido.id}
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Al marcar el pedido como cancelado, el backend devuelve stock al inventario y las vistas de productos se recargan al guardar.
            Si cambias de cancelado a otro estado, el servidor vuelve a reservar stock según las líneas del pedido y puede responder con error si no hay existencias.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Estado pedido" value={formPedido.estado} onChange={(e) => setFormPedido((p) => ({ ...p, estado: e.target.value }))} options={OPCIONES_ESTADO_PEDIDO} fullWidth />
            <Input label="Costo envío" type="number" value={formPedido.costoEnvio} onChange={(e) => setFormPedido((p) => ({ ...p, costoEnvio: e.target.value }))} fullWidth />
            <Input label="Impuestos" type="number" value={formPedido.impuestos} onChange={(e) => setFormPedido((p) => ({ ...p, impuestos: e.target.value }))} fullWidth />
            <Input label="Descuento" type="number" value={formPedido.descuento} onChange={(e) => setFormPedido((p) => ({ ...p, descuento: e.target.value }))} fullWidth />
            <Input label="Método pago" value={formPedido.metodoPago} onChange={(e) => setFormPedido((p) => ({ ...p, metodoPago: e.target.value }))} fullWidth />
            <Input label="Referencia pago" value={formPedido.referenciaPago} onChange={(e) => setFormPedido((p) => ({ ...p, referenciaPago: e.target.value }))} fullWidth />
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button onClick={() => void guardarPedidoSeleccionado()} disabled={saving}>Guardar pedido</Button>
            <Button variant="outline" onClick={() => void aprobarPagoYMarcarPagado()} disabled={saving}>Aprobar pago + marcar pagado</Button>
          </div>

          <h3 className="text-subtitle mt-6 mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
            Envío
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Empresa envío" value={formEnvio.empresaEnvio} onChange={(e) => setFormEnvio((x) => ({ ...x, empresaEnvio: e.target.value }))} fullWidth />
            <Input label="Número guía" value={formEnvio.numeroGuia} onChange={(e) => setFormEnvio((x) => ({ ...x, numeroGuia: e.target.value }))} fullWidth />
            <Select label="Estado envío" value={formEnvio.estadoEnvio} onChange={(e) => setFormEnvio((x) => ({ ...x, estadoEnvio: e.target.value as EstadoEnvioUi }))} options={OPCIONES_ESTADO_ENVIO} fullWidth />
            <Input label="Fecha envío" type="date" value={formEnvio.fechaEnvio} onChange={(e) => setFormEnvio((x) => ({ ...x, fechaEnvio: e.target.value }))} fullWidth />
            <Input label="Fecha entrega" type="date" value={formEnvio.fechaEntrega} onChange={(e) => setFormEnvio((x) => ({ ...x, fechaEntrega: e.target.value }))} fullWidth />
            <Input label="Notas" value={formEnvio.notas} onChange={(e) => setFormEnvio((x) => ({ ...x, notas: e.target.value }))} fullWidth />
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Button onClick={() => void guardarEnvio()} disabled={saving}>
              {envioActual ? 'Actualizar envío' : 'Crear envío'}
            </Button>
            {envioActual && (
              <Badge variant={variantEstadoEnvio(envioActual.estadoEnvio)}>
                {envioActual.estadoEnvio}
              </Badge>
            )}
          </div>
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
            label="Dirección (opcional)"
            value={formNuevoPedido.direccionEnvioId}
            onChange={(e) => setFormNuevoPedido((p) => ({ ...p, direccionEnvioId: e.target.value }))}
            options={[
              { value: '', label: 'Sin dirección (retiro)' },
              ...direccionesUsuario.map((d) => ({
                value: d.id,
                label: `${d.calle} ${d.numeroInterior ?? ''} — ${d.coloniaBarrio}`.trim(),
              })),
            ]}
            fullWidth
          />
          <Select
            label="Estado inicial"
            value={formNuevoPedido.estado}
            onChange={(e) => setFormNuevoPedido((p) => ({ ...p, estado: e.target.value }))}
            options={OPCIONES_ESTADO_PEDIDO}
            fullWidth
          />
          <Input
            label="Método pago"
            value={formNuevoPedido.metodoPago}
            onChange={(e) => setFormNuevoPedido((p) => ({ ...p, metodoPago: e.target.value }))}
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
