'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import Select from '../../../../../components/ui/Select';
import { useCart } from '../../../../../context/CartContext';
import {
  crearPedido,
  crearPago,
  actualizarPedido,
  type EstadoPedidoUi,
} from '../../../../../services/ecommerce';
import { getMiPerfil } from '../../../../../services/auth';
import {
  listarDireccionesUsuario,
  type DireccionUsuarioDTO,
} from '../../../../../services/perfil';
import { hasValidToken } from '../../../../../utils/security';
import { showAlert, showToast } from '../../../../../utils/toast';
import { readCheckoutDireccionId, clearCheckoutDireccionId } from '../../../../../utils/checkoutDeliveryStorage';
import { mensajeUsuarioDesdeErrorApi } from '../../../../../utils/apiErrorMessage';
import { emitCatalogStockChanged } from '../../../../../utils/catalogStockSync';
import {
  lineaResumenEnvio,
  etiquetaTipoDomicilio,
} from '../../../../../utils/formatDireccionUsuario';
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

/**
 * Dirección del local para retiro en tienda (configurable por entorno).
 * Sin NEXT_PUBLIC_SALON_DIRECCION, nunca se muestra una calle inventada ni un
 * texto de "falta configurar" a la clienta — solo un aviso neutro y honesto.
 */
const DIRECCION_RETIRO_LOCAL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SALON_DIRECCION
    ? process.env.NEXT_PUBLIC_SALON_DIRECCION
    : 'Recoge en el salón — te avisaremos cuando esté listo.';

/**
 * Oculto hasta integrar pasarela (Mercado Pago). No borrar.
 * Sin pasarela no hay envíos — solo recoger en el salón. Anotado `: boolean`
 * a propósito: con el tipo literal `false` (sin anotar), TypeScript trata el
 * bloque JSX de abajo como código inalcanzable y deja de angostar el tipo de
 * `direccionSeleccionada` ahí dentro (falso positivo de compilación).
 */
const MOSTRAR_ENTREGA_DOMICILIO: boolean = false;

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

const RUTA_ELEGIR_DOMICILIO = '/cliente/tienda-online/checkout/elegir-domicilio';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, loading: cartLoading } = useCart();
  /**
   * Crédito: 1–3 → 4 datos tarjeta (BIN / indicio MSI) → 5 mensualidad → 6 revisar.
   * Débito: 1–3 → 4 datos tarjeta → 5 revisar.
   * Sin tarjeta: 1–3 → 5 revisar.
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

  // Oculto hasta integrar pasarela (Mercado Pago). No borrar.
  // Sin pasarela no hay envíos — solo recoger en el salón. Se fija 'retiro' y
  // nunca se deja cambiar (el toggle de domicilio queda oculto más abajo).
  const [tipoEntrega, setTipoEntrega] = useState<'domicilio' | 'retiro'>('retiro');

  const [direcciones, setDirecciones] = useState<DireccionUsuarioDTO[]>([]);
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState('');

  // Oculto hasta integrar pasarela (Mercado Pago). No borrar.
  // Sin pasarela real, el modelo es "paga en el salón al recoger" — no hay selección de
  // método online. Se fija un tipo constante (no tarjeta) para que `esTarjeta`/`esTarjetaCredito`
  // permanezcan en false y el wizard tome exactamente el camino "sin tarjeta" que ya existía.
  const [metodoPago, setMetodoPago] = useState({ tipo: 'pago_en_salon' });

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

  const [cargandoPerfilCheckout, setCargandoPerfilCheckout] = useState(true);
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
  const totalPasosBarra = esTarjeta ? (esTarjetaCredito ? 6 : 5) : 4;
  const pasoEnBarra = !esTarjeta && paso === 5 ? 4 : paso;

  const resumenVenta = useMemo(
    () => calcularResumenVentaCarrito(items, tipoEntrega),
    [items, tipoEntrega]
  );
  const { subtotal, costoEnvio: envio, total } = resumenVenta;

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
        resetContacto({
          nombre: baseNombre.nombre,
          apellidos: apellidosApi && apellidosApi.length > 0 ? apellidosApi : baseNombre.apellidos,
          email: perfil.email ?? '',
          telefono: perfil.telefono ?? '',
          rfcFactura: '',
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

  // Oculto hasta integrar pasarela (Mercado Pago). No borrar.
  // Sin selección de método online, el "método" que ve la clienta es siempre el pago en salón.
  const etiquetaMetodoPago = () => 'Pago en el salón al recoger tu pedido';

  const textoCuandoLlega = () => {
    if (tipoEntrega === 'retiro') {
      return {
        titulo: 'Retiro en la estética',
        texto:
          'Tu pedido estará listo para recoger en el local en aproximadamente 24–48 horas hábiles. Pagas ahí mismo, al recoger. Te avisaremos cuando puedas pasar.',
      };
    }
    return {
      titulo: 'Envío a domicilio',
      texto:
        'Entrega estimada: 3 a 5 días hábiles. El repartidor podrá contactarte al teléfono de tu cuenta.',
    };
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
      const textoDir = textoDireccionPedido();
      let notasCliente = construirNotasClienteVenta({
        telefono: getContactoValues('telefono'),
        nombreContacto: getContactoValues('nombre'),
        apellidosContacto: getContactoValues('apellidos'),
        tipoEntrega,
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
      const dirNota = textoDir.trim();
      if (dirNota) {
        const etiquetaDir = tipoEntrega === 'retiro' ? 'Retiro' : 'Domicilio';
        const dirLine = `${etiquetaDir}: ${dirNota}`;
        notasCliente = notasCliente ? `${notasCliente} — ${dirLine}` : dirLine;
      }

      const pedido = await crearPedido({
        estado: 'pendiente_pago' as EstadoPedidoUi,
        moneda: 'MXN',
        notasCliente,
        metodoPago: metodoPago.tipo ? mapMetodoCheckout(metodoPago.tipo) : undefined,
        direccionEnvioId:
          tipoEntrega === 'domicilio' && direccionSeleccionada ? direccionSeleccionada.id : undefined,
        items: items.map((item) => ({
          cantidad: item.cantidad,
          productoId: item.productoId,
          presentacionId: item.presentacionId,
        })),
      });
      // El servidor descuenta stock al crear el pedido; refrescar catálogos abiertos.
      emitCatalogStockChanged();

      const textoDirLimpio = textoDir.trim();
      if (textoDirLimpio) {
        try {
          await actualizarPedido(pedido.id, { direccionTextoCompleta: textoDirLimpio });
        } catch {
          /* la dirección sigue en notasCliente */
        }
      }

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
      clearCheckoutDireccionId();
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
    if (paso > 1) {
      setPaso(paso - 1);
    }
  };

  const etiquetasBarra = !esTarjeta
    ? ['Entrega', 'Cuándo llegará', 'Pago en el salón', 'Revisa y confirma']
    : esTarjetaCredito
      ? [
          'Entrega',
          'Cuándo llegará',
          'Forma de pago',
          'Datos de la tarjeta',
          'Mensualidad',
          'Revisa y confirma',
        ]
      : [
          'Entrega',
          'Cuándo llegará',
          'Forma de pago',
          'Datos de la tarjeta',
          'Revisa y confirma',
        ];

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
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    pasoEnBarra >= num ? 'ring-2 ring-offset-2 ring-[var(--botones-principales)]' : ''
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
                    className={`w-6 sm:w-12 h-1 transition-all duration-300 ${pasoEnBarra > num ? '' : 'opacity-50'}`}
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
            {/* Oculto hasta integrar pasarela (Mercado Pago). No borrar. */}
            {MOSTRAR_ENTREGA_DOMICILIO && paso === 1 && (
              <div style={{ animation: 'fadeUp 350ms ease-out both' }}>
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

            {/* Sin pasarela no hay envíos — solo recoger en el salón, fijo. */}
            {paso === 1 && (
              <Card style={{ animation: 'fadeUp 350ms ease-out both' }}>
                <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Cómo recoges tu pedido
                </h2>
                <div
                  className="rounded-lg px-4 py-4 mt-4"
                  style={{ backgroundColor: 'var(--fondos-suaves)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                    <strong>Retiras en la estética.</strong>
                  </p>
                  <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--encabezados-alterno)' }}>
                    {DIRECCION_RETIRO_LOCAL}
                  </p>
                </div>
              </Card>
            )}

            {paso === 2 && (
              <Card style={{ animation: 'fadeUp 350ms ease-out both' }}>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  ¿Cuándo llegará?
                </h2>
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
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

            {/* Oculto hasta integrar pasarela (Mercado Pago). No borrar. */}
            {false && paso === 3 && (
              <Card style={{ animation: 'fadeUp 350ms ease-out both' }}>
                <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  ¿Cómo quieres pagar?
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
                  Elige una opción. Con tarjeta de crédito, primero ingresás los datos de la tarjeta (así podemos orientarte sobre meses sin intereses según el banco) y después elegís la mensualidad. Con débito, solo los datos de la tarjeta.
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
                        checked={
                          opt.value === 'tarjeta_credito' || opt.value === 'tarjeta_debito'
                            ? metodoPago.tipo === opt.value && tarjetaGuardadaId === null
                            : metodoPago.tipo === opt.value
                        }
                        onChange={() => {
                          const tipo = opt.value;
                          setMetodoPago({
                            ...metodoPago,
                            tipo,
                          });
                          setTarjetaGuardadaId(null);
                          if (tipo === 'tarjeta_debito') setTarjetaValue('mesesMSI', '1');
                        }}
                      />
                      <span style={{ color: 'var(--menu-texto-principal)' }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
                {(esTarjeta || metodosPagoGuardados.length > 0) && (
                  <div className="mt-4">
                    <div className="space-y-2">
                      {metodosPagoGuardados.length === 0 ? (
                        <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                            No tienes tarjetas guardadas.
                          </p>
                        </div>
                      ) : (
                        metodosPagoGuardados.map((sel) => {
                          const marca = (sel.marca || 'Tarjeta').trim();
                          const banco = (sel.bancoNombre || '').trim();
                          const ult4 = (sel.ultimos4 || '****').trim();
                          const tipoRaw = String(sel.tipoTarjeta ?? '').toLowerCase();
                          const tipoTxt = tipoRaw === 'debito' ? 'Débito' : 'Crédito';
                          const selected = tarjetaGuardadaId === sel.id;
                          return (
                            <label
                              key={sel.id}
                              className="rounded-xl border px-4 py-3 flex items-center gap-4 cursor-pointer"
                              style={{
                                backgroundColor: 'var(--superficie-elevada)',
                                borderColor: selected
                                  ? 'var(--checkout-entrega-borde-seleccion)'
                                  : 'var(--fondos-suaves)',
                              }}
                            >
                              <input
                                type="radio"
                                name="metodoPagoTipo"
                                checked={selected}
                                onChange={() => {
                                  setTarjetaGuardadaId(sel.id);
                                  setMetodoPago((prev) => ({
                                    ...prev,
                                    tipo: tipoRaw === 'debito' ? 'tarjeta_debito' : 'tarjeta_credito',
                                  }));
                                  if (tipoRaw === 'debito') setTarjetaValue('mesesMSI', '1');
                                }}
                              />
                              <span
                                className="w-11 h-11 rounded-full border inline-flex items-center justify-center text-[10px] font-bold uppercase"
                                style={{ borderColor: 'var(--fondos-suaves)', color: 'var(--menu-texto-principal)' }}
                              >
                                {marca.slice(0, 4)}
                              </span>
                              <p className="text-sm sm:text-base" style={{ color: 'var(--menu-texto-principal)' }}>
                                {banco ? `${banco} ` : ''}
                                {tipoTxt} **** {ult4}
                                {sel.esPredeterminada ? ' (predeterminada)' : ''}
                              </p>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      Agregar una tarjeta nueva no borra las anteriores; todas quedan guardadas en tu perfil.
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* Pago en el salón — sin pasarela integrada, el pedido se paga al recogerlo. */}
            {paso === 3 && (
              <Card style={{ animation: 'fadeUp 350ms ease-out both' }}>
                <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  ¿Cómo se paga tu pedido?
                </h2>
                <div
                  className="rounded-lg px-4 py-4"
                  style={{ backgroundColor: 'var(--fondos-suaves)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                    <strong>Pagas en el salón, al recoger tu pedido.</strong>
                  </p>
                  <p className="text-sm mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                    Todavía no aceptamos pagos en línea. Te avisaremos cuando tu pedido esté listo
                    para pasar y pagarlo directamente en la estética.
                  </p>
                </div>
              </Card>
            )}

            {paso === 5 && esTarjetaCredito && (
              <Card style={{ animation: 'fadeUp 350ms ease-out both' }}>
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
              <Card style={{ animation: 'fadeUp 350ms ease-out both' }}>
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
                        style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--danger)' }}
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
              <Card style={{ animation: 'fadeUp 350ms ease-out both' }}>
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
                    {esTarjeta && esTarjetaCredito && (
                      <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        <strong style={{ color: 'var(--menu-texto-principal)' }}>Meses sin intereses:</strong>{' '}
                        {OPCIONES_MSI.find((o) => o.value === tarjetaValues.mesesMSI)?.label ?? tarjetaValues.mesesMSI}
                      </p>
                    )}
                    <p className="text-sm mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      Total a pagar:{' '}
                      <strong style={{ color: 'var(--menu-texto-principal)' }}>
                        ${total.toLocaleString()} MXN
                      </strong>
                    </p>
                    <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      Total estimado en checkout. El total final lo confirma el backend al crear el pedido.
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
                {(submitting || savingMetodoPago)
                  ? 'Procesando…'
                  : paso === pasoRevision
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
                {/* Oculto hasta integrar pasarela (Mercado Pago). No borrar. */}
                {false && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Envío:</span>
                    <span style={{ color: 'var(--menu-texto-principal)' }}>
                      {tipoEntrega === 'retiro' ? '$0' : `$${envio.toLocaleString()}`}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      Total:
                    </span>
                    <span className="text-2xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      ${total.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                    Monto estimado. El pedido creado por API devuelve los importes definitivos.
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
