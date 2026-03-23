'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import Select from '../../../../../components/ui/Select';
import { useCart } from '../../../../../context/CartContext';
import {
  crearPedido,
  crearPedidoItem,
  crearPago,
  type EstadoPedidoUi,
} from '../../../../../services/ecommerce';
import {
  getMiPerfil,
  listarDireccionesUsuario,
  type DireccionUsuarioDTO,
} from '../../../../../services/perfil';
import { hasValidToken } from '../../../../../utils/security';
import { showAlert } from '../../../../../utils/toast';
import { readCheckoutDireccionId, clearCheckoutDireccionId } from '../../../../../utils/checkoutDeliveryStorage';
import {
  lineaResumenEnvio,
  etiquetaTipoDomicilio,
} from '../../../../../utils/formatDireccionUsuario';

/** Dirección del local para retiro en tienda (configurable por entorno). */
const DIRECCION_RETIRO_LOCAL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SALON_DIRECCION
    ? process.env.NEXT_PUBLIC_SALON_DIRECCION
    : 'Mirú Franco Estética — Av. Ejemplo 123, Col. Centro, Ciudad de México, CDMX CP 01000 (configura NEXT_PUBLIC_SALON_DIRECCION en .env)';

function textoDesdeDireccion(d: DireccionUsuarioDTO): string {
  const line1 = [d.calle, d.numeroInterior].filter(Boolean).join(' ');
  return [
    line1,
    d.coloniaBarrio,
    d.localidad,
    `${d.municipioAlcaldia}, ${d.estado} CP ${d.codigoPostal}`,
    d.indicaciones,
  ]
    .filter(Boolean)
    .join(', ');
}

function mapMetodoCheckout(tipo: string): string {
  if (tipo === 'tarjeta') return 'tarjeta';
  if (tipo === 'paypal') return 'paypal';
  if (tipo === 'transferencia') return 'transferencia';
  if (tipo === 'efectivo') return 'efectivo';
  return tipo || 'otro';
}

function splitNombreCompleto(full: string): { nombre: string; apellidos: string } {
  const t = full.trim();
  if (!t) return { nombre: '', apellidos: '' };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0], apellidos: '' };
  return { nombre: parts[0] ?? '', apellidos: parts.slice(1).join(' ') };
}

const OPCIONES_MSI = [
  { value: '1', label: 'Un solo pago (sin meses sin intereses)' },
  { value: '3', label: '3 meses sin intereses' },
  { value: '6', label: '6 meses sin intereses' },
  { value: '12', label: '12 meses sin intereses' },
];

const RUTA_ELEGIR_DOMICILIO = '/cliente/tienda-online/checkout/elegir-domicilio';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, loading: cartLoading } = useCart();
  /** 1 entrega | 2 cuándo llegará | 3 método pago | 4 MSI (solo tarjeta) | 5 revisar */
  const [paso, setPaso] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [tipoEntrega, setTipoEntrega] = useState<'domicilio' | 'retiro'>('domicilio');

  const [datosPersonales, setDatosPersonales] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
  });

  const [direcciones, setDirecciones] = useState<DireccionUsuarioDTO[]>([]);
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState('');

  const [metodoPago, setMetodoPago] = useState({
    tipo: '',
    numeroTarjeta: '',
    nombreTitular: '',
    fechaVencimiento: '',
    cvv: '',
  });

  const [mesesMSI, setMesesMSI] = useState('1');
  const [solicitaFactura, setSolicitaFactura] = useState(false);
  const [rfcFactura, setRfcFactura] = useState('');

  const [cargandoPerfilCheckout, setCargandoPerfilCheckout] = useState(true);

  const esTarjeta = metodoPago.tipo === 'tarjeta';
  const totalPasosBarra = esTarjeta ? 5 : 4;
  const pasoEnBarra =
    !esTarjeta && paso === 5 ? 4 : paso === 4 && !esTarjeta ? 3 : paso > 4 ? paso : paso;

  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const envio = tipoEntrega === 'retiro' ? 0 : items.length > 0 ? 50 : 0;
  const total = subtotal + envio;

  useEffect(() => {
    if (cartLoading) return;
    if (items.length === 0) {
      router.replace('/cliente/tienda-online/carrito');
      return;
    }
    if (!hasValidToken()) {
      router.replace(
        `/login?returnUrl=${encodeURIComponent('/cliente/tienda-online/checkout')}`
      );
    }
  }, [items.length, cartLoading, router]);

  useEffect(() => {
    if (!hasValidToken()) {
      setCargandoPerfilCheckout(false);
      return;
    }
    let cancelled = false;
    setCargandoPerfilCheckout(true);
    Promise.all([getMiPerfil(), listarDireccionesUsuario()])
      .then(([perfil, list]) => {
        if (cancelled) return;
        const baseNombre = splitNombreCompleto(perfil.nombre);
        const apellidosApi = perfil.apellidos?.trim();
        setDatosPersonales({
          nombre: baseNombre.nombre,
          apellidos: apellidosApi && apellidosApi.length > 0 ? apellidosApi : baseNombre.apellidos,
          email: perfil.email ?? '',
          telefono: perfil.telefono ?? '',
        });
        const dirList =
          perfil.direcciones && perfil.direcciones.length > 0 ? perfil.direcciones : list;
        setDirecciones(dirList);
      })
      .catch(() => {
        if (!cancelled) {
          listarDireccionesUsuario()
            .then((list) => {
              if (cancelled) return;
              setDirecciones(list);
            })
            .catch(() => setDirecciones([]));
        }
      })
      .finally(() => {
        if (!cancelled) setCargandoPerfilCheckout(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Prioridad: id guardado en checkout (pantalla elegir domicilio) → principal → primera. */
  useEffect(() => {
    if (cargandoPerfilCheckout) return;
    if (direcciones.length === 0) {
      setDireccionSeleccionadaId('');
      return;
    }
    const stored = readCheckoutDireccionId();
    if (stored && direcciones.some((d) => d.id === stored)) {
      setDireccionSeleccionadaId(stored);
      return;
    }
    const principal = direcciones.find((d) => d.esPrincipal);
    setDireccionSeleccionadaId(principal?.id ?? direcciones[0]!.id);
  }, [direcciones, cargandoPerfilCheckout]);

  useEffect(() => {
    const sync = () => {
      if (direcciones.length === 0) return;
      const stored = readCheckoutDireccionId();
      if (stored && direcciones.some((d) => d.id === stored)) {
        setDireccionSeleccionadaId(stored);
      }
    };
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, [direcciones]);

  const metodosPagoOpciones = [
    { value: 'tarjeta', label: 'Tarjeta de crédito / débito' },
    { value: 'transferencia', label: 'Transferencia bancaria' },
    { value: 'efectivo', label: 'Efectivo' },
  ];

  const direccionSeleccionada = useMemo(
    () => direcciones.find((d) => d.id === direccionSeleccionadaId),
    [direcciones, direccionSeleccionadaId]
  );

  const textoDireccionPedido = (): string => {
    if (tipoEntrega === 'retiro') return DIRECCION_RETIRO_LOCAL;
    if (direccionSeleccionada) return textoDesdeDireccion(direccionSeleccionada);
    return '';
  };

  const etiquetaMetodoPago = () => {
    const m = metodosPagoOpciones.find((o) => o.value === metodoPago.tipo);
    return m?.label ?? metodoPago.tipo;
  };

  const textoCuandoLlega = () => {
    if (tipoEntrega === 'retiro') {
      return {
        titulo: 'Retiro en la estética',
        texto:
          'Tu pedido estará listo para recoger en el local en aproximadamente 24–48 horas hábiles después de confirmar el pago. Te avisaremos cuando puedas pasar.',
      };
    }
    return {
      titulo: 'Envío a domicilio',
      texto:
        'Entrega estimada: 3 a 5 días hábiles después de confirmar el pago. El repartidor podrá contactarte al teléfono de tu cuenta.',
    };
  };

  const validarPaso1 = (): boolean => {
    if (tipoEntrega === 'retiro') return true;
    if (direcciones.length === 0) {
      setSubmitError('Agrega un domicilio en tu cuenta o elige retiro en la estética.');
      return false;
    }
    if (!direccionSeleccionada) {
      setSubmitError('Elige un domicilio en “Modificar domicilio o elegir otro”.');
      return false;
    }
    return true;
  };

  const validarPaso3 = (): boolean => {
    if (!metodoPago.tipo) {
      setSubmitError('Selecciona una forma de pago.');
      return false;
    }
    return true;
  };

  const ejecutarCompra = async () => {
    if (!hasValidToken()) {
      const msg = 'Inicia sesión para completar la compra.';
      setSubmitError(msg);
      void showAlert(msg);
      return;
    }

    if (solicitaFactura && !rfcFactura.trim()) {
      setSubmitError('Indica tu RFC para facturación o desmarca “Solicito factura”.');
      return;
    }

    for (const item of items) {
      if (!item.productoId || !item.presentacionId) {
        setSubmitError(
          'Hay ítems sin producto/presentación válidos. Vaciá el carrito y vuelve a agregar desde la tienda.'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const textoDir = textoDireccionPedido();
      const partesNotas: string[] = [];
      if (datosPersonales.telefono) partesNotas.push(`Tel: ${datosPersonales.telefono}`);
      partesNotas.push(
        `Contacto: ${datosPersonales.nombre} ${datosPersonales.apellidos}`.trim()
      );
      partesNotas.push(
        tipoEntrega === 'retiro' ? 'Entrega: retiro en estética' : 'Entrega: domicilio'
      );
      if (esTarjeta && mesesMSI !== '1') {
        partesNotas.push(`MSI: ${mesesMSI} meses`);
      }
      if (solicitaFactura) {
        partesNotas.push(`Factura: RFC ${rfcFactura.trim()}`);
      }

      const pedido = await crearPedido({
        estado: 'pendiente_pago' as EstadoPedidoUi,
        subtotal,
        costoEnvio: envio,
        impuestos: 0,
        descuento: 0,
        total,
        moneda: 'MXN',
        direccionTextoCompleta: textoDir,
        notasCliente: partesNotas.filter(Boolean).join(' — ') || undefined,
        metodoPago: metodoPago.tipo ? mapMetodoCheckout(metodoPago.tipo) : undefined,
        direccionEnvioId:
          tipoEntrega === 'domicilio' && direccionSeleccionada ? direccionSeleccionada.id : undefined,
      });

      for (const item of items) {
        const sub = item.precio * item.cantidad;
        await crearPedidoItem(pedido.id, {
          cantidad: item.cantidad,
          precioUnitario: item.precio,
          subtotal: sub,
          nombreProducto: item.nombre,
          tamanio: item.presentacion,
          productoId: item.productoId,
          presentacionId: item.presentacionId,
        });
      }

      if (metodoPago.tipo) {
        await crearPago({
          pedidoId: pedido.id,
          monto: total,
          moneda: 'MXN',
          metodo: mapMetodoCheckout(metodoPago.tipo),
          estado: 'pendiente',
          intentoNumero: 1,
        });
      }

      await clearCart();
      clearCheckoutDireccionId();
      const q =
        esTarjeta
          ? `pedidoId=${pedido.id}&pago=tarjeta`
          : `pedidoId=${pedido.id}`;
      router.push(`/cliente/tienda-online/confirmacion?${q}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear el pedido';
      setSubmitError(msg);
      void showAlert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const manejarSiguiente = async () => {
    setSubmitError(null);
    if (paso === 1) {
      if (!validarPaso1()) return;
      setPaso(2);
      return;
    }
    if (paso === 2) {
      setPaso(3);
      return;
    }
    if (paso === 3) {
      if (!validarPaso3()) return;
      if (metodoPago.tipo === 'tarjeta') setPaso(4);
      else setPaso(5);
      return;
    }
    if (paso === 4) {
      setPaso(5);
      return;
    }
    if (paso === 5) {
      await ejecutarCompra();
    }
  };

  const manejarAnterior = () => {
    setSubmitError(null);
    if (paso === 5) {
      if (metodoPago.tipo === 'tarjeta') setPaso(4);
      else setPaso(3);
    } else if (paso === 4) {
      setPaso(3);
    } else if (paso > 1) {
      setPaso(paso - 1);
    }
  };

  const etiquetasBarra = esTarjeta
    ? ['Entrega', 'Cuándo llegará', 'Forma de pago', 'Meses sin intereses', 'Revisa y confirma']
    : ['Entrega', 'Cuándo llegará', 'Forma de pago', 'Revisa y confirma'];

  if (cartLoading || items.length === 0) {
    return (
      <ModuleLayout>
        <div className="max-w-6xl mx-auto py-12 text-center">
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            {cartLoading ? 'Cargando carrito…' : 'Redirigiendo al carrito…'}
          </p>
        </div>
      </ModuleLayout>
    );
  }

  if (!hasValidToken()) {
    return (
      <ModuleLayout>
        <div className="max-w-6xl mx-auto py-12 text-center">
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Redirigiendo al inicio de sesión para completar tu compra…
          </p>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Checkout"
          subtitle="Sigue los pasos para completar tu compra"
        />

        {submitError && (
          <Card className="mb-4 p-4" style={{ borderColor: 'var(--danger)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {submitError}
            </p>
          </Card>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
            {Array.from({ length: totalPasosBarra }, (_, i) => i + 1).map((num) => (
              <div key={num} className="flex items-center">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    pasoEnBarra >= num ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor:
                      pasoEnBarra >= num ? 'var(--botones-principales)' : 'var(--fondos-suaves)',
                    color:
                      pasoEnBarra >= num ? 'var(--texto-fondo-oscuro)' : 'var(--menu-texto-principal)',
                  }}
                >
                  {num}
                </div>
                {num < totalPasosBarra && (
                  <div
                    className={`w-6 sm:w-12 h-1 ${pasoEnBarra > num ? '' : 'opacity-50'}`}
                    style={{
                      backgroundColor:
                        pasoEnBarra > num ? 'var(--botones-principales)' : 'var(--fondos-suaves)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <p
            className="text-center text-sm mt-3 font-medium"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            {etiquetasBarra[pasoEnBarra - 1] ?? ''}{' '}
            <span style={{ color: 'var(--encabezados-alterno)' }}>
              ({pasoEnBarra} de {totalPasosBarra})
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {paso === 1 && (
              <div>
                <h2 className="text-page-title mb-6" style={{ color: 'var(--menu-texto-principal)' }}>
                  Elige la forma de entrega
                </h2>

                <div className="space-y-4">
                  {/* Tarjeta: envío a domicilio (solo resumen; cambiar en otra pantalla) */}
                  <div
                    className="rounded-xl border-2 overflow-hidden"
                    style={{
                      backgroundColor: 'var(--superficie-elevada)',
                      borderColor:
                        tipoEntrega === 'domicilio'
                          ? 'var(--checkout-entrega-borde-seleccion)'
                          : 'var(--fondos-suaves)',
                    }}
                  >
                    <label className="flex items-start gap-3 p-4 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoEntrega"
                        className="mt-1.5 shrink-0"
                        checked={tipoEntrega === 'domicilio'}
                        onChange={() => setTipoEntrega('domicilio')}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="font-bold text-base" style={{ color: 'var(--menu-texto-principal)' }}>
                            Enviar a domicilio
                          </span>
                          <span className="font-bold shrink-0" style={{ color: 'var(--success)' }}>
                            {envio === 0 ? 'Gratis' : `$${envio.toLocaleString()}`}
                          </span>
                        </div>
                        {cargandoPerfilCheckout ? (
                          <p className="text-sm mt-3" style={{ color: 'var(--encabezados-alterno)' }}>
                            Cargando tu domicilio…
                          </p>
                        ) : direccionSeleccionada ? (
                          <>
                            <p className="text-sm mt-3 leading-snug" style={{ color: 'var(--menu-texto-principal)' }}>
                              {lineaResumenEnvio(direccionSeleccionada)}
                            </p>
                            <p className="text-xs mt-2 font-medium" style={{ color: 'var(--encabezados-alterno)' }}>
                              {etiquetaTipoDomicilio(direccionSeleccionada)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm mt-3" style={{ color: 'var(--encabezados-alterno)' }}>
                            No tienes domicilios guardados. Agrégalos desde tu cuenta (tabla{' '}
                            <code className="text-xs">direcciones_usuario</code>).
                          </p>
                        )}
                      </div>
                    </label>
                    <div
                      className="border-t px-4 py-3"
                      style={{ borderColor: 'var(--fondos-suaves)' }}
                    >
                      <button
                        type="button"
                        className="text-sm font-semibold bg-transparent border-0 cursor-pointer p-0 underline"
                        style={{ color: 'var(--checkout-entrega-enlace)' }}
                        onClick={() => router.push(RUTA_ELEGIR_DOMICILIO)}
                      >
                        Modificar domicilio o elegir otro
                      </button>
                    </div>
                  </div>

                  {/* Tarjeta: retiro en tienda */}
                  <label
                    className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--superficie-elevada)',
                      borderColor:
                        tipoEntrega === 'retiro'
                          ? 'var(--checkout-entrega-borde-seleccion)'
                          : 'var(--fondos-suaves)',
                    }}
                  >
                    <input
                      type="radio"
                      name="tipoEntrega"
                      className="mt-1.5 shrink-0"
                      checked={tipoEntrega === 'retiro'}
                      onChange={() => setTipoEntrega('retiro')}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-bold text-base" style={{ color: 'var(--menu-texto-principal)' }}>
                          Retirar en la estética
                        </span>
                        <span className="font-bold shrink-0" style={{ color: 'var(--success)' }}>
                          Gratis
                        </span>
                      </div>
                      <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--encabezados-alterno)' }}>
                        {DIRECCION_RETIRO_LOCAL}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {paso === 2 && (
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  ¿Cuándo llegará?
                </h2>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                  <p className="font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                    {textoCuandoLlega().titulo}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--encabezados-alterno)' }}>
                    {textoCuandoLlega().texto}
                  </p>
                </div>
                <p className="text-sm mt-4" style={{ color: 'var(--encabezados-alterno)' }}>
                  Las fechas son estimadas y pueden variar según disponibilidad y método de pago.
                </p>
              </Card>
            )}

            {paso === 3 && (
              <Card>
                <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  ¿Cómo quieres pagar?
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
                  Elige una opción. En el siguiente paso podrás definir detalles (por ejemplo meses sin intereses si pagas con tarjeta).
                </p>
                <div className="space-y-3">
                  {metodosPagoOpciones.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 transition-colors has-[:checked]:border-[var(--botones-principales)]"
                      style={{ borderColor: 'var(--fondos-suaves)' }}
                    >
                      <input
                        type="radio"
                        name="metodoPagoTipo"
                        value={opt.value}
                        checked={metodoPago.tipo === opt.value}
                        onChange={() =>
                          setMetodoPago({
                            ...metodoPago,
                            tipo: opt.value,
                          })
                        }
                      />
                      <span style={{ color: 'var(--menu-texto-principal)' }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </Card>
            )}

            {paso === 4 && esTarjeta && (
              <Card>
                <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Tarjeta y meses sin intereses
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
                  Datos de tarjeta solo para demostración en pantalla; no se envían a un procesador real. Elige si
                  aplica meses sin intereses.
                </p>
                <div className="space-y-4">
                  <Select
                    label="Meses sin intereses"
                    options={OPCIONES_MSI}
                    value={mesesMSI}
                    onChange={(e) => setMesesMSI(e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Número de tarjeta (demo, no se guarda en servidor)"
                    value={metodoPago.numeroTarjeta}
                    onChange={(e) => setMetodoPago({ ...metodoPago, numeroTarjeta: e.target.value })}
                    fullWidth
                    placeholder="1234 5678 9012 3456"
                  />
                  <Input
                    label="Nombre del titular"
                    value={metodoPago.nombreTitular}
                    onChange={(e) => setMetodoPago({ ...metodoPago, nombreTitular: e.target.value })}
                    fullWidth
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Vencimiento"
                      value={metodoPago.fechaVencimiento}
                      onChange={(e) => setMetodoPago({ ...metodoPago, fechaVencimiento: e.target.value })}
                      fullWidth
                      placeholder="MM/AA"
                    />
                    <Input
                      label="CVV"
                      type="password"
                      value={metodoPago.cvv}
                      onChange={(e) => setMetodoPago({ ...metodoPago, cvv: e.target.value })}
                      fullWidth
                      placeholder="123"
                    />
                  </div>
                </div>
              </Card>
            )}

            {paso === 5 && (
              <Card>
                <h2 className="text-page-title mb-6" style={{ color: 'var(--menu-texto-principal)' }}>
                  Revisa y confirma
                </h2>

                <div className="space-y-6">
                  <section>
                    <h3 className="text-subtitle mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
                      Facturación y contacto
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                      Datos cargados de tu cuenta; puedes ajustarlos para este pedido. Para cambios permanentes,{' '}
                      <Link href="/perfil" className="font-semibold underline" style={{ color: 'var(--checkout-entrega-enlace)' }}>
                        edita tu perfil
                      </Link>
                      .
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nombre"
                        value={datosPersonales.nombre}
                        onChange={(e) => setDatosPersonales({ ...datosPersonales, nombre: e.target.value })}
                        fullWidth
                      />
                      <Input
                        label="Apellidos"
                        value={datosPersonales.apellidos}
                        onChange={(e) => setDatosPersonales({ ...datosPersonales, apellidos: e.target.value })}
                        fullWidth
                      />
                    </div>
                    <Input
                      label="Correo"
                      type="email"
                      className="mt-4"
                      value={datosPersonales.email}
                      onChange={(e) => setDatosPersonales({ ...datosPersonales, email: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Teléfono"
                      type="tel"
                      className="mt-4"
                      value={datosPersonales.telefono}
                      onChange={(e) => setDatosPersonales({ ...datosPersonales, telefono: e.target.value })}
                      fullWidth
                    />
                    <label className="flex items-center gap-2 mt-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={solicitaFactura}
                        onChange={(e) => setSolicitaFactura(e.target.checked)}
                      />
                      <span style={{ color: 'var(--menu-texto-principal)' }}>Solicito factura fiscal (CFDI)</span>
                    </label>
                    {solicitaFactura && (
                      <Input
                        label="RFC"
                        className="mt-3"
                        value={rfcFactura}
                        onChange={(e) => setRfcFactura(e.target.value.toUpperCase())}
                        fullWidth
                        placeholder="XAXX010101000"
                      />
                    )}
                  </section>

                  <section className="pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                    <h3 className="text-subtitle mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                      Entrega
                    </h3>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--encabezados-alterno)' }}>
                      {tipoEntrega === 'retiro' ? 'Retiro en estética' : 'Envío a domicilio'}
                      <br />
                      {textoDireccionPedido()}
                    </p>
                    <p className="text-sm mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      {textoCuandoLlega().texto}
                    </p>
                  </section>

                  <section className="pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                    <h3 className="text-subtitle mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                      Pago
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                      <strong style={{ color: 'var(--menu-texto-principal)' }}>Método:</strong> {etiquetaMetodoPago()}
                    </p>
                    {esTarjeta && (
                      <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        <strong style={{ color: 'var(--menu-texto-principal)' }}>Meses sin intereses:</strong>{' '}
                        {OPCIONES_MSI.find((o) => o.value === mesesMSI)?.label ?? mesesMSI}
                      </p>
                    )}
                    <p className="text-sm mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      Total a pagar:{' '}
                      <strong style={{ color: 'var(--menu-texto-principal)' }}>
                        ${total.toLocaleString()} MXN
                      </strong>
                    </p>
                  </section>
                </div>
              </Card>
            )}

            <div className="flex gap-4 mt-6">
              {paso > 1 && (
                <Button variant="outline" fullWidth onClick={manejarAnterior} disabled={submitting}>
                  Anterior
                </Button>
              )}
              <Button fullWidth onClick={() => void manejarSiguiente()} disabled={submitting}>
                {submitting
                  ? 'Procesando…'
                  : paso === 5
                    ? 'Finalizar compra'
                    : 'Continuar'}
              </Button>
            </div>
          </div>

          <div>
            <Card>
              <h3 className="text-subtitle mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Resumen del pedido
              </h3>
              {items.length > 0 && (
                <div
                  className="mb-4 max-h-40 overflow-y-auto space-y-2"
                  style={{ borderBottom: '1px solid var(--fondos-suaves)' }}
                >
                  {items.map((item) => (
                    <div key={String(item.id)} className="flex justify-between text-sm">
                      <span style={{ color: 'var(--menu-texto-principal)' }}>
                        {item.nombre}
                        {item.presentacion && (
                          <span style={{ color: 'var(--encabezados-alterno)' }}> — {item.presentacion}</span>
                        )}
                        <span style={{ color: 'var(--encabezados-alterno)' }}> × {item.cantidad}</span>
                      </span>
                      <span style={{ color: 'var(--menu-texto-principal)' }}>
                        ${(item.precio * item.cantidad).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Subtotal:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Envío:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>
                    {tipoEntrega === 'retiro' ? '$0' : `$${envio.toLocaleString()}`}
                  </span>
                </div>
                <div className="pt-3 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      Total:
                    </span>
                    <span className="text-2xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      ${total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
