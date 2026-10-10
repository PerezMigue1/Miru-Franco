'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import Badge from '../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import {
  listarDevolucionesDelCliente,
  listarPedidos,
  listarPedidoItems,
  crearDevolucion,
  cancelarDevolucion,
  etiquetaEstadoPedido,
  type CausaDevolucion,
  type DevolucionApi,
  type PedidoApi,
  type PedidoItemApi,
  type TipoDevolucion,
} from '../../../../services/ecommerce';
import {
  causasDe,
  detalleMotivoDevolucion,
  DIAS_CAMBIO_PRODUCTO,
  etiquetaCausa,
  etiquetaEstadoDevolucion,
  requiereArticulo,
} from '../../../../utils/politicaDevolucion';
import { hasValidToken } from '../../../../utils/security';
import { showAlert, showConfirm, showToast } from '../../../../utils/toast';

/** Pedidos sobre los que cabe una solicitud: entregados, o cancelados que ya se pagaron (reembolso). */
const esElegible = (p: PedidoApi) => p.estado === 'entregado' || (p.estado === 'cancelado' && !!p.pagadoEn);

const varianteEstado = (estado: string) =>
  estado === 'aprobada' ? 'success' : estado === 'rechazada' ? 'danger' : estado === 'pendiente' ? 'warning' : 'default';

export default function DevolucionesPage() {
  const [lista, setLista] = useState<DevolucionApi[]>([]);
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [items, setItems] = useState<PedidoItemApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [pedidoId, setPedidoId] = useState('');
  const [itemId, setItemId] = useState('');
  const [tipo, setTipo] = useState<TipoDevolucion>('cambio');
  const [causa, setCausa] = useState<CausaDevolucion>('sellado_sin_abrir');
  const [sellado, setSellado] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);

  const cargar = async () => {
    if (!hasValidToken()) {
      setError('Inicia sesión para gestionar devoluciones.');
      setLoading(false);
      return;
    }
    try {
      const [devs, peds] = await Promise.all([listarDevolucionesDelCliente(), listarPedidos({ propios: true })]);
      setLista(devs);
      setPedidos(peds.filter(esElegible));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  useEffect(() => {
    const pid = parseInt(pedidoId, 10);
    if (!Number.isFinite(pid)) {
      setItems([]);
      setItemId('');
      return;
    }
    let cancelled = false;
    listarPedidoItems(pid)
      .then((rows) => {
        if (!cancelled) {
          setItems(rows);
          setItemId('');
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pedidoId]);

  const elegirTipo = (t: TipoDevolucion) => {
    setTipo(t);
    setCausa(causasDe(t)[0]);
  };

  const pideArticulo = requiereArticulo(tipo, causa);

  const limpiar = () => {
    setMostrarFormulario(false);
    setPedidoId('');
    setItemId('');
    setTipo('cambio');
    setCausa('sellado_sin_abrir');
    setSellado(false);
    setMotivo('');
  };

  const enviar = async () => {
    const pid = parseInt(pedidoId, 10);
    if (!Number.isFinite(pid)) {
      void showAlert('Selecciona un pedido.');
      return;
    }
    const iid = itemId ? parseInt(itemId, 10) : NaN;
    if (pideArticulo && !Number.isFinite(iid)) {
      void showAlert('Selecciona el producto del pedido.');
      return;
    }
    if (causa === 'sellado_sin_abrir' && !sellado) {
      void showAlert('Confirma que el producto está sellado y sin abrir.');
      return;
    }
    setEnviando(true);
    try {
      // Sin estado ni monto: la solicitud queda pendiente y el salón calcula el monto.
      await crearDevolucion(
        {
          pedidoId: pid,
          ...(Number.isFinite(iid) ? { pedidoItemId: iid } : {}),
          tipo,
          causa,
          sellado: causa === 'sellado_sin_abrir' ? sellado : undefined,
          motivo: motivo.trim() || undefined,
        },
        { propios: true }
      );
      showToast('Solicitud registrada.', 'success');
      limpiar();
      await cargar();
    } catch (e) {
      // El backend explica por qué no aplica la política (plazo vencido, pedido sin pagar, etc.).
      void showAlert(e instanceof Error ? e.message : 'No se pudo crear la solicitud');
    } finally {
      setEnviando(false);
    }
  };

  const cancelar = async (d: DevolucionApi) => {
    const ok = await showConfirm(`¿Cancelar la solicitud #${d.id}?`, { confirmText: 'Cancelar solicitud', cancelText: 'Volver' });
    if (!ok) return;
    setCancelandoId(d.id);
    try {
      await cancelarDevolucion(d.id);
      showToast('Solicitud cancelada.', 'success');
      await cargar();
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'No se pudo cancelar la solicitud');
    } finally {
      setCancelandoId(null);
    }
  };

  return (
    <ModuleLayout>
      <div className="max-w-4xl mx-auto py-4">
        <div className="text-center mb-8">
          <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Devoluciones y cambios
          </h1>
          <p className="text-base md:text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
            Solicitudes registradas en el sistema según tus pedidos
          </p>
        </div>

        {error && (
          <Card className="mb-4 p-4" style={{ borderColor: 'var(--danger)' }}>
            <p className="mb-2" style={{ color: 'var(--danger-texto)' }}>{error}</p>
            {!hasValidToken() && (
              <Link href="/login" className="text-sm font-semibold underline" style={{ color: 'var(--menu-texto-principal)' }}>
                Iniciar sesión
              </Link>
            )}
          </Card>
        )}

        <Card className="mb-6 p-4" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Política
          </h3>
          <ul className="text-sm space-y-1" style={{ color: 'var(--encabezados-alterno)' }}>
            <li>• Cambio: producto sellado y sin abrir (o con defecto de fábrica), dentro de {DIAS_CAMBIO_PRODUCTO} días naturales tras recogerlo</li>
            <li>• Reembolso: solo por defecto de fábrica, error del salón o falta de existencias</li>
            <li>• El salón revisa cada solicitud y calcula el monto; puedes cancelarla mientras esté pendiente</li>
          </ul>
        </Card>

        {loading ? (
          <Card className="p-8 text-center">
            <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Mis solicitudes
              </h2>
              <Table headers={['ID', 'Pedido', 'Solicitud', 'Estado', 'Monto', 'Registro', '']}>
                {lista.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
                      No hay devoluciones registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  lista.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono">#{d.id}</TableCell>
                      <TableCell className="font-mono">#{d.pedidoId}</TableCell>
                      <TableCell className="max-w-xs">
                        <span className="block font-medium">
                          {d.tipo === 'reembolso' ? 'Reembolso' : d.tipo === 'cambio' ? 'Cambio' : 'Solicitud'}
                          {d.causa ? ` · ${etiquetaCausa(d.causa)}` : ''}
                        </span>
                        {detalleMotivoDevolucion(d) && (
                          <span className="block truncate text-sm" title={detalleMotivoDevolucion(d)} style={{ color: 'var(--encabezados-alterno)' }}>
                            {detalleMotivoDevolucion(d)}
                          </span>
                        )}
                        {d.notaResolucion && (
                          <span className="block text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                            Nota del salón: {d.notaResolucion}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={varianteEstado(d.estado)}>{etiquetaEstadoDevolucion(d.estado)}</Badge>
                      </TableCell>
                      <TableCell>{d.monto != null ? `$${d.monto.toLocaleString('es-MX')}` : '-'}</TableCell>
                      <TableCell className="text-sm">
                        {d.creadoEn ? new Date(d.creadoEn).toLocaleString('es-MX') : '-'}
                      </TableCell>
                      <TableCell>
                        {d.estado === 'pendiente' && (
                          <Button size="sm" variant="outline" onClick={() => void cancelar(d)} disabled={cancelandoId === d.id}>
                            {cancelandoId === d.id ? 'Cancelando…' : 'Cancelar'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </Table>
            </Card>

            {!mostrarFormulario ? (
              <Card>
                <div className="text-center">
                  <Button onClick={() => setMostrarFormulario(true)} disabled={!hasValidToken() || pedidos.length === 0}>
                    Nueva solicitud
                  </Button>
                  {hasValidToken() && pedidos.length === 0 && (
                    <p className="text-sm mt-4" style={{ color: 'var(--encabezados-alterno)' }}>
                      Necesitas un pedido entregado, o uno cancelado que ya hayas pagado.{' '}
                      <Link href="/cliente/tienda-online/mis-pedidos" className="underline font-medium">
                        Ver pedidos
                      </Link>
                    </p>
                  )}
                </div>
              </Card>
            ) : (
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Nueva solicitud
                </h2>
                <div className="space-y-4 max-w-lg">
                  <Select
                    label="Pedido"
                    value={pedidoId}
                    onChange={(e) => setPedidoId(e.target.value)}
                    options={[
                      { value: '', label: 'Selecciona…' },
                      ...pedidos.map((p) => ({
                        value: String(p.id),
                        label: `#${p.id} · ${etiquetaEstadoPedido(p.estado)}`,
                      })),
                    ]}
                    fullWidth
                  />
                  <Select
                    label="Tipo"
                    value={tipo}
                    onChange={(e) => elegirTipo(e.target.value as TipoDevolucion)}
                    options={[
                      { value: 'cambio', label: 'Cambio de producto' },
                      { value: 'reembolso', label: 'Reembolso' },
                    ]}
                    fullWidth
                  />
                  <Select
                    label="Causa"
                    value={causa}
                    onChange={(e) => setCausa(e.target.value as CausaDevolucion)}
                    options={causasDe(tipo).map((c) => ({ value: c, label: etiquetaCausa(c) }))}
                    fullWidth
                  />
                  <Select
                    label={pideArticulo ? 'Producto (línea del pedido)' : 'Producto (opcional)'}
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    disabled={!pedidoId}
                    options={[
                      { value: '', label: items.length ? 'Selecciona línea…' : 'Sin líneas o cargando…' },
                      ...items.map((it) => ({
                        value: String(it.id),
                        label: `${it.nombreProducto ?? 'Producto'} ×${it.cantidad}${it.tamanio ? ` (${it.tamanio})` : ''}`,
                      })),
                    ]}
                    fullWidth
                  />
                  {causa === 'sellado_sin_abrir' && (
                    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={sellado}
                        onChange={(e) => setSellado(e.target.checked)}
                        className="h-5 w-5 accent-[var(--botones-principales)]"
                      />
                      El producto está sellado y sin abrir
                    </label>
                  )}
                  <Textarea
                    label="Detalle (opcional)"
                    value={motivo}
                    maxLength={500}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={4}
                    fullWidth
                  />
                  <div className="flex gap-3">
                    <Button variant="outline" fullWidth onClick={limpiar} disabled={enviando}>
                      Cancelar
                    </Button>
                    <Button fullWidth onClick={() => void enviar()} disabled={enviando}>
                      {enviando ? 'Enviando…' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
