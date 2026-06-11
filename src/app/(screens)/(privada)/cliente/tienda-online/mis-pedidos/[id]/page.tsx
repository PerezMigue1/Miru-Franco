'use client';

import { useParams, useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Badge from '../../../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../../../components/ui/Table';
import {
  obtenerPedido,
  listarPedidoItems,
  listarEnviosPorPedido,
  listarPagosPorPedido,
  listarHistorialPedido,
  listarFacturasPorPedido,
  listarValoracionesPedido,
  listarDevolucionesPedido,
  etiquetaEstadoPedido,
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
          obtenerPedido(pedidoId),
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
    return (
      <ModuleLayout>
        <div className="w-full max-w-none py-12 text-center">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando pedido…</p>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !pedido) {
    return (
      <ModuleLayout>
        <div className="w-full max-w-none py-12">
          <Card className="p-8 text-center">
            <p className="mb-4" style={{ color: 'var(--danger)' }}>
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

  return (
    <ModuleLayout>
      <div className="w-full max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Button variant="outline" size="sm" className="mb-2" onClick={() => router.push('/cliente/tienda-online/mis-pedidos')}>
              ← Mis pedidos
            </Button>
            <h1 className="text-hero mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              Detalle del pedido
            </h1>
            <p className="font-mono text-lg mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
              #{pedido.id}
            </p>
            <Badge variant={varianteBadgeEstadoPedido(pedido.estado)} size="lg">
              {etiquetaEstadoPedido(pedido.estado)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card style={{ animation: 'fadeUp 450ms ease-out both' }}>
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
                    <TableCell>${producto.precioUnitario.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">${producto.subtotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </Table>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Subtotal:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>${pedido.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Envío:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>${pedido.costoEnvio.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                    Total:
                  </span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                    ${pedido.total.toLocaleString()} {pedido.moneda}
                  </span>
                </div>
              </div>
            </Card>

            <Card style={{ animation: 'fadeUp 450ms ease-out 80ms both' }}>
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Dirección de envío
              </h2>
              {pedido.direccionTextoCompleta ? (
                <p className="whitespace-pre-wrap" style={{ color: 'var(--menu-texto-principal)' }}>
                  {pedido.direccionTextoCompleta}
                </p>
              ) : (
                <p style={{ color: 'var(--encabezados-alterno)' }}>Sin dirección en texto</p>
              )}
            </Card>

            {envio && (
              <Card style={{ animation: 'fadeUp 450ms ease-out 160ms both' }}>
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
              <Card style={{ animation: 'fadeUp 450ms ease-out 240ms both' }}>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Historial de estados
                </h2>
                <ul className="space-y-2 text-sm">
                  {historial.map((h) => (
                    <li key={h.id} style={{ color: 'var(--encabezados-alterno)' }}>
                      <span className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                        {etiquetaEstadoPedido(h.estadoNuevo)}
                      </span>
                      {h.estadoAnterior && (
                        <span> ← {etiquetaEstadoPedido(h.estadoAnterior)}</span>
                      )}
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

            <Card style={{ animation: 'fadeUp 450ms ease-out 320ms both' }}>
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

            <Card style={{ animation: 'fadeUp 450ms ease-out 400ms both' }}>
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

            <Card style={{ animation: 'fadeUp 450ms ease-out 480ms both' }}>
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
                          (${d.monto.toLocaleString()})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div>
            <Card style={{ animation: 'fadeUp 450ms ease-out 80ms both' }}>
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
                  <p style={{ color: 'var(--menu-texto-principal)' }}>{pedido.metodoPago ?? '—'}</p>
                </div>
                {pagos.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Pagos
                    </p>
                    <ul className="text-sm space-y-1">
                      {pagos.map((pg) => (
                        <li key={pg.id} style={{ color: 'var(--menu-texto-principal)' }}>
                          {pg.metodo} — ${pg.monto.toLocaleString()} ({pg.estado})
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
