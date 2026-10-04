'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Star, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Badge from '../../../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../../../components/ui/Table';
import DatosRecogerEnSalon from '../../../../../../components/tienda/DatosRecogerEnSalon';
import { showConfirm, showToast } from '../../../../../../utils/toast';
import { mensajeUsuarioDesdeErrorApi } from '../../../../../../utils/apiErrorMessage';
import { formatearPrecioMXN } from '../../../../../../utils/formatoPrecio';
import {
  obtenerPedido,
  listarPedidoItems,
  listarEnviosPorPedido,
  listarPagosPorPedido,
  listarHistorialPedido,
  listarFacturasPorPedido,
  listarValoracionesPedido,
  listarDevolucionesPedido,
  actualizarPedido,
  esPagoEnSalon,
  METODO_PAGO_MERCADOPAGO,
  etiquetaEstadoPedido,
  etiquetaMetodoPagoPedido,
  varianteBadgeEstadoPedido,
} from '../../../../../../services/ecommerce';
import type {
  PedidoApi,
  PedidoItemApi,
  EnvioApi,
  PagoApi,
  HistorialEstadoPedidoApi,
  FacturaApi,
  ValoracionApi,
  DevolucionApi,
} from '../../../../../../services/ecommerce';

/** Qué sigue para la clienta según el estado del pedido (todo se recoge en el salón). */
function textoRecoger(pedido: PedidoApi): string | null {
  const enSalon = esPagoEnSalon(pedido.metodoPago);
  switch (pedido.estado) {
    case 'pendiente_pago':
      return enSalon
        ? 'Tu pedido está apartado. Lo preparamos y te avisamos cuando puedas pasar a pagarlo y recogerlo.'
        : pedido.metodoPago === METODO_PAGO_MERCADOPAGO
          ? 'Falta completar tu pago en Mercado Pago. Tienes 24 horas desde que hiciste el pedido.'
          : 'Estamos confirmando tu pago. Después lo preparamos y te avisamos.';
    case 'pagado':
      return 'Pago recibido. Lo preparamos y te avisamos cuando esté listo para recoger.';
    case 'preparando':
      return 'Estamos preparando tu pedido. Te avisamos en la app y por correo cuando esté listo.';
    case 'listo_recoger':
      return enSalon
        ? 'Tu pedido está listo. Pasa por él al salón y págalo en el mostrador.'
        : 'Tu pedido está listo. Pasa por él al salón.';
    case 'entregado':
      return 'Recogiste tu pedido en el salón.';
    default:
      return null;
  }
}

/** La clienta puede cancelar mientras el salón no empezó a preparar su pedido. */
const ESTADOS_CANCELABLES = new Set(['pendiente_pago', 'pagado']);

export default function DetallePedidoPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const pedidoId = parseInt(rawId, 10);

  const [pedido, setPedido] = useState<PedidoApi | null>(null);
  const [items, setItems] = useState<PedidoItemApi[]>([]);
  const [envios, setEnvios] = useState<EnvioApi[]>([]);
  const [pagos, setPagos] = useState<PagoApi[]>([]);
  const [historial, setHistorial] = useState<HistorialEstadoPedidoApi[]>([]);
  const [facturas, setFacturas] = useState<FacturaApi[]>([]);
  const [valoraciones, setValoraciones] = useState<ValoracionApi[]>([]);
  const [devoluciones, setDevoluciones] = useState<DevolucionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(pedidoId)) {
      setLoading(false);
      setError('ID de pedido no válido');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [p, lineas, env, pays, hist, fac, val, dev] = await Promise.all([
          obtenerPedido(pedidoId, { propios: true }),
          listarPedidoItems(pedidoId),
          listarEnviosPorPedido(pedidoId),
          listarPagosPorPedido(pedidoId),
          listarHistorialPedido(pedidoId),
          listarFacturasPorPedido(pedidoId),
          listarValoracionesPedido(pedidoId),
          listarDevolucionesPedido(pedidoId),
        ]);
        if (cancelled) return;
        setPedido(p);
        setItems(lineas);
        setEnvios(env);
        setPagos(pays);
        setHistorial(hist);
        setFacturas(fac);
        setValoraciones(val);
        setDevoluciones(dev);
        if (!p) setError('Pedido no encontrado');
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pedidoId]);

  if (loading) {
    // Skeleton con la forma del detalle (encabezado + productos | envío), como los demás detalles
    return (
      <ModuleLayout>
        <div className="w-full max-w-none" aria-busy="true" aria-label="Cargando pedido">
          <div className="mb-6 space-y-3">
            <div className="mf-skeleton h-8 w-32" />
            <div className="mf-skeleton h-9 w-2/5" />
            <div className="mf-skeleton h-5 w-24" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="mf-skeleton h-72 lg:col-span-2" style={{ borderRadius: 'var(--mf-radio)' }} />
            <div className="mf-skeleton h-48" style={{ borderRadius: 'var(--mf-radio)' }} />
          </div>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !pedido) {
    return (
      <ModuleLayout>
        <div className="w-full max-w-none py-12">
          <Card className="p-8 text-center">
            <p className="mb-4" style={{ color: 'var(--danger-texto)' }}>
              {error ?? 'Pedido no encontrado'}
            </p>
            <Button onClick={() => router.push('/cliente/tienda-online/mis-pedidos')}>
              Volver a mis pedidos
            </Button>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  const envio = envios[0];
  const textoSiguiente = textoRecoger(pedido);

  const cancelarPedido = async () => {
    const ok = await showConfirm(
      'Se cancela tu pedido y los productos vuelven a la tienda. Esta acción no se puede deshacer.',
      { title: `¿Cancelar el pedido #${pedido.id}?`, confirmText: 'Sí, cancelar pedido', cancelText: 'No, conservarlo' }
    );
    if (!ok) return;
    setCancelando(true);
    try {
      setPedido(await actualizarPedido(pedido.id, { estado: 'cancelado' }, { propios: true }));
      showToast('Tu pedido quedó cancelado.', 'success');
    } catch (e) {
      showToast(mensajeUsuarioDesdeErrorApi(e), 'error');
    } finally {
      setCancelando(false);
    }
  };

  return (
    <ModuleLayout>
      <div className="w-full max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Button variant="outline" size="sm" className="mb-2" onClick={() => router.push('/cliente/tienda-online/mis-pedidos')}>
              <ArrowLeft size={16} aria-hidden className="mr-1.5" />
              Mis pedidos
            </Button>
            <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              Detalle del pedido
            </h1>
            <p className="font-mono text-lg mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
              #{pedido.id}
            </p>
            <Badge variant={varianteBadgeEstadoPedido(pedido.estado)} size="lg">
              {etiquetaEstadoPedido(pedido.estado, pedido.metodoPago)}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            {pedido.estado === 'pendiente_pago' && pedido.metodoPago === METODO_PAGO_MERCADOPAGO && (
              <Button onClick={() => router.push(`/cliente/tienda-online/confirmacion?pedidoId=${pedido.id}`)}>
                Completar el pago
              </Button>
            )}
            {ESTADOS_CANCELABLES.has(pedido.estado) && (
              <Button variant="outline" onClick={() => void cancelarPedido()} disabled={cancelando}>
                {cancelando ? 'Cancelando…' : 'Cancelar pedido'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) both' }}>
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Productos
              </h2>
              <Table headers={['Producto', 'Cantidad', 'Precio unitario', 'Subtotal']}>
                {items.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell className="font-semibold">
                      {producto.nombreProducto ?? 'Producto'}
                      {producto.tamanio ? ` — ${producto.tamanio}` : ''}
                    </TableCell>
                    <TableCell>{producto.cantidad}</TableCell>
                    <TableCell>{formatearPrecioMXN(producto.precioUnitario)}</TableCell>
                    <TableCell className="font-semibold">{formatearPrecioMXN(producto.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </Table>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Subtotal:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>{formatearPrecioMXN(pedido.subtotal)}</span>
                </div>
                {/* Solo pedidos anteriores: hoy todo se recoge en el salón, sin costo de envío. */}
                {pedido.costoEnvio > 0 && (
                  <div className="flex justify-between mb-2">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Envío:</span>
                    <span style={{ color: 'var(--menu-texto-principal)' }}>{formatearPrecioMXN(pedido.costoEnvio)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                    Total:
                  </span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {formatearPrecioMXN(pedido.total)} {pedido.moneda}
                  </span>
                </div>
              </div>
            </Card>

            {pedido.estado !== 'cancelado' && pedido.estado !== 'enviado' && (
              <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) 80ms both' }}>
                <h2 className="text-page-title mb-2 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  <Store className="w-5 h-5 shrink-0" style={{ color: 'var(--logo-branding)' }} aria-hidden />
                  Recoger en el salón
                </h2>
                {textoSiguiente && (
                  <p className="text-sm mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                    {textoSiguiente}
                  </p>
                )}
                {pedido.estado !== 'entregado' && (
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <DatosRecogerEnSalon conAviso={false} />
                  </div>
                )}
              </Card>
            )}

            {/* Pedidos anteriores que guardaron una dirección: se muestra como historial. */}
            {pedido.direccionTextoCompleta && (
              <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) 120ms both' }}>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Entrega registrada
                </h2>
                <p className="whitespace-pre-wrap" style={{ color: 'var(--menu-texto-principal)' }}>
                  {pedido.direccionTextoCompleta}
                </p>
              </Card>
            )}

            {envio && (
              <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) 160ms both' }}>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Envío
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Empresa
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{envio.empresaEnvio ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Guía
                    </p>
                    <p className="font-mono font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {envio.numeroGuia ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Estado del envío
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{envio.estadoEnvio}</p>
                  </div>
                </div>
              </Card>
            )}

            {historial.length > 0 && (
              <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) 240ms both' }}>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Historial de estados
                </h2>
                <ul className="space-y-2 text-sm">
                  {historial.map((h) => (
                    <li key={h.id} style={{ color: 'var(--encabezados-alterno)' }}>
                      {h.estadoAnterior && (
                        <span className="inline-flex items-center gap-1">
                          {etiquetaEstadoPedido(h.estadoAnterior, pedido.metodoPago)}
                          <ArrowRight size={14} aria-label="cambió a" className="mx-1" />
                        </span>
                      )}
                      <span className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                        {etiquetaEstadoPedido(h.estadoNuevo, pedido.metodoPago)}
                      </span>
                      {h.creadoEn && (
                        <span className="block text-xs mt-0.5">
                          {new Date(h.creadoEn).toLocaleString('es-MX')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) 320ms both' }}>
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Facturas
              </h2>
              {facturas.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  Sin facturas para este pedido. Puedes solicitar una en{' '}
                  <Button size="sm" variant="outline" className="ml-1" onClick={() => router.push('/cliente/facturas')}>
                    Mis facturas
                  </Button>
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {facturas.map((f) => (
                    <li key={f.id} className="flex flex-wrap gap-2 items-center" style={{ color: 'var(--menu-texto-principal)' }}>
                      <span className="font-mono">#{f.id}</span>
                      <span>{[f.serie, f.folio].filter(Boolean).join(' ') || '—'}</span>
                      <Badge variant="info" size="sm">{f.estado ?? '—'}</Badge>
                      {f.pdfUrl && (
                        <a href={f.pdfUrl} target="_blank" rel="noreferrer" className="underline text-xs">
                          PDF
                        </a>
                      )}
                      {f.xmlUrl && (
                        <a href={f.xmlUrl} target="_blank" rel="noreferrer" className="underline text-xs">
                          XML
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) 400ms both' }}>
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Valoraciones de este pedido
              </h2>
              {valoraciones.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  Aún no hay reseñas registradas para productos de este pedido.
                </p>
              ) : (
                <ul className="space-y-3">
                  {valoraciones.map((v) => (
                    <li key={v.id} className="text-sm border-b pb-3 last:border-0" style={{ borderColor: 'var(--fondos-suaves)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: Math.min(5, Math.max(0, v.puntuacion)) }, (_, i) => (
                            <Star key={i} size={13} fill="currentColor" aria-hidden style={{ color: 'var(--botones-principales)' }} />
                          ))}
                        </span>
                        <span style={{ color: 'var(--encabezados-alterno)' }}>
                          Producto #{v.productoId}
                        </span>
                      </div>
                      {v.comentario && (
                        <p style={{ color: 'var(--menu-texto-principal)' }}>{v.comentario}</p>
                      )}
                      <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        {v.creadoEn ? new Date(v.creadoEn).toLocaleString('es-MX') : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) 480ms both' }}>
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Devoluciones / cambios
              </h2>
              {devoluciones.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  No hay solicitudes para este pedido.{' '}
                  <Button size="sm" variant="outline" onClick={() => router.push('/cliente/devoluciones')}>
                    Ir a devoluciones
                  </Button>
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {devoluciones.map((d) => (
                    <li key={d.id} style={{ color: 'var(--menu-texto-principal)' }}>
                      <Badge variant="warning" size="sm" className="mr-2">{d.estado}</Badge>
                      {d.motivo ?? '—'}
                      {d.monto != null && (
                        <span className="ml-2" style={{ color: 'var(--encabezados-alterno)' }}>
                          ({formatearPrecioMXN(d.monto)})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div>
            <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) 80ms both' }}>
              <h3 className="text-subtitle mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Información del pedido
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Creado
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>
                    {pedido.creadoEn
                      ? new Date(pedido.creadoEn).toLocaleString('es-MX')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Método de pago
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>{etiquetaMetodoPagoPedido(pedido.metodoPago)}</p>
                </div>
                {pagos.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Pagos
                    </p>
                    <ul className="text-sm space-y-1">
                      {pagos.map((pg) => (
                        <li key={pg.id} style={{ color: 'var(--menu-texto-principal)' }}>
                          {pg.metodo} — {formatearPrecioMXN(pg.monto)} ({pg.estado})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
