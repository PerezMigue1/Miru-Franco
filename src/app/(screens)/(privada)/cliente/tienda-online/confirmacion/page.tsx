'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Clock, X } from 'lucide-react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import {
  obtenerPedido,
  listarPedidoItems,
  listarPagosPorPedido,
  etiquetaEstadoPedido,
  etiquetaMetodoPagoPedido,
  esPagoEnSalon,
  varianteBadgeEstadoPedido,
  etiquetaEstadoPago,
  varianteBadgeEstadoPago,
  consultarEstadoPagoEnLinea,
  crearPreferenciaMercadoPago,
  METODO_PAGO_MERCADOPAGO,
} from '../../../../../services/ecommerce';
import type { EstadoPagoEnLinea, PedidoApi, PedidoItemApi, PagoApi } from '../../../../../services/ecommerce';
import { mensajeUsuarioDesdeErrorApi } from '../../../../../utils/apiErrorMessage';

/** Mientras Mercado Pago confirma, la página consulta cada 3 s hasta 45 s; luego se queda con lo último. */
const INTERVALO_ESTADO_MS = 3000;
const ESPERA_MAXIMA_ESTADO_MS = 45_000;
const VIGENCIA_PAGO_EN_LINEA_MS = 24 * 60 * 60 * 1000;

/** Encabezado del pedido pagado en línea según el estado real que confirma el servidor. */
function EncabezadoPagoEnLinea({
  estado,
  esperando,
  venceEn,
  reintentando,
  onReintentar,
}: {
  estado: EstadoPagoEnLinea | null;
  esperando: boolean;
  venceEn: Date | null;
  reintentando: boolean;
  onReintentar: () => void;
}) {
  const circulo = (icono: React.ReactNode, fondo: string) => (
    <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: fondo }}>
      {icono}
    </div>
  );
  const venceTexto = venceEn
    ? venceEn.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

  if (estado === 'aprobado') {
    return (
      <>
        <div className="mb-5 flex justify-center">
          <SelloConfirmacion />
        </div>
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          ¡Pago recibido!
        </h1>
        <p className="text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
          Tu pedido quedó pagado. Te avisamos en la app y por correo cuando esté listo para recoger en el salón.
        </p>
      </>
    );
  }
  if (estado === 'revision') {
    return (
      <>
        {circulo(<AlertCircle size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />, 'var(--warning)')}
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Recibimos tu pago
        </h1>
        <p className="text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
          Necesitamos revisarlo antes de preparar tu pedido. El salón te contactará; no tienes que pagar otra vez.
        </p>
      </>
    );
  }
  const noSeCompleto = estado === 'rechazado' || (estado === 'sin_pago' && !esperando);
  if (noSeCompleto) {
    return (
      <>
        {circulo(<AlertCircle size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />, 'var(--danger)')}
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Tu pago no se completó
        </h1>
        <p className="text-lg mb-5" style={{ color: 'var(--encabezados-alterno)' }}>
          {estado === 'rechazado' ? 'Mercado Pago no aprobó el pago y no se hizo ningún cargo.' : 'Todavía no recibimos tu pago.'}{' '}
          Tu pedido sigue apartado{venceTexto ? <> hasta el <span className="mf-cifras">{venceTexto}</span></> : null}.
        </p>
        <Button onClick={onReintentar} disabled={reintentando}>
          {reintentando ? 'Abriendo Mercado Pago…' : 'Reintentar pago'}
        </Button>
      </>
    );
  }
  if (estado === null) {
    return (
      <>
        {circulo(<Clock size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />, 'var(--botones-principales)')}
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Consultando el estado de tu pago…
        </h1>
      </>
    );
  }
  return (
    <>
      {circulo(<Clock size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />, 'var(--botones-principales)')}
      <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
        Tu pago se está procesando
      </h1>
      <p className="text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
        {esperando
          ? 'Mercado Pago aún no lo confirma. Esta página se actualiza sola.'
          : 'Mercado Pago aún no lo confirma. Te avisamos en la app y por correo en cuanto se acredite.'}
      </p>
    </>
  );
}
import { hasValidToken } from '../../../../../utils/security';
import { formatearPrecioMXN } from '../../../../../utils/formatoPrecio';
import SelloConfirmacion from '../../../../../components/cliente/SelloConfirmacion';

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

  const [pedido, setPedido] = useState<PedidoApi | null>(null);
  const [items, setItems] = useState<PedidoItemApi[]>([]);
  const [pagos, setPagos] = useState<PagoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Pago en línea: estado real consultado al servidor (nunca a los parámetros que pone Mercado Pago en la URL). */
  const [estadoPago, setEstadoPago] = useState<EstadoPagoEnLinea | null>(null);
  const [esperandoPago, setEsperandoPago] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const [errorReintento, setErrorReintento] = useState<string | null>(null);
  const esPagoEnLinea = pedido?.metodoPago === METODO_PAGO_MERCADOPAGO;
  /**
   * Mercado Pago agrega estos parámetros al regresar: solo indican si vale la pena esperar a que confirme
   * (el estado siempre se le pregunta al servidor). Quien llega desde "Completar el pago" no espera.
   */
  const volvioDeMercadoPago = ['payment_id', 'collection_id', 'collection_status', 'status', 'preference_id'].some((k) => searchParams.has(k));

  useEffect(() => {
    if (!esPagoEnLinea || !Number.isFinite(pedidoId)) return;
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();
    const consultar = async () => {
      try {
        const r = await consultarEstadoPagoEnLinea(pedidoId);
        if (cancelado) return;
        setEstadoPago(r.estado);
        setPedido((p) => (p ? { ...p, estado: r.pedidoEstado } : p));
        const sigueEsperando =
          (r.estado === 'pendiente' || (r.estado === 'sin_pago' && volvioDeMercadoPago)) &&
          Date.now() - inicio < ESPERA_MAXIMA_ESTADO_MS;
        setEsperandoPago(sigueEsperando);
        if (sigueEsperando) temporizador = setTimeout(() => void consultar(), INTERVALO_ESTADO_MS);
      } catch {
        if (!cancelado) setEsperandoPago(false);
      }
    };
    setEsperandoPago(true);
    void consultar();
    return () => {
      cancelado = true;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [esPagoEnLinea, pedidoId, volvioDeMercadoPago]);

  const reintentarPago = async () => {
    setReintentando(true);
    setErrorReintento(null);
    try {
      const { initPoint } = await crearPreferenciaMercadoPago(pedidoId);
      window.location.assign(initPoint);
    } catch (e) {
      setErrorReintento(mensajeUsuarioDesdeErrorApi(e));
      setReintentando(false);
    }
  };

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
        if (!p) setError('No encontramos ese pedido o no tienes permiso para verlo.');
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
              Esta página se abre al finalizar una compra. Puedes consultar tus compras en Mis pedidos.
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
        <div className="max-w-3xl mx-auto space-y-4 py-8" aria-busy="true" aria-label="Cargando confirmación">
          <div className="mf-skeleton h-20 w-20 mx-auto" style={{ borderRadius: 999 }} />
          <div className="mf-skeleton h-8 w-1/2 mx-auto" />
          <div className="mf-skeleton h-64 w-full" style={{ borderRadius: 'var(--mf-radio)' }} />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !pedido) {
    return (
      <ModuleLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <p className="mb-4" style={{ color: 'var(--danger-texto)' }}>
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
        <Card className="text-center mf-entrada" padding="lg">
          {esPagoEnLinea && !esCancelado ? (
            <div className="mb-8" role="status" aria-live="polite">
              <EncabezadoPagoEnLinea
                estado={estadoPago}
                esperando={esperandoPago}
                venceEn={pedido.creadoEn ? new Date(new Date(pedido.creadoEn).getTime() + VIGENCIA_PAGO_EN_LINEA_MS) : null}
                reintentando={reintentando}
                onReintentar={() => void reintentarPago()}
              />
              {errorReintento && (
                <p className="text-sm mt-3" role="alert" style={{ color: 'var(--danger-texto)' }}>
                  {errorReintento}
                </p>
              )}
            </div>
          ) : (
          <div className="mb-8">
            {esCancelado ? (
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5"
                style={{ backgroundColor: 'var(--danger)' }}
              >
                <X size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />
              </div>
            ) : (
              <div className="mb-5 flex justify-center">
                <SelloConfirmacion />
              </div>
            )}
            <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              {esCancelado ? 'Pedido cancelado' : '¡Gracias por tu compra!'}
            </h1>
            <p className="text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
              {esCancelado
                ? 'Este pedido está cancelado.'
                : esPagoEnSalon(pedido.metodoPago)
                  ? 'Te apartamos tu pedido. Te avisamos en la app y por correo cuando esté listo para recogerlo y pagarlo en el salón.'
                  : 'Tu pedido quedó registrado. Te avisamos en la app y por correo cuando esté listo para recoger en el salón.'}
            </p>
          </div>
          )}

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
                  {etiquetaEstadoPedido(estadoPedido, pedido.metodoPago)}
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
                            {formatearPrecioMXN(linea.subtotal)} {pedido.moneda}
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
                    {formatearPrecioMXN(pedido.subtotal)} {pedido.moneda}
                  </span>
                </div>
                {/* Solo pedidos anteriores: hoy todo se recoge en el salón, sin costo de envío. */}
                {pedido.costoEnvio > 0 && (
                  <div className="flex justify-between mb-1">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Envío</span>
                    <span style={{ color: 'var(--menu-texto-principal)' }}>
                      {formatearPrecioMXN(pedido.costoEnvio)} {pedido.moneda}
                    </span>
                  </div>
                )}
                {pedido.impuestos > 0 && (
                  <div className="flex justify-between mb-1">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Impuestos</span>
                    <span style={{ color: 'var(--menu-texto-principal)' }}>
                      {formatearPrecioMXN(pedido.impuestos)} {pedido.moneda}
                    </span>
                  </div>
                )}
                {pedido.descuento > 0 && (
                  <div className="flex justify-between mb-1">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Descuento</span>
                    <span style={{ color: 'var(--menu-texto-principal)' }}>
                      −{formatearPrecioMXN(pedido.descuento)} {pedido.moneda}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                    Total
                  </span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {formatearPrecioMXN(pedido.total)} {pedido.moneda}
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
                    {etiquetaMetodoPagoPedido(pedido.metodoPago)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl text-left" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Puedes ver el detalle completo y el historial de tu compra en &quot;Mis pedidos&quot;.
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
