'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Table, { TableRow, TableCell } from '../ui/Table';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Package, CheckCircle2, XCircle, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  listarPedidosPaginado,
  obtenerPedido,
  actualizarPedido,
  listarPedidoItems,
  listarPagosPorPedido,
  actualizarPagoParcial,
  crearPago,
  etiquetaEstadoPedido,
  varianteBadgeEstadoPedido,
  type PedidoApi,
  type PedidoItemApi,
  type EstadoPedidoUi,
} from '../../services/ecommerce';
import { showAlert, showToast } from '../../utils/toast';
import { mensajeUsuarioDesdeErrorApi } from '../../utils/apiErrorMessage';

const OPCIONES_ESTADO: { value: EstadoPedidoUi; label: string }[] = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'pendiente_pago', label: 'Pendiente de pago' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'preparando', label: 'Preparando' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

/** Lo que la jefa necesita a diario: pendiente de cobro o en preparación. No incluye
 * el histórico (entregado/cancelado/enviado/borrador) — eso se ve con "Ver todo". */
const ESTADOS_TRABAJO_DIARIO: EstadoPedidoUi[] = ['pendiente_pago', 'pagado', 'preparando'];
const TAMANO_PAGINA = 20;

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
 * Cobro y seguimiento de pedidos online para operación (la jefa). Autocontenido: hace
 * su propio fetch y maneja su propio estado — igual patrón que PanelAsistencia.tsx.
 * Alcance mínimo a propósito: sin envíos, sin crear pedido manual, sin editar montos
 * (costoEnvio/impuestos/descuento siguen solo-admin en el backend). admin/venta-online
 * conserva la versión completa; esto no la reemplaza.
 *
 * Dos modos de lista:
 * - "trabajo" (default): los 3 estados del día a día, traídos completos y paginados del
 *   lado del cliente — con paginación real de verdad (page/limit del backend) porque el
 *   backend no filtra por una lista de estados en una sola llamada.
 * - "todos": paginación real contra el backend (page/limit/count/totalPages), sin filtro
 *   de estado — para llegar a un pedido histórico viejo.
 * La búsqueda en modo "todos" solo filtra dentro de la página cargada (no busca en los
 * 3010 pedidos completos) — sería otra llamada al backend con soporte de búsqueda que
 * no existe hoy; queda anotado, no es un descarte silencioso nuevo.
 */
export default function PanelPedidosOnline() {
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
      const listas = await Promise.all(ESTADOS_TRABAJO_DIARIO.map((estado) => fetchTodosPorEstado(estado)));
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

  async function cobrarYMarcarPagado(id: number) {
    setGuardando(true);
    try {
      const pedido = pedidosTrabajo.find((p) => p.id === id) ?? pedidosTodos.find((p) => p.id === id) ?? detallePedido;
      const pagos = await listarPagosPorPedido(id);
      if (pagos.length) {
        // Ya había un registro de pago (flujo antiguo/importado): aprobarlo.
        const ultimo = pagos[pagos.length - 1];
        await actualizarPagoParcial(ultimo.id, { estado: 'aprobado', monto: pedido?.total });
      } else {
        // Caso normal hoy: sin pasarela, el checkout ya no crea ningún Pago — la jefa
        // cobra físicamente al recoger y registra el pago ya aprobado en ese momento.
        await crearPago({
          pedidoId: id,
          monto: pedido?.total ?? 0,
          metodo: 'efectivo',
          estado: 'aprobado',
          intentoNumero: 1,
        });
      }
      await actualizarPedido(id, { estado: 'pagado' });
      await recargar();
      if (detalleId === id) {
        const actualizado = await obtenerPedido(id);
        setDetallePedido(actualizado);
      }
      showToast(`Pedido #${id} cobrado y marcado como pagado.`, 'success');
    } catch (e) {
      void showAlert(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
            <ShoppingBag size={18} /> Pedidos online
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
              {modo === 'trabajo' ? 'Ver todo' : 'Volver a pendientes de cobro'}
            </Button>
          </div>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
          {modo === 'trabajo'
            ? 'Mostrando pedidos pendientes de pago, pagados o en preparación — el histórico completo (entregados, cancelados) está en "Ver todo".'
            : 'Mostrando todos los pedidos, cualquier estado.'}
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
            <Table headers={['Pedido', 'Clienta', 'Fecha', 'Total', 'Estado', 'Acciones']} headerSutil>
              {pedidosPagina.map((p) => (
                <TableRow key={p.id}>
                  <TableCell rowPadding="lg">#{p.id}</TableCell>
                  <TableCell rowPadding="lg">{nombreCliente(p)}</TableCell>
                  <TableCell rowPadding="lg">{formatearFecha(p.creadoEn)}</TableCell>
                  <TableCell rowPadding="lg" className="font-semibold">{fmtMoneda(p.total, p.moneda)}</TableCell>
                  <TableCell rowPadding="lg">
                    <Badge variant={varianteBadgeEstadoPedido(p.estado)}>{etiquetaEstadoPedido(p.estado)}</Badge>
                  </TableCell>
                  <TableCell rowPadding="lg">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void abrirDetalle(p.id)}>Ver</Button>
                      {p.estado !== 'pagado' && p.estado !== 'entregado' && p.estado !== 'cancelado' && (
                        <Button size="sm" className="inline-flex items-center gap-1" onClick={() => void cobrarYMarcarPagado(p.id)} disabled={guardando}>
                          <CheckCircle2 size={14} /> Cobrar
                        </Button>
                      )}
                      {p.estado !== 'preparando' && p.estado !== 'entregado' && p.estado !== 'cancelado' && (
                        <Button size="sm" variant="outline" className="inline-flex items-center gap-1" onClick={() => void cambiarEstado(p.id, 'preparando')} disabled={guardando}>
                          <Package size={14} /> Listo para recoger
                        </Button>
                      )}
                      {p.estado !== 'entregado' && p.estado !== 'cancelado' && (
                        <Button size="sm" variant="outline" onClick={() => void cambiarEstado(p.id, 'entregado')} disabled={guardando}>Entregado</Button>
                      )}
                      {p.estado !== 'cancelado' && p.estado !== 'entregado' && (
                        <Button size="sm" variant="outline" className="inline-flex items-center gap-1" onClick={() => void cambiarEstado(p.id, 'cancelado')} disabled={guardando}>
                          <XCircle size={14} /> Cancelar
                        </Button>
                      )}
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
            <Button variant="outline" onClick={cerrarDetalle} disabled={guardando}>Cerrar</Button>
            {detallePedido && detallePedido.estado !== 'pagado' && detallePedido.estado !== 'entregado' && detallePedido.estado !== 'cancelado' && (
              <Button onClick={() => void cobrarYMarcarPagado(detallePedido.id)} disabled={guardando}>
                {guardando ? 'Procesando…' : 'Cobrar y marcar pagado'}
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
              <Badge variant={varianteBadgeEstadoPedido(detallePedido.estado)}>{etiquetaEstadoPedido(detallePedido.estado)}</Badge>
            </div>

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
                  options={OPCIONES_ESTADO}
                  fullWidth
                />
                <Button
                  onClick={() => void cambiarEstado(detallePedido.id, estadoSeleccionado)}
                  disabled={guardando || estadoSeleccionado === detallePedido.estado}
                >
                  Guardar
                </Button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                Los botones rápidos de la lista cubren los casos comunes; usa esto para cualquier otro valor.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
