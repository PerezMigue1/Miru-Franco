'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { CreditCard, Lock, Store } from 'lucide-react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import PasosFlujo from '../../../../../components/cliente/PasosFlujo';
import { formatearPrecioMXN } from '../../../../../utils/formatoPrecio';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import { useCart } from '../../../../../context/CartContext';
import {
  crearPedido,
  crearPreferenciaMercadoPago,
  METODO_PAGO_EN_SALON,
  METODO_PAGO_MERCADOPAGO,
  type EstadoPedidoUi,
} from '../../../../../services/ecommerce';
import { getMiPerfil } from '../../../../../services/auth';
import { hasValidToken } from '../../../../../utils/security';
import { showAlert } from '../../../../../utils/toast';
import { mensajeUsuarioDesdeErrorApi } from '../../../../../utils/apiErrorMessage';
import { emitCatalogStockChanged } from '../../../../../utils/catalogStockSync';
import {
  calcularResumenVentaCarrito,
  construirNotasClienteVenta,
  mensajeErrorLineasNoVendibles,
} from '../../../../../utils/ventaDesdeCarrito';
import DatosRecogerEnSalon from '../../../../../components/tienda/DatosRecogerEnSalon';

type FormaPago = 'linea' | 'salon';

const OPCIONES_FORMA_PAGO = [
  {
    value: 'linea',
    titulo: 'Pagar en línea',
    texto: 'Con tarjeta en la página segura de Mercado Pago.',
    icono: CreditCard,
  },
  {
    value: 'salon',
    titulo: 'Pagar al recoger en el salón',
    texto: 'Te apartamos el pedido y lo pagas en el mostrador cuando pases por él.',
    icono: Store,
  },
] as const;

const ETIQUETAS_PASOS = ['Recoger en el salón', 'Forma de pago', 'Revisa y confirma'];

function splitNombreCompleto(full: string): { nombre: string; apellidos: string } {
  const t = full.trim();
  if (!t) return { nombre: '', apellidos: '' };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0], apellidos: '' };
  return { nombre: parts[0] ?? '', apellidos: parts.slice(1).join(' ') };
}

interface ContactoFormValues {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  rfcFactura: string;
}

function emailValido(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function telefonoValidoMx(s: string): boolean {
  return s.replace(/\D/g, '').length >= 10;
}

/** RFC persona física/moral (formato básico 12–13 caracteres). */
function rfcMexicoBasico(rfc: string): boolean {
  const t = rfc.trim().toUpperCase();
  if (t.length < 12 || t.length > 13) return false;
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(t);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, loading: cartLoading, listo: carritoListo } = useCart();
  /** 1 recoger en el salón → 2 forma de pago → 3 revisar y confirmar. */
  const [paso, setPaso] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * El guard de "carrito vacío → mandar a /carrito" (más abajo) reacciona a
   * clearCart() vaciando el carrito DURANTE una compra exitosa, ganándole la
   * carrera al router.push(confirmacion). Este ref le dice al guard "no me
   * mandes al carrito, la compra ya terminó bien" — se enciende justo antes
   * de clearCart() (no antes, para no atrapar al cliente si algo previo falla)
   * y se apaga en el catch si algo sale mal después de encenderlo.
   */
  const compraFinalizadaRef = useRef(false);

  /**
   * Dos formas de pago: en línea (Mercado Pago Checkout Pro: la clienta escribe su tarjeta en la página
   * de Mercado Pago; aquí nunca entra un dato de tarjeta) o al recoger en el salón (apartado).
   */
  const [formaPago, setFormaPago] = useState<FormaPago>('salon');
  const [solicitaFactura, setSolicitaFactura] = useState(false);

  const {
    register: regContacto,
    reset: resetContacto,
    getValues: getContactoValues,
    trigger: triggerContacto,
    formState: { errors: contactoErrors },
  } = useForm<ContactoFormValues>({
    mode: 'onBlur',
    defaultValues: { nombre: '', apellidos: '', email: '', telefono: '', rfcFactura: '' },
  });

  const resumenVenta = useMemo(() => calcularResumenVentaCarrito(items), [items]);
  const { subtotal, total } = resumenVenta;

  useEffect(() => {
    // Hasta que el carrito termine su primera carga no se sabe si está vacío: entrar directo a /checkout
    // con el carrito en el servidor no debe mandar al carrito antes de tiempo.
    if (cartLoading || !carritoListo) return;
    if (items.length === 0 && !compraFinalizadaRef.current) {
      router.replace('/cliente/tienda-online/carrito');
      return;
    }
    if (!hasValidToken()) {
      router.replace(
        `/login?returnUrl=${encodeURIComponent('/cliente/tienda-online/checkout')}`
      );
    }
  }, [items.length, cartLoading, carritoListo, router]);

  useEffect(() => {
    if (!hasValidToken()) return;
    let cancelled = false;
    getMiPerfil()
      .then((perfil) => {
        if (cancelled) return;
        const baseNombre = splitNombreCompleto(perfil.nombre);
        const apellidosApi = perfil.apellidos?.trim();
        resetContacto({
          nombre: baseNombre.nombre,
          apellidos: apellidosApi && apellidosApi.length > 0 ? apellidosApi : baseNombre.apellidos,
          email: perfil.email ?? '',
          telefono: perfil.telefono ?? '',
          rfcFactura: '',
        });
      })
      .catch(() => {
        /* sin perfil, la clienta llena sus datos de contacto a mano en la revisión */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const etiquetaMetodoPago = () =>
    formaPago === 'salon' ? 'Pagas al recoger, en el salón' : 'En línea, con Mercado Pago';

  const elegirFormaPago = (forma: FormaPago) => {
    setFormaPago(forma);
    setSubmitError(null);
  };

  const ejecutarCompra = async () => {
    if (!hasValidToken()) {
      const msg = 'Inicia sesión para completar la compra.';
      setSubmitError(msg);
      void showAlert(msg);
      return;
    }

    if (!(await triggerContacto())) {
      setSubmitError('Revisa los datos de contacto antes de finalizar.');
      return;
    }
    setSubmitError(null);

    const errLineas = mensajeErrorLineasNoVendibles(items);
    if (errLineas) {
      setSubmitError(errLineas);
      return;
    }

    setSubmitting(true);
    let pedidoId: number | null = null;
    try {
      const notasCliente = construirNotasClienteVenta({
        telefono: getContactoValues('telefono'),
        nombreContacto: getContactoValues('nombre'),
        apellidosContacto: getContactoValues('apellidos'),
        solicitaFactura,
        rfcFactura: solicitaFactura ? getContactoValues('rfcFactura') : undefined,
      });
      // Se recoge en el salón: el pedido no lleva dirección ni costo de envío. Con pago al recoger
      // queda apartado; en línea, queda pendiente hasta que Mercado Pago confirma el pago.
      const pedido = await crearPedido({
        estado: 'pendiente_pago' as EstadoPedidoUi,
        moneda: 'MXN',
        notasCliente,
        metodoPago: formaPago === 'salon' ? METODO_PAGO_EN_SALON : METODO_PAGO_MERCADOPAGO,
        items: items.map((item) => ({
          cantidad: item.cantidad,
          productoId: item.productoId,
          presentacionId: item.presentacionId,
        })),
      }, { propios: true });
      pedidoId = pedido.id;
      // El servidor descuenta stock al crear el pedido; refrescar catálogos abiertos.
      emitCatalogStockChanged();

      compraFinalizadaRef.current = true;
      await clearCart();

      if (formaPago === 'linea') {
        // Montos y artículos los calcula el servidor; aquí solo se pide la URL de pago y se redirige.
        const { initPoint } = await crearPreferenciaMercadoPago(pedido.id);
        window.location.assign(initPoint);
        return;
      }
      router.push(`/cliente/tienda-online/confirmacion?pedidoId=${pedido.id}`);
    } catch (e) {
      if (pedidoId !== null) {
        // El pedido ya existe pero no se pudo abrir Mercado Pago: la confirmación ofrece reintentar el pago.
        router.push(`/cliente/tienda-online/confirmacion?pedidoId=${pedidoId}`);
        return;
      }
      compraFinalizadaRef.current = false;
      const msg = mensajeUsuarioDesdeErrorApi(e);
      setSubmitError(msg);
      const st = (e as Error & { status?: number }).status;
      if (st === 400) {
        void showAlert(
          `${msg}\n\nSi el mensaje indica falta de stock, el pedido no se creó y el inventario no cambió. Revisa cantidades o vuelve al catálogo para ver disponibilidad actualizada.`
        );
      } else {
        void showAlert(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const manejarSiguiente = async () => {
    setSubmitError(null);
    if (paso < 3) {
      setPaso(paso + 1);
      return;
    }
    await ejecutarCompra();
  };

  const manejarAnterior = () => {
    setSubmitError(null);
    if (paso > 1) setPaso(paso - 1);
  };

  if (cartLoading || !carritoListo || items.length === 0) {
    return (
      <ModuleLayout>
        <div className="w-full max-w-none py-12 text-center">
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            {cartLoading || !carritoListo ? 'Cargando carrito…' : 'Redirigiendo al carrito…'}
          </p>
        </div>
      </ModuleLayout>
    );
  }

  if (!hasValidToken()) {
    return (
      <ModuleLayout>
        <div className="w-full max-w-none py-12 text-center">
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Redirigiendo al inicio de sesión para completar tu compra…
          </p>
        </div>
      </ModuleLayout>
    );
  }

  const textoBotonFinal = formaPago === 'linea' ? 'Ir a pagar con Mercado Pago' : 'Apartar mi pedido';

  return (
    <ModuleLayout>
      <div className="w-full max-w-none">
        <PageHeader
          title="Checkout"
          subtitle="Sigue los pasos para completar tu compra"
        />

        {submitError && (
          <Card className="mb-4 p-4" style={{ borderColor: 'var(--danger)' }}>
            <p className="text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>
              {submitError}
            </p>
          </Card>
        )}

        {/* Pasos con nombre; en móvil el texto de abajo dice cuál es y cuántos faltan */}
        <PasosFlujo pasos={ETIQUETAS_PASOS} actual={paso - 1} etiqueta="Pasos de la compra" />
        <p className="-mt-5 mb-6 text-sm sm:hidden" style={{ color: 'var(--encabezados-alterno)' }}>
          Paso <span className="mf-cifras">{paso} de {ETIQUETAS_PASOS.length}</span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-6 lg:gap-10">
          <div>
            {paso === 1 && (
              <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) both' }}>
                <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Recoges tu pedido en el salón
                </h2>
                <p className="text-sm mb-5" style={{ color: 'var(--encabezados-alterno)' }}>
                  Lo preparamos y te lo apartamos en el mostrador.
                </p>
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                  <DatosRecogerEnSalon />
                </div>
              </Card>
            )}

            {paso === 2 && (
              <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) both' }}>
                <fieldset>
                  <legend className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                    ¿Cómo quieres pagar?
                  </legend>
                  <p className="text-sm mb-5" style={{ color: 'var(--encabezados-alterno)' }}>
                    En los dos casos recoges tu pedido en el salón.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {OPCIONES_FORMA_PAGO.map((op) => {
                      const Icono = op.icono;
                      const elegida = formaPago === op.value;
                      return (
                        <label
                          key={op.value}
                          className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-[border-color] duration-200"
                          style={{
                            backgroundColor: 'var(--superficie-elevada)',
                            borderColor: elegida ? 'var(--checkout-entrega-borde-seleccion)' : 'var(--fondos-suaves)',
                          }}
                        >
                          <input
                            type="radio"
                            name="formaPago"
                            value={op.value}
                            checked={elegida}
                            onChange={() => elegirFormaPago(op.value)}
                            className="mt-1 shrink-0 w-4 h-4"
                            style={{ accentColor: 'var(--botones-principales)' }}
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                              <Icono className="w-4 h-4 shrink-0" style={{ color: 'var(--logo-branding)' }} aria-hidden />
                              {op.titulo}
                            </span>
                            <span className="block text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                              {op.texto}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <p
                  className="text-sm mt-5 rounded-lg px-4 py-3 flex items-start gap-2"
                  style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--encabezados-alterno)' }}
                >
                  {formaPago === 'salon' ? (
                    <span>
                      Tu pedido queda apartado. Pagas{' '}
                      <strong className="mf-cifras" style={{ color: 'var(--menu-texto-principal)' }}>
                        {formatearPrecioMXN(total)}
                      </strong>{' '}
                      en el mostrador cuando pases por él.
                    </span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} aria-hidden />
                      <span>
                        Al confirmar te llevamos a Mercado Pago para pagar{' '}
                        <strong className="mf-cifras" style={{ color: 'var(--menu-texto-principal)' }}>
                          {formatearPrecioMXN(total)}
                        </strong>
                        . Tu tarjeta la escribes allá: este sitio no la ve ni la guarda. Tienes 24 horas para completar el pago.
                      </span>
                    </>
                  )}
                </p>
              </Card>
            )}

            {paso === 3 && (
              <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) both' }}>
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
                        error={contactoErrors.nombre?.message}
                        fullWidth
                        autoComplete="given-name"
                        {...regContacto('nombre', { required: 'Indica tu nombre.' })}
                      />
                      <Input
                        label="Apellidos"
                        error={contactoErrors.apellidos?.message}
                        fullWidth
                        autoComplete="family-name"
                        {...regContacto('apellidos', { required: 'Indica tus apellidos.' })}
                      />
                    </div>
                    <Input
                      label="Correo"
                      type="email"
                      className="mt-4"
                      error={contactoErrors.email?.message}
                      fullWidth
                      autoComplete="email"
                      {...regContacto('email', {
                        required: 'Indica tu correo electrónico.',
                        validate: (v) => emailValido(v) || 'El correo no tiene un formato válido.',
                      })}
                    />
                    <Input
                      label="Teléfono"
                      type="tel"
                      className="mt-4"
                      error={contactoErrors.telefono?.message}
                      fullWidth
                      autoComplete="tel"
                      {...regContacto('telefono', {
                        required: 'Indica un teléfono de contacto.',
                        validate: (v) => telefonoValidoMx(v) || 'El teléfono debe incluir al menos 10 dígitos.',
                      })}
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
                        error={contactoErrors.rfcFactura?.message}
                        fullWidth
                        placeholder="XAXX010101000"
                        {...regContacto('rfcFactura', {
                          validate: (v) => {
                            if (!solicitaFactura) return true;
                            const r = v.trim().toUpperCase();
                            if (!r) return 'Indica el RFC o desmarca "Solicito factura".';
                            if (!rfcMexicoBasico(r)) return 'RFC inválido (revisa formato, 12 o 13 caracteres).';
                            return true;
                          },
                          onChange: (e) => {
                            e.target.value = e.target.value.toUpperCase();
                          },
                        })}
                      />
                    )}
                  </section>

                  <section className="pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                    <h3 className="text-subtitle mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
                      Recoges en el salón
                    </h3>
                    <DatosRecogerEnSalon />
                  </section>

                  <section className="pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                    <h3 className="text-subtitle mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                      Pago
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                      <strong style={{ color: 'var(--menu-texto-principal)' }}>Método:</strong> {etiquetaMetodoPago()}
                    </p>
                    <p className="text-sm mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      {formaPago === 'salon' ? 'Total a pagar al recoger:' : 'Total a pagar:'}{' '}
                      <strong className="mf-cifras" style={{ color: 'var(--menu-texto-principal)' }}>
                        {formatearPrecioMXN(total)} MXN
                      </strong>
                    </p>
                    <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      Total estimado: el total final se confirma al crear tu pedido.
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
                <span className="mf-feedback-contenido w-full" data-cambiando={submitting ? 'true' : 'false'}>
                  {submitting ? (formaPago === 'linea' ? 'Abriendo Mercado Pago…' : 'Procesando…') : paso === 3 ? textoBotonFinal : 'Continuar'}
                </span>
              </Button>
            </div>
            {paso === 3 && (
              <p className="mf-leyenda-terminos">
                Al confirmar tu pedido aceptas los{' '}
                <a href="/terminos-y-condiciones" target="_blank" rel="noopener noreferrer">
                  Términos y Condiciones<span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
              </p>
            )}
          </div>

          <div className="lg:sticky lg:top-[calc(var(--mf-header-offset,136px)+1rem)] lg:self-start">
            <Card padding="lg">
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}>
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
                      <span className="mf-cifras shrink-0 pl-3" style={{ color: 'var(--menu-texto-principal)' }}>
                        {formatearPrecioMXN(item.precio * item.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Subtotal:</span>
                  <span className="mf-cifras" style={{ color: 'var(--menu-texto-principal)' }}>{formatearPrecioMXN(subtotal)}</span>
                </div>
                <div className="pt-3 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      Total:
                    </span>
                    <span className="mf-cifras text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {formatearPrecioMXN(total)}
                    </span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                    Monto estimado: el total final se confirma al crear tu pedido.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
