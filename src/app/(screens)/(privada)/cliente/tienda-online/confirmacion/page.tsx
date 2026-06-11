'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X } from 'lucide-react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import {
  obtenerPedido,
  listarPedidoItems,
  listarPagosPorPedido,
  etiquetaEstadoPedido,
  varianteBadgeEstadoPedido,
  etiquetaEstadoPago,
  varianteBadgeEstadoPago,
} from '../../../../../services/ecommerce';
import type { PedidoApi, PedidoItemApi, PagoApi } from '../../../../../services/ecommerce';
import { hasValidToken } from '../../../../../utils/security';

function formatFechaPedido(iso?: string): { fecha: string; hora: string } {
  if (!iso?.trim()) {
    const d = new Date();
    return {
      fecha: d.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      hora: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { fecha: iso, hora: '' };
  }
  return {
    fecha: d.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    hora: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  };
}

function ConfirmacionCompraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawId = searchParams.get('pedidoId');
  const pedidoId = rawId ? parseInt(rawId, 10) : NaN;
  const pagoTarjetaHint = searchParams.get('pago') === 'tarjeta';

  const [pedido, setPedido] = useState<PedidoApi | null>(null);
  const [items, setItems] = useState<PedidoItemApi[]>([]);
  const [pagos, setPagos] = useState<PagoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasValidToken()) {
      setLoading(false);
      setError('Inicia sesión para ver la confirmación de tu pedido.');
      return;
    }
    if (!Number.isFinite(pedidoId) || pedidoId < 1) {
      setLoading(false);
      setError(null);
      setPedido(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [p, lineas, pays] = await Promise.all([
          obtenerPedido(pedidoId),
          listarPedidoItems(pedidoId),
          listarPagosPorPedido(pedidoId),
        ]);
        if (cancelled) return;
        setPedido(p);
        setItems(lineas);
        setPagos(pays);
        if (!p) setError('No encontramos ese pedido o no tenés permiso para verlo.');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al cargar el pedido');
          setPedido(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pedidoId]);

  if (!Number.isFinite(pedidoId) || pedidoId < 1) {
    return (
      <ModuleLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <h1 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              Sin número de pedido
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
              Abrí esta página desde el checkout al finalizar la compra, o revisá tus pedidos en la cuenta.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push('/cliente/tienda-online/mis-pedidos')}>
                Mis pedidos
              </Button>
              <Button variant="outline" onClick={() => router.push('/cliente/tienda-online')}>
                Tienda
              </Button>
            </div>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  if (loading) {
    return (
      <ModuleLayout>
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando confirmación…</p>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !pedido) {
    return (
      <ModuleLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <p className="mb-4" style={{ color: 'var(--danger)' }}>
              {error ?? 'No se pudo mostrar el pedido'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push('/cliente/tienda-online/mis-pedidos')}>
                Mis pedidos
              </Button>
              <Button variant="outline" onClick={() => router.push('/login')}>
                Iniciar sesión
              </Button>
            </div>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  const { fecha, hora } = formatFechaPedido(pedido.creadoEn);
  const estadoPedido = pedido.estado;
  const esCancelado = estadoPedido === 'cancelado';
  const ultimoPago = pagos.length ? pagos[pagos.length - 1] : null;

  return (
    <ModuleLayout>
      <div className="max-w-3xl mx-auto">
        <Card className="text-center" style={{ animation: 'fadeUp 400ms ease-out both' }}>
          <div className="mb-6">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: esCancelado ? 'var(--danger)' : 'var(--success)' }}
            >
              {esCancelado
                ? <X size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />
                : <Check size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />
              }
            </div>
            <h1 className="text-hero mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              {esCancelado ? 'Pedido cancelado' : '¡Gracias por tu compra!'}
            </h1>
            <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
              {esCancelado
                ? 'Este pedido figura como cancelado en el sistema.'
                : 'Tu pedido quedó registrado. Los importes y líneas abajo son los que devolvió el servidor.'}
            </p>
            {pagoTarjetaHint && !esCancelado && (
              <p className="text-sm mt-3" style={{ color: 'var(--encabezados-alterno)' }}>
                Elegiste pago con tarjeta: el registro en base de datos queda en estado pendiente hasta que exista
                cobro real con pasarela (cuando esté integrada).
              </p>
            )}
          </div>

          <div className="rounded-xl p-6 mb-6 text-left" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                  Pedido
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                  #{pedido.id}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                  Estado del pedido
                </span>
                <Badge variant={varianteBadgeEstadoPedido(estadoPedido)} size="lg">
                  {etiquetaEstadoPedido(estadoPedido)}
                </Badge>
              </div>
              {ultimoPago && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                    Último registro de pago
                  </span>
                  <Badge variant={varianteBadgeEstadoPago(ultimoPago.estado)} size="lg">
                    {etiquetaEstadoPago(ultimoPago.estado)}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                  Fecha
                </span>
                <span style={{ color: 'var(--menu-texto-principal)' }}>{fecha}</span>
              </div>
              {hora ? (
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                    Hora
                  </span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>{hora}</span>
                </div>
              ) : null}

              {items.length > 0 && (
                <div className="pt-4 border-t" style={{ borderColor: 'var(--tarjetas-paneles)' }}>
                  <p className="font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                    Productos
                  </p>
                  <div className="space-y-2">
                    {items.map((linea) => {
                      const nombre =
                        [linea.nombreProducto, linea.tamanio].filter(Boolean).join(' · ') || 'Producto';
                      return (
                        <div key={linea.id} className="flex justify-between gap-4 text-sm">
                          <span style={{ color: 'var(--encabezados-alterno)' }}>
                            {linea.cantidad}× {nombre}
                          </span>
                          <span className="shrink-0" style={{ color: 'var(--menu-texto-principal)' }}>
                            ${linea.subtotal.toLocaleString('es-MX')} {pedido.moneda}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t" style={{ borderColor: 'var(--tarjetas-paneles)' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Subtotal</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>
                    ${pedido.subtotal.toLocaleString('es-MX')} {pedido.moneda}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Envío</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>
                    ${pedido.costoEnvio.toLocaleString('es-MX')} {pedido.moneda}
                  </span>
                </div>
                {pedido.impuestos > 0 && (
                  <div className="flex justify-between mb-1">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Impuestos</span>
                    <span style={{ color: 'var(--menu-texto-principal)' }}>
                      ${pedido.impuestos.toLocaleString('es-MX')} {pedido.moneda}
                    </span>
                  </div>
                )}
                {pedido.descuento > 0 && (
                  <div className="flex justify-between mb-1">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Descuento</span>
                    <span style={{ color: 'var(--menu-texto-principal)' }}>
                      −${pedido.descuento.toLocaleString('es-MX')} {pedido.moneda}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                    Total
                  </span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                    ${pedido.total.toLocaleString('es-MX')} {pedido.moneda}
                  </span>
                </div>
              </div>

              {(pedido.direccionTextoCompleta || pedido.notasCliente) && (
                <div className="pt-4 border-t text-left" style={{ borderColor: 'var(--tarjetas-paneles)' }}>
                  {pedido.direccionTextoCompleta ? (
                    <>
                      <p className="font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                        Dirección / entrega
                      </p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--encabezados-alterno)' }}>
                        {pedido.direccionTextoCompleta}
                      </p>
                    </>
                  ) : null}
                  {pedido.notasCliente ? (
                    <div className={pedido.direccionTextoCompleta ? 'mt-3' : ''}>
                      <p className="font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                        Notas del pedido
                      </p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--encabezados-alterno)' }}>
                        {pedido.notasCliente}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {pedido.metodoPago ? (
                <div className="pt-4 border-t" style={{ borderColor: 'var(--tarjetas-paneles)' }}>
                  <p className="font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                    Método de pago (registrado)
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {pedido.metodoPago}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl text-left" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Podés ver el detalle completo, envíos e historial en &quot;Mis pedidos&quot;. Si el backend envía
                correos de confirmación, los recibirás según la configuración del servidor.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button fullWidth onClick={() => router.push(`/cliente/tienda-online/mis-pedidos/${pedido.id}`)}>
                Ver detalle del pedido
              </Button>
              <Button variant="outline" fullWidth onClick={() => router.push('/cliente/tienda-online/mis-pedidos')}>
                Todos mis pedidos
              </Button>
              <Button variant="outline" fullWidth onClick={() => router.push('/cliente/tienda-online')}>
                Seguir comprando
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </ModuleLayout>
  );
}

export default function ConfirmacionCompraPage() {
  return (
    <Suspense
      fallback={
        <ModuleLayout>
          <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[200px]">
            <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          </div>
        </ModuleLayout>
      }
    >
      <ConfirmacionCompraContent />
    </Suspense>
  );
}
