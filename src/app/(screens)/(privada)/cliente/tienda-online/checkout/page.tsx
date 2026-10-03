'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import PasosFlujo from '../../../../../components/cliente/PasosFlujo';
import { formatearPrecioMXN } from '../../../../../utils/formatoPrecio';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import Select from '../../../../../components/ui/Select';
import { useCart } from '../../../../../context/CartContext';
import { CreditCard, Store } from 'lucide-react';
import {
  crearPedido,
  METODO_PAGO_EN_SALON,
  type EstadoPedidoUi,
} from '../../../../../services/ecommerce';
import { getMiPerfil } from '../../../../../services/auth';
import { hasValidToken } from '../../../../../utils/security';
import { showAlert, showToast } from '../../../../../utils/toast';
import { mensajeUsuarioDesdeErrorApi } from '../../../../../utils/apiErrorMessage';
import { emitCatalogStockChanged } from '../../../../../utils/catalogStockSync';
import {
  calcularResumenVentaCarrito,
  construirNotasClienteVenta,
  mensajeErrorLineasNoVendibles,
} from '../../../../../utils/ventaDesdeCarrito';
import { useMetodosPagoUsuario } from '../../../../../hooks/useMetodosPagoUsuario';
import { crearMetodoPagoUsuario } from '../../../../../services/metodosPagoUsuario';
import {
  paymentsBinLookup,
  paymentsMsiIndicio,
  bancoEmisorDesdeBinInfo,
  marcaDesdeBinInfo,
  tipoTarjetaDesdeBinInfo,
} from '../../../../../services/paymentsPublic';
import CheckoutTarjetaAnimada from '../../../../../components/tienda/CheckoutTarjetaAnimada';
import DatosRecogerEnSalon from '../../../../../components/tienda/DatosRecogerEnSalon';

const OPCIONES_FORMA_PAGO = [
  {
    value: 'linea',
    titulo: 'Pagar en línea',
    texto: 'Con tarjeta de crédito o débito.',
    icono: CreditCard,
  },
  {
    value: 'salon',
    titulo: 'Pagar al recoger en el salón',
    texto: 'Te apartamos el pedido y lo pagas en el mostrador cuando pases por él.',
    icono: Store,
  },
] as const;

function mapMetodoCheckout(tipo: string): string {
  if (tipo === 'tarjeta_credito') return 'tarjeta_credito';
  if (tipo === 'tarjeta_debito') return 'tarjeta_debito';
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

/** Mensaje MSI para mostrar al usuario; no usa JSON.stringify (evita `{"indicioMsi":"sin_indicio"}`). */
function textoHumanoMsiParaUi(msi: Record<string, unknown>): string | null {
  const msg = msi.mensaje ?? msi.message ?? msi.texto ?? msi.descripcion ?? msi.description;
  const s = msg != null ? String(msg).trim() : '';
  if (s) return s;

  const indicio = String(msi.indicioMsi ?? msi.indicio_msi ?? '')
    .trim()
    .toLowerCase();
  if (!indicio || indicio === 'sin_indicio' || indicio === 'sin-indicio') {
    return null;
  }

  return null;
}

interface ContactoFormValues {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  rfcFactura: string;
}

interface TarjetaFormValues {
  numeroTarjeta: string;
  nombreTitular: string;
  fechaVencimiento: string;
  cvv: string;
  mesesMSI: string;
}

function soloDigitos(s: string): string {
  return s.replace(/\D/g, '');
}

/** 16 dígitos en grupos de 4: "1111 2222 3333 4444" */
function formatearInputNumeroTarjeta(raw: string): string {
  const d = soloDigitos(raw).slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/** Solo letras (incluye acentos, ñ), espacios, apóstrofo y guion para nombres compuestos */
function sanitizarNombreTitular(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/[^\p{L}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s+/, '');
}

/** Cuatro dígitos → MM/AA (ej. 0105 → 01/05) */
function formatearInputVencimiento(raw: string): string {
  const d = soloDigitos(raw).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** Solo 3 dígitos */
function sanitizarCvv(raw: string): string {
  return soloDigitos(raw).slice(0, 3);
}

function pasaLuhn(digits: string): boolean {
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function errorNumeroTarjeta(raw: string): string | null {
  const d = soloDigitos(raw);
  if (!d) return 'Ingresa los 16 dígitos de la tarjeta.';
  if (d.length !== 16) return 'El número debe tener exactamente 16 dígitos.';
  const luhnEstricto =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CHECKOUT_LUHN_STRICT === 'true';
  if (luhnEstricto && !pasaLuhn(d)) {
    return 'El número no es válido; revisa los dígitos.';
  }
  return null;
}

function errorNombreTitular(raw: string): string | null {
  const t = raw.trim();
  if (!t) return 'Ingresa el nombre como aparece en la tarjeta.';
  if (/^\d+$/.test(t)) return 'El nombre no puede ser solo números.';
  const partes = t.split(/\s+/).filter(Boolean);
  if (partes.length < 2) {
    return 'Indica al menos nombre y apellido (separados por un espacio).';
  }
  if (partes.some((p) => /^\d+$/.test(p))) {
    return 'Cada parte del nombre debe incluir letras, no solo números.';
  }
  const letras = t.match(/\p{L}/gu);
  if (!letras || letras.length < 4) {
    return 'Usa letras para nombre y apellido (mínimo 4 letras en total).';
  }
  if (t.length > 120) return 'El nombre es demasiado largo.';
  return null;
}

function errorVencimiento(raw: string): string | null {
  const s = raw.trim();
  if (!s) return 'Indica la fecha de vencimiento.';
  const m = s.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return 'Completa el vencimiento como MM/AA (ej. 05/29).';
  const mm = parseInt(m[1]!, 10);
  const yy = parseInt(m[2]!, 10);
  if (mm < 1 || mm > 12) return 'El mes debe estar entre 01 y 12.';
  const yFull = 2000 + yy;
  const now = new Date();
  const yNow = now.getFullYear();
  const mNow = now.getMonth() + 1;
  if (yFull < yNow || (yFull === yNow && mm < mNow)) {
    return 'La tarjeta está vencida o la fecha no es válida.';
  }
  return null;
}

function errorCvv(raw: string): string | null {
  const c = soloDigitos(raw);
  if (!c) return 'Ingresa los 3 dígitos del CVC.';
  if (c.length !== 3) return 'El CVC debe tener exactamente 3 dígitos.';
  return null;
}

function emailValido(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function telefonoValidoMx(s: string): boolean {
  return soloDigitos(s).length >= 10;
}

/** RFC persona física/moral (formato básico 12–13 caracteres). */
function rfcMexicoBasico(rfc: string): boolean {
  const t = rfc.trim().toUpperCase();
  if (t.length < 12 || t.length > 13) return false;
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(t);
}

const OPCIONES_MSI = [
  { value: '1', label: 'Un solo pago (sin meses sin intereses)' },
  { value: '3', label: '3 meses sin intereses' },
  { value: '6', label: '6 meses sin intereses' },
  { value: '12', label: '12 meses sin intereses' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, loading: cartLoading } = useCart();
  /**
   * 1 recoger en el salón → 3 forma de pago (el 2 ya no existe; se conserva la numeración).
   * En línea con crédito: 1 → 3 → 4 datos tarjeta (BIN / indicio MSI) → 5 mensualidad → 6 revisar.
   * En línea con débito: 1 → 3 → 4 datos tarjeta → 5 revisar.
   * Pago al recoger: 1 → 3 → 5 revisar.
   */
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
   * Dos formas de pago: en línea (tarjeta de crédito o débito, el flujo de tarjeta de siempre) o al
   * recoger en el salón (el pedido queda apartado y se cobra en el mostrador). En línea, `metodoPago.tipo`
   * queda vacío hasta que la clienta elige crédito o débito.
   */
  const [formaPago, setFormaPago] = useState<'linea' | 'salon'>('salon');
  const [metodoPago, setMetodoPago] = useState({ tipo: METODO_PAGO_EN_SALON });

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

  const {
    setValue: setTarjetaValue,
    getValues: getTarjetaValues,
    watch: watchTarjeta,
    trigger: triggerTarjeta,
    control: tarjetaControl,
    reset: resetTarjeta,
    formState: { errors: tarjetaErrors },
  } = useForm<TarjetaFormValues>({
    mode: 'onBlur',
    defaultValues: { numeroTarjeta: '', nombreTitular: '', fechaVencimiento: '', cvv: '', mesesMSI: '1' },
  });

  const tarjetaValues = watchTarjeta();

  const [tarjetaGuardadaId, setTarjetaGuardadaId] = useState<string | null>(null);
  /** Solo texto extra de MSI (crédito); marca/banco van en la tarjeta animada */
  const [binAyuda, setBinAyuda] = useState<string | null>(null);
  const [marcaTarjetaDeBin, setMarcaTarjetaDeBin] = useState<string | null>(null);
  const [bancoEmisorDeBin, setBancoEmisorDeBin] = useState<string | null>(null);
  /** crédito / débito según BIN (solo entrada manual; null = sin dato o aún no consultado) */
  const [binTipoTarjeta, setBinTipoTarjeta] = useState<'credito' | 'debito' | null>(null);
  const [enfocadoCvv, setEnfocadoCvv] = useState(false);
  const [savingMetodoPago, setSavingMetodoPago] = useState(false);

  const {
    items: metodosPagoGuardados,
    refresh: refreshMetodosPagoGuardados,
  } = useMetodosPagoUsuario();

  const esTarjeta =
    metodoPago.tipo === 'tarjeta_credito' || metodoPago.tipo === 'tarjeta_debito';
  const esTarjetaCredito = metodoPago.tipo === 'tarjeta_credito';
  /** Paso en el que se ingresan datos de la tarjeta (crédito y débito). */
  const pasoDatosTarjeta = 4;
  /** Último paso antes de confirmar compra. */
  const pasoRevision = esTarjetaCredito ? 6 : 5;

  const metodosPagoGuardadosFiltrados = useMemo(() => {
    const t = metodoPago.tipo;
    if (t === 'tarjeta_credito') {
      return metodosPagoGuardados.filter(
        (m) =>
          m.tipoTarjeta == null ||
          String(m.tipoTarjeta).toLowerCase() === 'credito'
      );
    }
    if (t === 'tarjeta_debito') {
      return metodosPagoGuardados.filter(
        (m) =>
          m.tipoTarjeta == null ||
          String(m.tipoTarjeta).toLowerCase() === 'debito'
      );
    }
    return metodosPagoGuardados;
  }, [metodosPagoGuardados, metodoPago.tipo]);

  useEffect(() => {
    if (
      tarjetaGuardadaId &&
      !metodosPagoGuardadosFiltrados.some((m) => m.id === tarjetaGuardadaId)
    ) {
      setTarjetaGuardadaId(null);
    }
  }, [tarjetaGuardadaId, metodosPagoGuardadosFiltrados]);

  useEffect(() => {
    if (!esTarjeta || paso !== 4) return;
    if (tarjetaGuardadaId !== null) {
      setPaso(3);
    }
  }, [esTarjeta, paso, tarjetaGuardadaId]);
  const totalPasosBarra = esTarjeta ? (esTarjetaCredito ? 5 : 4) : 3;
  /** Número visible del paso (sin el antiguo paso 2). */
  const pasoEnBarra =
    paso === 1 ? 1 : paso === 3 ? 2 : paso === 4 ? 3 : paso === 5 ? (esTarjeta ? 4 : 3) : 5;

  const resumenVenta = useMemo(() => calcularResumenVentaCarrito(items), [items]);
  const { subtotal, total } = resumenVenta;

  useEffect(() => {
    if (cartLoading) return;
    if (items.length === 0 && !compraFinalizadaRef.current) {
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

  useEffect(() => {
    if (!esTarjeta) setTarjetaGuardadaId(null);
  }, [esTarjeta]);

  useEffect(() => {
    if (tarjetaGuardadaId !== null) setEnfocadoCvv(false);
  }, [tarjetaGuardadaId]);

  useEffect(() => {
    if (!esTarjeta) {
      setBinAyuda(null);
      setMarcaTarjetaDeBin(null);
      setBancoEmisorDeBin(null);
      setBinTipoTarjeta(null);
      return;
    }
    // Tras datos de tarjeta, el paso de mensualidad reusa el texto MSI del BIN (no borrar al avanzar del 4 al 5).
    if (esTarjetaCredito && paso === 5) {
      return;
    }
    if (paso !== pasoDatosTarjeta || tarjetaGuardadaId !== null) {
      setBinAyuda(null);
      setMarcaTarjetaDeBin(null);
      setBancoEmisorDeBin(null);
      setBinTipoTarjeta(null);
      return;
    }
    const digits = tarjetaValues.numeroTarjeta.replace(/\D/g, '');
    if (digits.length < 6) {
      setBinAyuda(null);
      setMarcaTarjetaDeBin(null);
      setBancoEmisorDeBin(null);
      setBinTipoTarjeta(null);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const info = await paymentsBinLookup(digits);
          if (!info) {
            setBinAyuda(null);
            setMarcaTarjetaDeBin(null);
            setBancoEmisorDeBin(null);
            setBinTipoTarjeta(null);
            return;
          }
          const marca = marcaDesdeBinInfo(info);
          const banco = bancoEmisorDesdeBinInfo(info);
          setMarcaTarjetaDeBin(marca || null);
          setBancoEmisorDeBin(banco || null);
          setBinTipoTarjeta(tipoTarjetaDesdeBinInfo(info));

          if (!esTarjetaCredito) {
            setBinAyuda(null);
            return;
          }
          let textoMsi: string | null = null;
          if (banco) {
            const msi = await paymentsMsiIndicio(banco);
            if (msi && Object.keys(msi).length > 0) {
              textoMsi = textoHumanoMsiParaUi(msi);
            }
          }
          setBinAyuda(textoMsi);
        } catch {
          setBinAyuda(null);
          setMarcaTarjetaDeBin(null);
          setBancoEmisorDeBin(null);
          setBinTipoTarjeta(null);
        }
      })();
    }, 450);
    return () => window.clearTimeout(t);
  }, [esTarjeta, esTarjetaCredito, paso, pasoDatosTarjeta, tarjetaGuardadaId, tarjetaValues.numeroTarjeta]);

  const bancoEmisorParaTarjeta = useMemo(() => {
    if (tarjetaGuardadaId) {
      const m = metodosPagoGuardadosFiltrados.find((x) => x.id === tarjetaGuardadaId);
      const n = (m?.bancoNombre ?? '').trim();
      return n || undefined;
    }
    const b = (bancoEmisorDeBin ?? '').trim();
    return b || undefined;
  }, [tarjetaGuardadaId, metodosPagoGuardadosFiltrados, bancoEmisorDeBin]);

  const marcaParaTarjeta = useMemo(() => {
    if (tarjetaGuardadaId) {
      const m = metodosPagoGuardadosFiltrados.find((x) => x.id === tarjetaGuardadaId);
      const s = (m?.marca ?? '').trim();
      return s || undefined;
    }
    const s = (marcaTarjetaDeBin ?? '').trim();
    return s || undefined;
  }, [tarjetaGuardadaId, metodosPagoGuardadosFiltrados, marcaTarjetaDeBin]);

  const metodosPagoOpciones = [
    { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
    { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  ];

  const etiquetaMetodoPago = () =>
    formaPago === 'salon'
      ? 'Pagas al recoger, en el salón'
      : esTarjetaCredito
        ? 'En línea, con tarjeta de crédito'
        : 'En línea, con tarjeta de débito';

  const elegirFormaPago = (forma: 'linea' | 'salon') => {
    setFormaPago(forma);
    setTarjetaGuardadaId(null);
    setMetodoPago({ tipo: forma === 'salon' ? METODO_PAGO_EN_SALON : '' });
    setSubmitError(null);
  };

  /** Tarjeta guardada (con tipo conocido) o BIN manual debe coincidir con tarjeta_credito / tarjeta_debito del paso 3. */
  const coherenciaTipoTarjetaMensaje = (): string | null => {
    if (!esTarjeta) return null;
    if (tarjetaGuardadaId !== null) {
      const m = metodosPagoGuardadosFiltrados.find((x) => x.id === tarjetaGuardadaId);
      const tt = m?.tipoTarjeta;
      if (tt == null) return null;
      const t = String(tt).toLowerCase();
      if (t !== 'credito' && t !== 'debito') return null;
      if (metodoPago.tipo === 'tarjeta_credito' && t === 'debito') {
        return 'La tarjeta guardada es de débito. En forma de pago elige «Tarjeta de débito» o selecciona otra tarjeta.';
      }
      if (metodoPago.tipo === 'tarjeta_debito' && t === 'credito') {
        return 'La tarjeta guardada es de crédito. En forma de pago elige «Tarjeta de crédito» o selecciona otra tarjeta.';
      }
      return null;
    }
    const digits = getTarjetaValues('numeroTarjeta').replace(/\D/g, '');
    if (digits.length < 6) return null;
    if (!binTipoTarjeta) return null;
    if (metodoPago.tipo === 'tarjeta_credito' && binTipoTarjeta === 'debito') {
      return 'Este número corresponde a una tarjeta de débito. En forma de pago elige «Tarjeta de débito» o ingresa un número de tarjeta de crédito.';
    }
    if (metodoPago.tipo === 'tarjeta_debito' && binTipoTarjeta === 'credito') {
      return 'Este número corresponde a una tarjeta de crédito. En forma de pago elige «Tarjeta de crédito» o ingresa un número de tarjeta de débito.';
    }
    return null;
  };

  const validarPaso3 = (): boolean => {
    if (formaPago === 'linea' && !esTarjeta) {
      setSubmitError('Para pagar en línea, elige tarjeta de crédito, de débito o una tarjeta guardada.');
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
    try {
      let notasCliente = construirNotasClienteVenta({
        telefono: getContactoValues('telefono'),
        nombreContacto: getContactoValues('nombre'),
        apellidosContacto: getContactoValues('apellidos'),
        esTarjeta,
        mesesMSI: esTarjetaCredito ? getTarjetaValues('mesesMSI') : '1',
        solicitaFactura,
        rfcFactura: solicitaFactura ? getContactoValues('rfcFactura') : undefined,
      });
      if (esTarjeta) {
        const tipoTxt =
          metodoPago.tipo === 'tarjeta_credito'
            ? 'Tarjeta de crédito'
            : 'Tarjeta de débito';
        notasCliente = notasCliente ? `${notasCliente} — ${tipoTxt}` : tipoTxt;
      }
      if (tarjetaGuardadaId) {
        const extra = `Tarjeta guardada (método): ${tarjetaGuardadaId}`;
        notasCliente = notasCliente ? `${notasCliente} — ${extra}` : extra;
      }
      // Se recoge en el salón: el pedido no lleva dirección ni costo de envío. Con pago al recoger
      // queda apartado (pendiente_pago con método pago_en_salon) hasta que se cobra al entregarlo.
      const pedido = await crearPedido({
        estado: 'pendiente_pago' as EstadoPedidoUi,
        moneda: 'MXN',
        notasCliente,
        metodoPago: formaPago === 'salon' ? METODO_PAGO_EN_SALON : mapMetodoCheckout(metodoPago.tipo),
        items: items.map((item) => ({
          cantidad: item.cantidad,
          productoId: item.productoId,
          presentacionId: item.presentacionId,
        })),
      });
      // El servidor descuenta stock al crear el pedido; refrescar catálogos abiertos.
      emitCatalogStockChanged();

      // Oculto hasta integrar pasarela (Mercado Pago). No borrar.
      // POST /api/pagos ahora es solo-staff (caja:escritura) — el cliente ya no crea su propio
      // Pago aquí. Sin pasarela, el registro de pago lo hace quien cobra en el salón al recoger.
      // if (metodoPago.tipo) {
      //   await crearPago({
      //     pedidoId: pedido.id,
      //     monto: pedido.total,
      //     moneda: pedido.moneda || 'MXN',
      //     metodo: mapMetodoCheckout(metodoPago.tipo),
      //     estado: 'pendiente',
      //     intentoNumero: 1,
      //   });
      // }

      compraFinalizadaRef.current = true;
      await clearCart();
      const q =
        esTarjeta
          ? `pedidoId=${pedido.id}&pago=tarjeta`
          : `pedidoId=${pedido.id}`;
      router.push(`/cliente/tienda-online/confirmacion?${q}`);
    } catch (e) {
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

  const guardarTarjetaManualEnPerfil = async (): Promise<string> => {
    const num = getTarjetaValues('numeroTarjeta').replace(/\D/g, '');
    if (num.length !== 16) {
      throw new Error('Número de tarjeta incompleto para guardado.');
    }
    const ult4 = num.slice(-4);
    const [mmRaw, yyRaw] = getTarjetaValues('fechaVencimiento').split('/');
    const mm = parseInt(mmRaw || '', 10);
    const yy = parseInt(yyRaw || '', 10);
    const expMes = Number.isFinite(mm) ? mm : undefined;
    const expAnio = Number.isFinite(yy) ? 2000 + yy : undefined;

    const marca = (marcaParaTarjeta ?? '').trim().toLowerCase() || undefined;
    const bancoNombre = (bancoEmisorParaTarjeta ?? '').trim() || undefined;
    const tipoTarjeta = esTarjetaCredito ? 'credito' : 'debito';
    const idExterno = `checkout-${Date.now()}-${ult4}`;

    const nuevo = await crearMetodoPagoUsuario({
      proveedor: 'checkout_manual',
      idExterno,
      ultimos4: ult4,
      marca,
      bancoNombre,
      expMes,
      expAnio,
      tipoTarjeta,
      esPredeterminada: metodosPagoGuardados.length === 0,
    });
    await refreshMetodosPagoGuardados();
    return nuevo.id;
  };

  const manejarSiguiente = async () => {
    setSubmitError(null);
    if (paso === 1) {
      setPaso(3);
      return;
    }
    if (paso === 3) {
      if (!validarPaso3()) return;
      if (metodoPago.tipo === 'tarjeta_credito' || metodoPago.tipo === 'tarjeta_debito') {
        if (tarjetaGuardadaId !== null) {
          setPaso(5);
        } else {
          setPaso(4);
        }
      } else {
        setPaso(5);
      }
      return;
    }
    if (paso === 4 && esTarjeta) {
      const coh = coherenciaTipoTarjetaMensaje();
      if (coh) { setSubmitError(coh); return; }
      if (tarjetaGuardadaId === null) {
        if (!(await triggerTarjeta(['numeroTarjeta', 'nombreTitular', 'fechaVencimiento', 'cvv']))) {
          setSubmitError('Revisa los datos de la tarjeta antes de continuar.');
          return;
        }
        setSavingMetodoPago(true);
        try {
          const nuevoId = await guardarTarjetaManualEnPerfil();
          setTarjetaGuardadaId(nuevoId);
          resetTarjeta({ numeroTarjeta: '', nombreTitular: '', fechaVencimiento: '', cvv: '', mesesMSI: getTarjetaValues('mesesMSI') });
          setPaso(3);
          setSubmitError(null);
          showToast('Tarjeta guardada y seleccionada para este checkout.', 'success');
          return;
        } catch (e) {
          const msg = mensajeUsuarioDesdeErrorApi(e);
          setSubmitError(msg || 'No se pudo guardar la tarjeta.');
          return;
        } finally {
          setSavingMetodoPago(false);
        }
      }
      setPaso(5);
      return;
    }
    if (paso === 5 && esTarjetaCredito) {
      if (!(await triggerTarjeta(['mesesMSI']))) {
        setSubmitError('Elige la mensualidad o meses sin intereses antes de continuar.');
        return;
      }
      setPaso(6);
      return;
    }
    if (paso === pasoRevision) {
      await ejecutarCompra();
    }
  };

  const manejarAnterior = () => {
    setSubmitError(null);
    if (paso === pasoRevision) {
      if (esTarjetaCredito) {
        setPaso(5);
      } else if (esTarjeta) {
        if (tarjetaGuardadaId !== null) setPaso(3);
        else setPaso(4);
      } else {
        setPaso(3);
      }
      return;
    }
    if (esTarjetaCredito && paso === 5) {
      if (tarjetaGuardadaId !== null) setPaso(3);
      else setPaso(4);
      return;
    }
    if (paso === 4 && esTarjeta) {
      setPaso(3);
      return;
    }
    if (paso === 3) {
      setPaso(1);
    }
  };

  const etiquetasBarra = !esTarjeta
    ? ['Recoger en el salón', 'Forma de pago', 'Revisa y confirma']
    : esTarjetaCredito
      ? ['Recoger en el salón', 'Forma de pago', 'Datos de la tarjeta', 'Mensualidad', 'Revisa y confirma']
      : ['Recoger en el salón', 'Forma de pago', 'Datos de la tarjeta', 'Revisa y confirma'];

  if (cartLoading || items.length === 0) {
    return (
      <ModuleLayout>
        <div className="w-full max-w-none py-12 text-center">
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
        <div className="w-full max-w-none py-12 text-center">
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Redirigiendo al inicio de sesión para completar tu compra…
          </p>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <div className="w-full max-w-none">
        <PageHeader
          title="Checkout"
          subtitle="Sigue los pasos para completar tu compra"
        />

        {submitError && (
          <Card className="mb-4 p-4" style={{ borderColor: 'var(--danger)' }}>
            <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>
              {submitError}
            </p>
          </Card>
        )}

        {/* Pasos con nombre (antes solo números); en móvil el texto de abajo dice cuál es y cuántos faltan */}
        <PasosFlujo pasos={etiquetasBarra.slice(0, totalPasosBarra)} actual={pasoEnBarra - 1} etiqueta="Pasos de la compra" />
        <p className="-mt-5 mb-6 text-sm sm:hidden" style={{ color: 'var(--encabezados-alterno)' }}>
          Paso <span className="mf-cifras">{pasoEnBarra} de {totalPasosBarra}</span>
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

            {paso === 3 && (
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

                {formaPago === 'salon' && (
                  <p
                    className="text-sm mt-5 rounded-lg px-4 py-3"
                    style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--encabezados-alterno)' }}
                  >
                    Tu pedido queda apartado. Pagas{' '}
                    <strong className="mf-cifras" style={{ color: 'var(--menu-texto-principal)' }}>
                      {formatearPrecioMXN(total)}
                    </strong>{' '}
                    en el mostrador cuando pases por él.
                  </p>
                )}

                {formaPago === 'linea' && (
                  <div
                    className="mt-6 pt-5 border-t"
                    style={{ borderColor: 'var(--fondos-suaves)' }}
                    role="radiogroup"
                    aria-labelledby="titulo-tarjeta"
                  >
                    <h3 id="titulo-tarjeta" className="text-subtitle mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                      Tarjeta
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                      Con crédito, primero ingresas los datos de la tarjeta (así te orientamos sobre meses sin intereses
                      según el banco) y después eliges la mensualidad.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {metodosPagoOpciones.map((opt) => {
                        const elegida = metodoPago.tipo === opt.value && tarjetaGuardadaId === null;
                        return (
                          <label
                            key={opt.value}
                            className="flex items-center gap-3 min-h-11 px-4 py-3 rounded-lg border-2 cursor-pointer transition-[border-color] duration-200"
                            style={{
                              backgroundColor: 'var(--superficie-elevada)',
                              borderColor: elegida ? 'var(--checkout-entrega-borde-seleccion)' : 'var(--fondos-suaves)',
                            }}
                          >
                            <input
                              type="radio"
                              name="metodoPagoTipo"
                              value={opt.value}
                              checked={elegida}
                              onChange={() => {
                                setMetodoPago({ tipo: opt.value });
                                setTarjetaGuardadaId(null);
                                if (opt.value === 'tarjeta_debito') setTarjetaValue('mesesMSI', '1');
                              }}
                              className="w-4 h-4 shrink-0"
                              style={{ accentColor: 'var(--botones-principales)' }}
                            />
                            <span style={{ color: 'var(--menu-texto-principal)' }}>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {metodosPagoGuardados.length > 0 && (
                      <div className="mt-5">
                        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                          O usa una tarjeta guardada
                        </p>
                        <div className="space-y-2">
                          {metodosPagoGuardados.map((sel) => {
                            const marca = (sel.marca || 'Tarjeta').trim();
                            const banco = (sel.bancoNombre || '').trim();
                            const ult4 = (sel.ultimos4 || '****').trim();
                            const tipoRaw = String(sel.tipoTarjeta ?? '').toLowerCase();
                            const tipoTxt = tipoRaw === 'debito' ? 'Débito' : 'Crédito';
                            const selected = tarjetaGuardadaId === sel.id;
                            return (
                              <label
                                key={sel.id}
                                className="rounded-xl border-2 px-4 py-3 flex items-center gap-4 cursor-pointer transition-[border-color] duration-200"
                                style={{
                                  backgroundColor: 'var(--superficie-elevada)',
                                  borderColor: selected ? 'var(--checkout-entrega-borde-seleccion)' : 'var(--fondos-suaves)',
                                }}
                              >
                                <input
                                  type="radio"
                                  name="metodoPagoTipo"
                                  checked={selected}
                                  onChange={() => {
                                    setTarjetaGuardadaId(sel.id);
                                    setMetodoPago({ tipo: tipoRaw === 'debito' ? 'tarjeta_debito' : 'tarjeta_credito' });
                                    if (tipoRaw === 'debito') setTarjetaValue('mesesMSI', '1');
                                  }}
                                  className="w-4 h-4 shrink-0"
                                  style={{ accentColor: 'var(--botones-principales)' }}
                                />
                                <span
                                  className="w-11 h-11 rounded-full border inline-flex items-center justify-center text-[10px] font-bold uppercase shrink-0"
                                  style={{ borderColor: 'var(--fondos-suaves)', color: 'var(--menu-texto-principal)' }}
                                >
                                  {marca.slice(0, 4)}
                                </span>
                                <span className="text-sm sm:text-base" style={{ color: 'var(--menu-texto-principal)' }}>
                                  {banco ? `${banco} ` : ''}
                                  {tipoTxt} <span className="mf-cifras">**** {ult4}</span>
                                  {sel.esPredeterminada ? ' (predeterminada)' : ''}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                          Agregar una tarjeta nueva no borra las anteriores; todas quedan guardadas en tu perfil.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {paso === 5 && esTarjetaCredito && (
              <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) both' }}>
                <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Mensualidad a pagar
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                  Elige en cuántos meses sin intereses quieres pagar el total de{' '}
                  <strong style={{ color: 'var(--menu-texto-principal)' }}>
                    ${total.toLocaleString()} MXN
                  </strong>
                  . La confirmación final la hace tu banco al procesar el pago.
                </p>
                {binAyuda ? (
                  <p
                    className="text-xs rounded-md px-3 py-2 mb-4"
                    style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--encabezados-alterno)' }}
                  >
                    {binAyuda}
                  </p>
                ) : (
                  <p className="text-xs mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                    Si tu banco no ofrece meses sin intereses para este pedido, el cargo puede aplicarse en una sola
                    exhibición aunque elijas otra opción aquí.
                  </p>
                )}
                <Select
                  label="Meses sin intereses"
                  options={OPCIONES_MSI}
                  value={tarjetaValues.mesesMSI}
                  error={tarjetaErrors.mesesMSI?.message}
                  onChange={(e) => setTarjetaValue('mesesMSI', e.target.value, { shouldValidate: true })}
                  fullWidth
                />
              </Card>
            )}

            {esTarjeta && paso === pasoDatosTarjeta && (
              <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) both' }}>
                <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  {esTarjetaCredito ? 'Tarjeta de crédito' : 'Tarjeta de débito'}
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
                  La tarjeta se anima al entrar; al escribir el CVC gira para mostrar el reverso. Al continuar se
                  guarda este método en tu perfil (solo últimos 4 y metadatos; nunca PAN/CVV completos). Gestioná métodos en{' '}
                  <Link href="/cliente/tarjetas" className="font-semibold underline" style={{ color: 'var(--checkout-entrega-enlace)' }}>
                    Tarjetas
                  </Link>
                  .
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
                  <CheckoutTarjetaAnimada
                    variant={esTarjetaCredito ? 'credito' : 'debito'}
                    animarEntrada={paso === pasoDatosTarjeta}
                    numeroTarjeta={tarjetaValues.numeroTarjeta}
                    nombreTitular={tarjetaValues.nombreTitular}
                    fechaVencimiento={tarjetaValues.fechaVencimiento}
                    cvv={tarjetaValues.cvv}
                    enfocadoCvv={enfocadoCvv}
                    marcaTarjeta={marcaParaTarjeta}
                    bancoEmisor={bancoEmisorParaTarjeta}
                  />

                  <div className="space-y-4 min-w-0">
                    {coherenciaTipoTarjetaMensaje() && (
                      <p
                        className="text-sm rounded-md px-3 py-2"
                        style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--danger-texto)' }}
                        role="alert"
                      >
                        {coherenciaTipoTarjetaMensaje()}
                      </p>
                    )}

                    {esTarjetaCredito && (
                      <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                        En el siguiente paso elegirás los meses sin intereses, con la información de tu banco cuando
                        esté disponible.
                      </p>
                    )}
                    {esTarjetaCredito === false && (
                      <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                        Con tarjeta de débito el cargo es en una sola exhibición (sin meses sin intereses).
                      </p>
                    )}

                    {binAyuda && esTarjetaCredito && (
                      <p
                        className="text-xs rounded-md px-3 py-2"
                        style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--encabezados-alterno)' }}
                      >
                        {binAyuda}
                      </p>
                    )}
                    <Controller
                      name="numeroTarjeta"
                      control={tarjetaControl}
                      rules={{ validate: (v) => errorNumeroTarjeta(v) ?? true }}
                      render={({ field, fieldState }) => (
                        <Input
                          label="Número de tarjeta"
                          {...field}
                          onChange={(e) => field.onChange(formatearInputNumeroTarjeta(e.target.value))}
                          error={fieldState.error?.message}
                          fullWidth
                          placeholder="0000 0000 0000 0000"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          maxLength={19}
                        />
                      )}
                    />
                    <Controller
                      name="nombreTitular"
                      control={tarjetaControl}
                      rules={{ validate: (v) => errorNombreTitular(v) ?? true }}
                      render={({ field, fieldState }) => (
                        <Input
                          label="Nombre del titular"
                          {...field}
                          onChange={(e) => field.onChange(sanitizarNombreTitular(e.target.value))}
                          error={fieldState.error?.message}
                          fullWidth
                          placeholder="Miguel Angel Perez De La Cruz"
                          autoComplete="cc-name"
                          maxLength={80}
                          spellCheck={false}
                        />
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="fechaVencimiento"
                        control={tarjetaControl}
                        rules={{ validate: (v) => errorVencimiento(v) ?? true }}
                        render={({ field, fieldState }) => (
                          <Input
                            label="Vencimiento"
                            {...field}
                            onChange={(e) => field.onChange(formatearInputVencimiento(e.target.value))}
                            error={fieldState.error?.message}
                            fullWidth
                            placeholder="MM/AA"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            maxLength={5}
                          />
                        )}
                      />
                      <Controller
                        name="cvv"
                        control={tarjetaControl}
                        rules={{ validate: (v) => errorCvv(v) ?? true }}
                        render={({ field, fieldState }) => (
                          <Input
                            label="CVC"
                            type="password"
                            {...field}
                            onChange={(e) => field.onChange(sanitizarCvv(e.target.value))}
                            onFocus={() => setEnfocadoCvv(true)}
                            onBlur={() => { setEnfocadoCvv(false); void field.onBlur(); }}
                            error={fieldState.error?.message}
                            fullWidth
                            placeholder="123"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            maxLength={3}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {paso === pasoRevision && (
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
                        {...regContacto('nombre', { required: 'Indica tu nombre.' })}
                      />
                      <Input
                        label="Apellidos"
                        error={contactoErrors.apellidos?.message}
                        fullWidth
                        {...regContacto('apellidos', { required: 'Indica tus apellidos.' })}
                      />
                    </div>
                    <Input
                      label="Correo"
                      type="email"
                      className="mt-4"
                      error={contactoErrors.email?.message}
                      fullWidth
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
                    {esTarjeta && esTarjetaCredito && (
                      <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        <strong style={{ color: 'var(--menu-texto-principal)' }}>Meses sin intereses:</strong>{' '}
                        {OPCIONES_MSI.find((o) => o.value === tarjetaValues.mesesMSI)?.label ?? tarjetaValues.mesesMSI}
                      </p>
                    )}
                    <p className="text-sm mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      {formaPago === 'salon' ? 'Total a pagar al recoger:' : 'Total a pagar:'}{' '}
                      <strong style={{ color: 'var(--menu-texto-principal)' }}>
                        ${total.toLocaleString()} MXN
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
              <Button fullWidth onClick={() => void manejarSiguiente()} disabled={submitting || savingMetodoPago}>
                <span className="mf-feedback-contenido w-full" data-cambiando={submitting || savingMetodoPago ? 'true' : 'false'}>
                  {(submitting || savingMetodoPago)
                    ? 'Procesando…'
                    : paso === pasoRevision
                      ? 'Finalizar compra'
                      : 'Continuar'}
                </span>
              </Button>
            </div>
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
