'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Table, { TableRow, TableCell } from '../ui/Table';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import {
  Package,
  PackageCheck,
  CheckCircle2,
  HandCoins,
  XCircle,
  ShoppingBag,
  Store,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import {
  listarPedidosPaginado,
  obtenerPedido,
  actualizarPedido,
  listarPedidoItems,
  listarPagosPorPedido,
  actualizarPagoParcial,
  crearPago,
  esPagoEnSalon,
  etiquetaEstadoPedido,
  etiquetaMetodoPagoPedido,
  varianteBadgeEstadoPedido,
  type PedidoApi,
  type PedidoItemApi,
  type EstadoPedidoUi,
} from '../../services/ecommerce';
import { showAlert, showConfirm, showToast } from '../../utils/toast';
import { accionesPedido, siguientesEstadosSinCobro, type AccionPedido } from '../../utils/flujoPedido';
import { mensajeUsuarioDesdeErrorApi } from '../../utils/apiErrorMessage';

export type VistaPedidos = 'cobro' | 'recoger';

/** Lista de trabajo de cada vista. "cobro": todo lo activo (por cobrar, por preparar o por entregar).
 * "recoger": lo que ya se prepara o espera a la clienta en el mostrador. El histórico
 * (entregado/cancelado/enviado/borrador) se ve con "Ver todo". */
const ESTADOS_POR_VISTA: Record<VistaPedidos, EstadoPedidoUi[]> = {
  cobro: ['pendiente_pago', 'pagado', 'preparando', 'listo_recoger'],
  recoger: ['preparando', 'listo_recoger'],
};
const TAMANO_PAGINA = 20;

/** Botón rápido de cada paso del flujo (utils/flujoPedido.ts decide cuáles aplican). */
const BOTON_ACCION: Record<AccionPedido, { etiqueta: string; icono: LucideIcon; principal?: boolean }> = {
  cobrar: { etiqueta: 'Cobrar', icono: CheckCircle2, principal: true },
  preparar: { etiqueta: 'Preparar', icono: Package, principal: true },
  listo: { etiqueta: 'Marcar listo para recoger', icono: PackageCheck, principal: true },
  entregar: { etiqueta: 'Marcar entregado', icono: Store, principal: true },
  cobrarEntregar: { etiqueta: 'Cobrar y entregar', icono: HandCoins, principal: true },
  cancelar: { etiqueta: 'Cancelar', icono: XCircle },
};

/** Cómo se paga, en corto, para la columna de la lista. */
function textoPago(p: PedidoApi): string {
  if (!esPagoEnSalon(p.metodoPago)) return etiquetaMetodoPagoPedido(p.metodoPago);
  return p.estado === 'entregado' ? 'Cobrado en el salón' : 'Paga al recoger';
}

function fmtMoneda(n: number, moneda = 'MXN') {
  return `${new Intl.NumberFormat('es-MX').format(n)} ${moneda}`;
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleString('es-MX', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function nombreCliente(p: PedidoApi): string {
  return p.usuarioNombre || p.usuarioEmail || p.usuarioId || '—';
}

/**
 * Trae TODOS los pedidos de un estado (recorre las páginas del backend hasta agotarlas).
 * Los 3 estados de "trabajo diario" son un subconjunto chico y acotado por naturaleza
 * (pedidos activos ahora mismo, no todo el histórico) — hoy son ~200 filas en total entre
 * los tres, así que traerlos completos para paginar del lado del cliente es razonable.
 * El backend no soporta filtrar por una LISTA de estados en una sola llamada (confirmado,
 * decisión explícita: no tocar backend en esta tarea), por eso son 3 llamadas separadas.
 */
async function fetchTodosPorEstado(estado: EstadoPedidoUi): Promise<PedidoApi[]> {
  const primera = await listarPedidosPaginado({ estado, page: 1, limit: 100 });
  const todos = [...primera.data];
  for (let pagina = 2; pagina <= primera.totalPages; pagina++) {
    const siguiente = await listarPedidosPaginado({ estado, page: pagina, limit: 100 });
    todos.push(...siguiente.data);
  }
  return todos;
}

/**
 * Cobro y seguimiento de pedidos online (todo se recoge en el salón). Autocontenido: hace
 * su propio fetch y maneja su propio estado — igual patrón que PanelAsistencia.tsx.
 * Alcance mínimo a propósito: sin crear pedido manual, sin editar montos
 * (impuestos/descuento siguen solo-admin en el backend). admin/venta-online
 * conserva la versión completa; esto no la reemplaza.
 *
 * `vista="recoger"` es "Pedidos por recoger": solo en preparación o listos para recoger.
 *
 * Dos modos de lista:
 * - "trabajo" (default): los estados activos de la vista, traídos completos y paginados del
 *   lado del cliente — con paginación real de verdad (page/limit del backend) porque el
 *   backend no filtra por una lista de estados en una sola llamada.
 * - "todos": paginación real contra el backend (page/limit/count/totalPages), sin filtro
 *   de estado — para llegar a un pedido histórico viejo.
 * La búsqueda en modo "todos" solo filtra dentro de la página cargada (no busca en los
 * 3010 pedidos completos) — sería otra llamada al backend con soporte de búsqueda que
 * no existe hoy; queda anotado, no es un descarte silencioso nuevo.
 */
export default function PanelPedidosOnline({ vista = 'cobro' }: { vista?: VistaPedidos }) {
  const estadosTrabajo = ESTADOS_POR_VISTA[vista];
  const [modo, setModo] = useState<'trabajo' | 'todos'>('trabajo');
  const [pedidosTrabajo, setPedidosTrabajo] = useState<PedidoApi[]>([]);
  const [pedidosTodos, setPedidosTodos] = useState<PedidoApi[]>([]);
  const [totalTodos, setTotalTodos] = useState(0);
  const [totalPaginasTodos, setTotalPaginasTodos] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [detallePedido, setDetallePedido] = useState<PedidoApi | null>(null);
  const [detalleItems, setDetalleItems] = useState<PedidoItemApi[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoPedidoUi>('pendiente_pago');
  const [guardando, setGuardando] = useState(false);

  const cargarTrabajo = async () => {
    setLoading(true);
    setError(null);
    try {
      const listas = await Promise.all(estadosTrabajo.map((estado) => fetchTodosPorEstado(estado)));
      const combinados = listas.flat().sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''));
      setPedidosTrabajo(combinados);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const cargarTodos = async (paginaSolicitada: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listarPedidosPaginado({ page: paginaSolicitada, limit: TAMANO_PAGINA });
      setPedidosTodos(res.data);
      setTotalTodos(res.count);
      setTotalPaginasTodos(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const recargar = async () => {
    if (modo === 'trabajo') await cargarTrabajo();
    else await cargarTodos(pagina);
  };

  // Cambiar de modo reinicia a la página 1.
  useEffect(() => { setPagina(1); }, [modo]);
  // Buscar reinicia a la página 1 (evita quedar en una página vacía tras filtrar).
  useEffect(() => { setPagina(1); }, [busqueda]);

  useEffect(() => {
    if (modo === 'trabajo') void cargarTrabajo();
  }, [modo]);

  useEffect(() => {
    if (modo === 'todos') void cargarTodos(pagina);
  }, [modo, pagina]);

  const pedidosFiltrados = useMemo(() => {
    const base = modo === 'trabajo' ? pedidosTrabajo : pedidosTodos;
    const term = busqueda.trim().toLowerCase();
    if (!term) return base;
    return base.filter((p) =>
      nombreCliente(p).toLowerCase().includes(term) ||
      (p.usuarioEmail ?? '').toLowerCase().includes(term) ||
      String(p.id).includes(term)
    );
  }, [modo, pedidosTrabajo, pedidosTodos, busqueda]);

  // Modo "trabajo": todo ya está en memoria, se pagina del lado del cliente.
  // Modo "todos": ya viene paginado del backend, se muestra tal cual (la página completa).
  const pedidosPagina = modo === 'trabajo'
    ? pedidosFiltrados.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA)
    : pedidosFiltrados;

  const totalMostrable = modo === 'trabajo' ? pedidosFiltrados.length : totalTodos;
  const totalPaginasMostrable = modo === 'trabajo'
    ? Math.max(1, Math.ceil(pedidosFiltrados.length / TAMANO_PAGINA))
    : totalPaginasTodos;

  const desde = totalMostrable === 0 ? 0 : (pagina - 1) * TAMANO_PAGINA + 1;
  const hasta = modo === 'trabajo'
    ? Math.min(pagina * TAMANO_PAGINA, totalMostrable)
    : Math.min((pagina - 1) * TAMANO_PAGINA + pedidosTodos.length, totalMostrable);

  const abrirDetalle = async (id: number) => {
    setDetalleId(id);
    setCargandoDetalle(true);
    setDetallePedido(null);
    setDetalleItems([]);
    try {
      const [pedido, items] = await Promise.all([obtenerPedido(id), listarPedidoItems(id)]);
      setDetallePedido(pedido);
      setDetalleItems(items);
      setEstadoSeleccionado((pedido?.estado ?? 'pendiente_pago') as EstadoPedidoUi);
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'No se pudo cargar el pedido');
      setDetalleId(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    if (guardando) return;
    setDetalleId(null);
    setDetallePedido(null);
    setDetalleItems([]);
  };

  async function cambiarEstado(id: number, estado: EstadoPedidoUi) {
    setGuardando(true);
    try {
      await actualizarPedido(id, { estado });
      await recargar();
      if (detalleId === id) {
        const actualizado = await obtenerPedido(id);
        setDetallePedido(actualizado);
      }
      showToast(`Pedido #${id} → ${etiquetaEstadoPedido(estado)}.`, 'success');
    } catch (e) {
      void showAlert(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setGuardando(false);
    }
  }

  /** Registra el cobro y avanza el pedido: a 'pagado' (pago en línea pendiente) o, en el pago al
   *  recoger, directo a 'entregado' ("Cobrar y entregar" en el mostrador). */
  async function cobrarPedido(id: number, estadoFinal: 'pagado' | 'entregado') {
    setGuardando(true);
    try {
      const pedido = pedidosTrabajo.find((p) => p.id === id) ?? pedidosTodos.find((p) => p.id === id) ?? detallePedido;
      const pagos = await listarPagosPorPedido(id);
      if (pagos.length) {
        // Ya había un registro de pago (flujo antiguo/importado): aprobarlo.
        const ultimo = pagos[pagos.length - 1];
        await actualizarPagoParcial(ultimo.id, { estado: 'aprobado', monto: pedido?.total });
      } else {
        // Sin pasarela, el checkout no crea ningún Pago: quien cobra lo registra ya aprobado.
        // Pago en línea: con el método que eligió la clienta. Al recoger: efectivo, como antes.
        const metodo = pedido && !esPagoEnSalon(pedido.metodoPago) && pedido.metodoPago ? pedido.metodoPago : 'efectivo';
        await crearPago({
          pedidoId: id,
          monto: pedido?.total ?? 0,
          metodo,
          estado: 'aprobado',
          intentoNumero: 1,
        });
      }
      await actualizarPedido(id, { estado: estadoFinal });
      await recargar();
      if (detalleId === id) {
        const actualizado = await obtenerPedido(id);
        setDetallePedido(actualizado);
      }
      showToast(
        estadoFinal === 'entregado' ? `Pedido #${id} cobrado y entregado en el salón.` : `Pedido #${id} cobrado y marcado como pagado.`,
        'success'
      );
    } catch (e) {
      void showAlert(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setGuardando(false);
    }
  }

  async function ejecutarAccion(p: PedidoApi, accion: AccionPedido) {
    if (accion === 'cobrar') return cobrarPedido(p.id, 'pagado');
    if (accion === 'cobrarEntregar') return cobrarPedido(p.id, 'entregado');
    if (accion === 'preparar') return cambiarEstado(p.id, 'preparando');
    if (accion === 'listo') return cambiarEstado(p.id, 'listo_recoger');
    if (accion === 'entregar') return cambiarEstado(p.id, 'entregado');
    const ok = await showConfirm('Los productos vuelven al inventario y la clienta recibe el aviso. No se puede deshacer.', {
      title: `¿Cancelar el pedido #${p.id}?`,
      confirmText: 'Sí, cancelar pedido',
      cancelText: 'No',
    });
    if (ok) await cambiarEstado(p.id, 'cancelado');
  }

  /** Opciones del selector del detalle: el estado actual y los siguientes válidos que no implican cobrar. */
  const opcionesEstado = detallePedido
    ? [detallePedido.estado, ...siguientesEstadosSinCobro(detallePedido.estado, detallePedido.metodoPago)].map((estado) => ({
        value: estado,
        label: etiquetaEstadoPedido(estado, detallePedido.metodoPago),
      }))
    : [];
  const accionPrincipalDetalle = detallePedido
    ? accionesPedido(detallePedido.estado, detallePedido.metodoPago).find((a) => a !== 'cancelar')
    : undefined;

  return (
    <>
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
            {vista === 'recoger' ? (
              <>
                <Store size={18} aria-hidden /> Pedidos por recoger
              </>
            ) : (
              <>
                <ShoppingBag size={18} aria-hidden /> Pedidos online
              </>
            )}
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              placeholder="Buscar por clienta, email o # de pedido"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full sm:w-72"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModo(modo === 'trabajo' ? 'todos' : 'trabajo')}
              disabled={loading}
            >
              {modo === 'trabajo' ? 'Ver todo' : vista === 'recoger' ? 'Volver a por recoger' : 'Volver a pendientes'}
            </Button>
          </div>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
          {modo === 'todos'
            ? 'Mostrando todos los pedidos, cualquier estado.'
            : vista === 'recoger'
              ? 'Pedidos en preparación o listos para recoger en el salón. Al marcarlo listo, la clienta recibe el aviso en la app y por correo.'
              : 'Pedidos por cobrar, por preparar o listos para recoger — el histórico completo (entregados, cancelados) está en "Ver todo".'}
          {modo === 'todos' && busqueda.trim() && ' La búsqueda solo filtra dentro de la página actual, no en los pedidos de otras páginas.'}
        </p>

        {error && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{error}</p>}

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Cargando pedidos…</p>
        ) : pedidosPagina.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            {totalMostrable === 0 ? 'No hay pedidos que coincidan.' : 'No hay pedidos en esta página.'}
          </p>
        ) : (
          <>
            <Table headers={['Pedido', 'Clienta', 'Total', 'Estado', 'Acciones']} headerSutil>
              {pedidosPagina.map((p) => (
                <TableRow key={p.id}>
                  <TableCell rowPadding="lg">
                    <span className="font-semibold">#{p.id}</span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>{formatearFecha(p.creadoEn)}</span>
                  </TableCell>
                  <TableCell rowPadding="lg" className="!whitespace-normal min-w-[9rem] max-w-[14rem]">{nombreCliente(p)}</TableCell>
                  <TableCell rowPadding="lg">
                    <span className="font-semibold">{fmtMoneda(p.total, p.moneda)}</span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>{textoPago(p)}</span>
                  </TableCell>
                  <TableCell rowPadding="lg">
                    <Badge variant={varianteBadgeEstadoPedido(p.estado)}>{etiquetaEstadoPedido(p.estado, p.metodoPago)}</Badge>
                  </TableCell>
                  <TableCell rowPadding="lg">
                    {/* Cancelar, por ser destructiva, vive en el detalle ("Ver"), lejos de los botones del flujo. */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void abrirDetalle(p.id)}>Ver</Button>
                      {accionesPedido(p.estado, p.metodoPago).filter((a) => a !== 'cancelar').map((accion) => {
                        const { etiqueta, icono: Icono, principal } = BOTON_ACCION[accion];
                        return (
                          <Button
                            key={accion}
                            size="sm"
                            variant={principal ? 'primary' : 'outline'}
                            className="inline-flex items-center gap-1"
                            onClick={() => void ejecutarAccion(p, accion)}
                            disabled={guardando}
                          >
                            <Icono size={14} aria-hidden /> {etiqueta}
                          </Button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
              <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                Mostrando {desde}–{hasta} de {totalMostrable}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="inline-flex items-center gap-1"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina <= 1 || loading}
                >
                  <ChevronLeft size={14} /> Anterior
                </Button>
                <span className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                  Página {pagina} de {totalPaginasMostrable}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="inline-flex items-center gap-1"
                  onClick={() => setPagina((p) => Math.min(totalPaginasMostrable, p + 1))}
                  disabled={pagina >= totalPaginasMostrable || loading}
                >
                  Siguiente <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        isOpen={detalleId !== null}
        onClose={cerrarDetalle}
        title={`Pedido #${detalleId ?? ''}`}
        size="lg"
        footer={
          <>
            {detallePedido && accionesPedido(detallePedido.estado, detallePedido.metodoPago).includes('cancelar') && (
              <Button
                variant="danger"
                className="sm:mr-auto inline-flex items-center gap-1"
                onClick={() => void ejecutarAccion(detallePedido, 'cancelar')}
                disabled={guardando}
              >
                <XCircle size={14} aria-hidden /> Cancelar pedido
              </Button>
            )}
            <Button variant="outline" onClick={cerrarDetalle} disabled={guardando}>Cerrar</Button>
            {detallePedido && accionPrincipalDetalle && (
              <Button onClick={() => void ejecutarAccion(detallePedido, accionPrincipalDetalle)} disabled={guardando}>
                {guardando ? 'Procesando…' : BOTON_ACCION[accionPrincipalDetalle].etiqueta}
              </Button>
            )}
          </>
        }
      >
        {cargandoDetalle ? (
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
        ) : !detallePedido ? (
          <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>No se pudo cargar el pedido.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>{nombreCliente(detallePedido)}</p>
                <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>{formatearFecha(detallePedido.creadoEn)}</p>
              </div>
              <Badge variant={varianteBadgeEstadoPedido(detallePedido.estado)}>
                {etiquetaEstadoPedido(detallePedido.estado, detallePedido.metodoPago)}
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              <strong style={{ color: 'var(--menu-texto-principal)' }}>Pago:</strong> {etiquetaMetodoPagoPedido(detallePedido.metodoPago)}
            </p>

            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Productos</h3>
              {detalleItems.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Sin líneas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {detalleItems.map((it) => (
                    <div key={it.id} className="flex justify-between text-sm">
                      <span style={{ color: 'var(--menu-texto-principal)' }}>
                        {it.nombreProducto ?? 'Producto'}
                        {it.tamanio && <span style={{ color: 'var(--encabezados-alterno)' }}> — {it.tamanio}</span>}
                        <span style={{ color: 'var(--encabezados-alterno)' }}> × {it.cantidad}</span>
                      </span>
                      <span style={{ color: 'var(--menu-texto-principal)' }}>{fmtMoneda(it.subtotal, detallePedido.moneda)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3 mt-3 border-t flex justify-between font-semibold" style={{ borderColor: 'var(--fondos-suaves)', color: 'var(--menu-texto-principal)' }}>
                <span>Total</span>
                <span>{fmtMoneda(detallePedido.total, detallePedido.moneda)}</span>
              </div>
            </div>

            {detallePedido.notasCliente && (
              <div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>Notas de la clienta</h3>
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>{detallePedido.notasCliente}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Cambiar estado</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={estadoSeleccionado}
                  onChange={(e) => setEstadoSeleccionado(e.target.value as EstadoPedidoUi)}
                  options={opcionesEstado}
                  fullWidth
                  disabled={opcionesEstado.length <= 1}
                />
                <Button
                  onClick={() => void cambiarEstado(detallePedido.id, estadoSeleccionado)}
                  disabled={guardando || estadoSeleccionado === detallePedido.estado}
                >
                  Guardar
                </Button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                {opcionesEstado.length <= 1
                  ? 'Este pedido ya terminó: no tiene más pasos.'
                  : 'Solo aparecen los pasos que siguen. Para cobrar, usa el botón de cobro: registra el pago.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
