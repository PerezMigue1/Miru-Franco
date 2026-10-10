'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PanelVerificando from '../../../../components/layouts/PanelVerificando';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import TarjetaKpi from '../../../../components/ui/TarjetaKpi';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import PagoMixtoCampos from '../../../../components/operacion/PagoMixtoCampos';
import { listarVentas, crearVenta, cancelarVenta, abrirCorte, resumenCorteTexto, type CorteApi, type VentaLocalApi } from '../../../../services/pos';
import ResumenCorteCaja from '../../../../components/operacion/ResumenCorteCaja';
import { citasPorCobrarPaginado, personalQueAtiende, type CitaApi, type PersonaPersonal } from '../../../../services/citas';
import { showToast } from '../../../../utils/toast';
import { getProductosSinRedirigir, type Producto } from '../../../../services/productos';
import { getServicios, type Servicio } from '../../../../services/servicios';
import { listarClientes, type ClienteApi } from '../../../../services/clientes';
import { usePermisos } from '../../../../utils/permisos';
import { etiquetaEstadoVenta, varianteEstadoVenta } from '../../../../utils/estados';
import { generarTicketVentaPdf } from '../../../../utils/ticketVenta';
import { fmtMoneda, itemsDeVenta, pagosMixtos, totalesTicket, validarCobro, type LineaCobro, type MontosMixtos } from '../../../../utils/cobroPos';
import { ShoppingCart, Trash2, AlertTriangle, BadgeDollarSign, Download, CheckCircle2, Check, X, Scissors, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { hoyEnMexico } from '../../../../utils/fechaSoloDia';

interface LineaTicket extends LineaCobro {
  key: string;
  nombre: string;
  /** Solo líneas de cita: quién la atendió (participa siempre; lo agrega el backend). */
  especialistaId?: string;
  especialistaNombre?: string | null;
  clienteNombre?: string | null;
}

function precioNum(p?: string | number | null): number {
  return Number(String(p ?? '').replace(/[^0-9.]/g, '')) || 0;
}

function nuevaKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function horaCorta(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function lineaDeCita(c: CitaApi, servicios: Servicio[]): LineaTicket {
  const servicio = servicios.find((s) => Number(s.id) === c.servicioId);
  return {
    key: `cita-${c.id}`,
    tipo: 'servicio',
    servicioId: c.servicioId,
    nombre: servicio?.nombre ?? c.servicioNombre ?? 'Servicio',
    cantidad: 1,
    precioUnitario: precioNum(servicio?.precio),
    citaId: c.id,
    participantes: [],
    // Anticipo ya pagado (en línea o en el salón): se descuenta del saldo; el backend lo recalcula.
    anticipo: c.anticipoPagado ?? 0,
    especialistaId: c.especialistaId,
    especialistaNombre: c.especialistaNombre,
    clienteNombre: c.clienteNombre,
  };
}

const POR_COBRAR_POR_PAGINA = 20;

const CLASE_CAMPO_CORTO ='w-16 rounded border border-[var(--borde-visible)] bg-fondo-general px-2 py-1 text-sm text-menu-texto-principal disabled:opacity-60';

export default function PuntoDeVentaPage() {
  return (
    <Suspense fallback={<PanelVerificando detalle="Cargando punto de venta" />}>
      <PuntoDeVenta />
    </Suspense>
  );
}

function PuntoDeVenta() {
  const { tienePermiso } = usePermisos();
  const puedeCorte = tienePermiso('caja:escritura');
  // ?citaId= llega desde "Finalizar" en ejecución de servicios o en la cola de atención.
  const citaInicial = Number(useSearchParams().get('citaId')) || null;
  const router = useRouter();

  const [catProductos, setCatProductos] = useState<Producto[]>([]);
  const [catServicios, setCatServicios] = useState<Servicio[]>([]);
  const [personal, setPersonal] = useState<PersonaPersonal[]>([]);

  const [ventasHoy, setVentasHoy] = useState<VentaLocalApi[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);

  // Servicios finalizados que todavía no se cobran
  const [porCobrar, setPorCobrar] = useState<CitaApi[]>([]);
  const [cargandoPorCobrar, setCargandoPorCobrar] = useState(true);
  const [errorPorCobrar, setErrorPorCobrar] = useState<string | null>(null);
  const [paginaPorCobrar, setPaginaPorCobrar] = useState(1);
  const [totalPorCobrar, setTotalPorCobrar] = useState(0);
  const [totalPaginasPorCobrar, setTotalPaginasPorCobrar] = useState(1);
  const [avisoCita, setAvisoCita] = useState<string | null>(null);

  // Ticket en construcción
  const [lineas, setLineas] = useState<LineaTicket[]>([]);
  const [tipoLinea, setTipoLinea] = useState<'producto' | 'servicio'>('producto');
  const [selProductoId, setSelProductoId] = useState('');
  const [selPresentacionId, setSelPresentacionId] = useState('');
  const [selServicioId, setSelServicioId] = useState('');
  const [selCantidad, setSelCantidad] = useState('1');
  const [lineaError, setLineaError] = useState<string | null>(null);

  // Panel de cobro — cliente (buscador por nombre o teléfono, con debounce)
  const [formClienteId, setFormClienteId] = useState('');
  const [formClienteNombre, setFormClienteNombre] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [resultadosCliente, setResultadosCliente] = useState<ClienteApi[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [mostrarResultadosCliente, setMostrarResultadosCliente] = useState(false);
  const [formMetodoPago, setFormMetodoPago] = useState('efectivo');
  const [formPagos, setFormPagos] = useState<MontosMixtos>({});
  const [formDescuento, setFormDescuento] = useState('0');
  const [formMotivoDescuento, setFormMotivoDescuento] = useState('');
  const [formNotas, setFormNotas] = useState('');
  const [formRecibido, setFormRecibido] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);
  /** Última venta cobrada — solo para ofrecer "Descargar ticket" justo después de cobrar. */
  const [ultimaVenta, setUltimaVenta] = useState<VentaLocalApi | null>(null);

  // Corte de caja (solo caja:escritura)
  const [isModalCorteOpen, setIsModalCorteOpen] = useState(false);
  const [formCorteEfectivo, setFormCorteEfectivo] = useState('0');
  const [formCorteEfectivoFinal, setFormCorteEfectivoFinal] = useState('');
  const [formCorteNotas, setFormCorteNotas] = useState('');
  const [savingCorte, setSavingCorte] = useState(false);
  const [corteError, setCorteError] = useState<string | null>(null);
  // Corte recién registrado: el modal muestra su cuenta del efectivo y las salidas.
  const [corteRegistrado, setCorteRegistrado] = useState<CorteApi | null>(null);

  // Cancelar venta
  const [isModalCancelarOpen, setIsModalCancelarOpen] = useState(false);
  const [ventaIdCancelando, setVentaIdCancelando] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [savingCancel, setSavingCancel] = useState(false);

  const cargarVentas = useCallback(() => {
    const hoy = hoyEnMexico();
    setLoadingVentas(true);
    setErrorVentas(null);
    listarVentas({ desde: hoy, limit: 100 })
      .then(({ data }) => setVentasHoy(data))
      .catch((e) => setErrorVentas(e instanceof Error ? e.message : 'Error al cargar las ventas'))
      .finally(() => setLoadingVentas(false));
  }, []);

  /**
   * Recarga una página de servicios por cobrar. Si quedó vacía (se cobró lo último de esa página),
   * retrocede una página. No toca el ticket: sus citas pueden estar en otra página.
   */
  const cargarPorCobrar = useCallback((pagina: number) => {
    setCargandoPorCobrar(true);
    setErrorPorCobrar(null);
    return citasPorCobrarPaginado({ page: pagina, limit: POR_COBRAR_POR_PAGINA })
      .then((r) => {
        if (r.data.length === 0 && pagina > 1) {
          setPaginaPorCobrar(Math.max(1, Math.min(pagina - 1, r.totalPages)));
          return;
        }
        setPorCobrar(r.data);
        setTotalPorCobrar(r.count);
        setTotalPaginasPorCobrar(r.totalPages);
      })
      .catch((e) => {
        setErrorPorCobrar(e instanceof Error ? e.message : 'No se pudieron cargar los servicios por cobrar');
      })
      .finally(() => setCargandoPorCobrar(false));
  }, []);

  useEffect(() => {
    cargarPorCobrar(paginaPorCobrar);
  }, [cargarPorCobrar, paginaPorCobrar]);

  /** Saca del ticket las citas que ya no están por cobrar (otra caja las cobró), revisando cada una con ?citaId=. */
  const quitarCitasYaCobradas = useCallback(async (ids: number[]) => {
    const sigue = await Promise.all(
      ids.map((id) =>
        citasPorCobrarPaginado({ citaId: id })
          .then((r) => r.data.some((c) => c.id === id))
          // Si no se pudo revisar, se queda en el ticket: el backend rechaza cobrarla dos veces.
          .catch(() => true),
      ),
    );
    const cobradas = new Set(ids.filter((_, i) => !sigue[i]));
    if (cobradas.size > 0) setLineas((prev) => prev.filter((l) => !l.citaId || !cobradas.has(l.citaId)));
  }, []);

  const citaIdsEnTicket = lineas.map((l) => l.citaId).filter((id): id is number => Boolean(id));

  const refrescarPorCobrar = () => {
    cargarPorCobrar(paginaPorCobrar);
    if (citaIdsEnTicket.length > 0) quitarCitasYaCobradas(citaIdsEnTicket);
  };

  const agregarCita = useCallback((c: CitaApi, servicios: Servicio[]) => {
    setLineas((prev) => (prev.some((l) => l.citaId === c.id) ? prev : [...prev, lineaDeCita(c, servicios)]));
    // La clienta registrada de la cita queda como clienta de la venta si aún no hay una.
    if (c.clienteId) {
      setFormClienteId((prev) => prev || (c.clienteId as string));
      setFormClienteNombre((prev) => prev || c.clienteNombre || 'Clienta');
    }
  }, []);

  useEffect(() => {
    cargarVentas();
    getProductosSinRedirigir().then(({ data }) => setCatProductos(data)).catch(() => {});
    personalQueAtiende().then(setPersonal).catch(() => setPersonal([]));
    // La cita que llega por ?citaId= se busca directo (puede no estar en la primera página).
    const buscarCitaInicial = citaInicial
      ? citasPorCobrarPaginado({ citaId: citaInicial }).then((r) => r.data).catch(() => null)
      : Promise.resolve([] as CitaApi[]);
    Promise.all([getServicios(), buscarCitaInicial]).then(([{ data: servicios }, citas]) => {
      setCatServicios(servicios);
      if (!citaInicial) return;
      const cita = citas?.find((c) => c.id === citaInicial);
      if (cita) agregarCita(cita, servicios);
      else if (citas === null) setAvisoCita(`No se pudo cargar la cita #${citaInicial}. Actualiza los servicios por cobrar e intenta de nuevo.`);
      else setAvisoCita(`La cita #${citaInicial} no está por cobrar: puede que ya se haya cobrado.`);
    });
  }, [cargarVentas, agregarCita, citaInicial]);

  // Buscador de cliente por nombre o teléfono, con debounce — nada de precargar el catálogo completo.
  useEffect(() => {
    const termino = busquedaCliente.trim();
    if (termino.length < 2) {
      setResultadosCliente([]);
      setBuscandoCliente(false);
      return;
    }
    setBuscandoCliente(true);
    const timer = setTimeout(() => {
      listarClientes({ q: termino, limit: 8 })
        .then(({ data }) => setResultadosCliente(data))
        .catch(() => setResultadosCliente([]))
        .finally(() => setBuscandoCliente(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaCliente]);

  const productoSeleccionado = useMemo(
    () => catProductos.find((p) => String(p.id) === selProductoId),
    [catProductos, selProductoId]
  );
  const presentacionSeleccionada = useMemo(
    () => productoSeleccionado?.presentaciones?.find((pr) => String(pr.id) === selPresentacionId),
    [productoSeleccionado, selPresentacionId]
  );

  const seleccionarCliente = (c: ClienteApi) => {
    setFormClienteId(c.id);
    setFormClienteNombre(c.nombre || c.email || c.telefono || 'Cliente');
    setBusquedaCliente('');
    setResultadosCliente([]);
    setMostrarResultadosCliente(false);
  };

  const limpiarCliente = () => {
    setFormClienteId('');
    setFormClienteNombre('');
    setBusquedaCliente('');
  };

  /** Cantidad ya pedida de esta presentación en el ticket actual (para avisar de sobre-stock). */
  const cantidadEnTicket = (presentacionId: number): number =>
    lineas.filter((l) => l.presentacionId === presentacionId).reduce((acc, l) => acc + l.cantidad, 0);

  const handleTipoLinea = (tipo: 'producto' | 'servicio') => {
    setTipoLinea(tipo);
    setSelProductoId(''); setSelPresentacionId(''); setSelServicioId(''); setSelCantidad('1');
    setLineaError(null);
  };

  const handleAgregarLinea = () => {
    setLineaError(null);
    const cantidad = Number(selCantidad);
    if (!cantidad || cantidad < 1) { setLineaError('Cantidad inválida'); return; }

    if (tipoLinea === 'producto') {
      if (!productoSeleccionado) { setLineaError('Selecciona un producto'); return; }
      if (!productoSeleccionado.presentaciones?.length) {
        setLineaError('Este producto no tiene presentaciones disponibles para vender'); return;
      }
      if (!presentacionSeleccionada) { setLineaError('Selecciona la presentación (tamaño)'); return; }

      setLineas((prev) => [...prev, {
        key: nuevaKey(),
        tipo: 'producto',
        presentacionId: presentacionSeleccionada.id,
        nombre: `${productoSeleccionado.nombre} · ${presentacionSeleccionada.tamaño}`,
        cantidad,
        precioUnitario: precioNum(presentacionSeleccionada.precio),
      }]);
      setSelProductoId(''); setSelPresentacionId(''); setSelCantidad('1');
    } else {
      const servicio = catServicios.find((s) => String(s.id) === selServicioId);
      if (!servicio) { setLineaError('Selecciona un servicio'); return; }

      setLineas((prev) => [...prev, {
        key: nuevaKey(),
        tipo: 'servicio',
        servicioId: Number(servicio.id),
        nombre: servicio.nombre,
        cantidad,
        precioUnitario: precioNum(servicio.precio),
        participantes: [],
      }]);
      setSelServicioId(''); setSelCantidad('1');
    }
  };

  const cambiarCantidad = (key: string, cantidad: number) => {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, cantidad } : l)));
  };

  const alternarParticipante = (key: string, usuarioId: string) => {
    setLineas((prev) => prev.map((l) => {
      if (l.key !== key) return l;
      const actuales = l.participantes ?? [];
      return { ...l, participantes: actuales.includes(usuarioId) ? actuales.filter((id) => id !== usuarioId) : [...actuales, usuarioId] };
    }));
  };

  const quitarLinea = (key: string) => {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  };

  const { subtotal: subtotalTicket, descuento: descuentoNum, anticipo: anticipoTicket, total: totalTicket } = totalesTicket(lineas, Number(formDescuento) || 0);

  const resetTicket = () => {
    setLineas([]);
    limpiarCliente();
    setFormMetodoPago('efectivo'); setFormPagos({}); setFormDescuento('0'); setFormMotivoDescuento('');
    setFormNotas(''); setFormRecibido('');
    setCobroError(null);
  };

  // Cambio a devolver — solo ayuda visual en pantalla, nunca se envía al backend
  // (VentaLocal no tiene columnas para esto y no se va a migrar por un cálculo de caja).
  const recibidoNum = Number(formRecibido) || 0;
  const cambio = recibidoNum - totalTicket;

  const handleCobrar = async () => {
    const problema = validarCobro({
      lineas,
      descuento: Number(formDescuento) || 0,
      motivoDescuento: formMotivoDescuento,
      metodoPago: formMetodoPago,
      pagos: formPagos,
    });
    if (problema) { setCobroError(problema); return; }
    setCobrando(true); setCobroError(null);
    try {
      const venta = await crearVenta({
        items: itemsDeVenta(lineas),
        metodoPago: formMetodoPago,
        clienteId: formClienteId || undefined,
        descuento: descuentoNum || undefined,
        motivoDescuento: descuentoNum > 0 ? formMotivoDescuento.trim() : undefined,
        pagos: pagosMixtos(formMetodoPago, formPagos),
        notas: formNotas.trim() || undefined,
      });
      setUltimaVenta(venta);
      resetTicket();
      setAvisoCita(null);
      // Ya cobrada: se quita ?citaId= para que recargar la página no la busque otra vez.
      if (citaInicial) router.replace('/operacion/punto-de-venta');
      cargarVentas();
      // Si la página quedó vacía, cargarPorCobrar retrocede una.
      cargarPorCobrar(paginaPorCobrar);
    } catch (e) {
      setCobroError(e instanceof Error ? e.message : 'No se pudo procesar la venta');
      // Si otra caja ya cobró alguna cita del ticket (el backend responde 409), se refresca la lista y se quita del ticket.
      if (citaIdsEnTicket.length > 0) refrescarPorCobrar();
    } finally {
      setCobrando(false);
    }
  };

  const handleAbrirCorte = async () => {
    setSavingCorte(true); setCorteError(null);
    try {
      if (formCorteEfectivoFinal.trim() === '' || !(Number(formCorteEfectivoFinal) >= 0)) {
        setCorteError('Indica el efectivo contado en caja al cierre.');
        return;
      }
      const corte = await abrirCorte({
        efectivoInicial: Number(formCorteEfectivo) || 0,
        efectivoFinal: Number(formCorteEfectivoFinal),
        notas: formCorteNotas.trim() || undefined,
      });
      setCorteRegistrado(corte); setFormCorteEfectivo('0'); setFormCorteEfectivoFinal(''); setFormCorteNotas('');
      showToast(resumenCorteTexto(corte), 'success', 10000);
    } catch (e) {
      setCorteError(e instanceof Error ? e.message : 'No se pudo registrar el corte');
    } finally {
      setSavingCorte(false);
    }
  };

  const openCancelar = (id: number) => { setVentaIdCancelando(id); setCancelMotivo(''); setIsModalCancelarOpen(true); };

  const handleCancelar = async () => {
    if (!ventaIdCancelando) return;
    setSavingCancel(true);
    try {
      await cancelarVenta(ventaIdCancelando, { motivoCancelacion: cancelMotivo.trim() || 'Cancelada desde punto de venta' });
      setIsModalCancelarOpen(false); setVentaIdCancelando(null);
      cargarVentas();
    } catch {
      // el modal se queda abierto para reintentar
    } finally {
      setSavingCancel(false);
    }
  };

  const totalDia = ventasHoy.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  const citasEnTicket = new Set(citaIdsEnTicket);
  const desdePorCobrar = totalPorCobrar === 0 ? 0 : (paginaPorCobrar - 1) * POR_COBRAR_POR_PAGINA + 1;
  const hastaPorCobrar = Math.min(totalPorCobrar, (paginaPorCobrar - 1) * POR_COBRAR_POR_PAGINA + porCobrar.length);

  return (
    <OperacionLayout permisoRequerido="ventas:escritura">
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-elegant-title text-menu-texto-principal">Punto de venta</h1>
            <p className="mt-1 text-sm text-encabezados-alterno">Un solo ticket para productos y servicios</p>
          </div>
          {puedeCorte && (
            <Button
              variant="outline"
              onClick={() => { setCorteError(null); setCorteRegistrado(null); setFormCorteEfectivo('0'); setFormCorteEfectivoFinal(''); setFormCorteNotas(''); setIsModalCorteOpen(true); }}
            >
              Corte de caja
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <TarjetaKpi icono={ShoppingCart} etiqueta="Ventas de hoy" cargando={loadingVentas} valor={ventasHoy.length} />
          <TarjetaKpi icono={BadgeDollarSign} etiqueta="Total del día" valor={fmtMoneda(totalDia)} />
        </div>

        {avisoCita && (
          <Card variant="elevated" padding="md" role="status">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-start gap-2 text-sm font-medium text-[var(--warning-texto)]">
                <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0" /> {avisoCita}
              </p>
              <button type="button" onClick={() => setAvisoCita(null)} aria-label="Cerrar aviso" className="shrink-0 rounded p-1 text-menu-texto-principal hover:bg-fondos-suaves">
                <X size={16} aria-hidden />
              </button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_380px]">
          {/* Columna izquierda: servicios por cobrar + agregar línea + ticket */}
          <div className="min-w-0 space-y-4">
            <Card variant="elevated" padding="lg">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-menu-texto-principal">
                  Servicios por cobrar{!cargandoPorCobrar && totalPorCobrar > 0 ? ` (${totalPorCobrar})` : ''}
                </h2>
                <Button size="sm" variant="outline" onClick={refrescarPorCobrar} disabled={cargandoPorCobrar} aria-label="Actualizar servicios por cobrar">
                  <RefreshCw size={16} aria-hidden className={cargandoPorCobrar ? 'animate-spin' : undefined} />
                </Button>
              </div>
              {cargandoPorCobrar && porCobrar.length === 0 ? (
                <p className="py-4 text-center text-sm text-encabezados-alterno">Cargando…</p>
              ) : errorPorCobrar ? (
                <p role="alert" className="py-4 text-center text-sm text-[var(--danger-texto)]">{errorPorCobrar}</p>
              ) : porCobrar.length === 0 ? (
                <p className="py-4 text-center text-sm text-encabezados-alterno">No hay servicios finalizados pendientes de cobro.</p>
              ) : (
                <ul className="divide-y divide-[var(--borde-visible)]">
                  {porCobrar.map((c) => {
                    const enTicket = citasEnTicket.has(c.id);
                    return (
                      <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 font-semibold text-menu-texto-principal">
                            {c.clienteNombre || 'Sin nombre'}
                            {c.origen === 'sin_cita' && <Badge variant="default" size="sm">Sin cita</Badge>}
                          </p>
                          <p className="text-sm text-encabezados-alterno">
                            {c.servicioNombre || 'Servicio'} · {c.especialistaNombre || 'Especialista'}
                            {c.horaCheckOut ? ` · terminó ${horaCorta(c.horaCheckOut)}` : ''}
                            {(c.anticipoPagado ?? 0) > 0 ? ` · anticipo ${fmtMoneda(c.anticipoPagado ?? 0)}` : ''}
                          </p>
                        </div>
                        <Button size="sm" variant={enTicket ? 'outline' : 'primary'} disabled={enTicket} onClick={() => agregarCita(c, catServicios)} className="shrink-0 self-start sm:self-auto">
                          {enTicket ? (
                            <span className="inline-flex items-center gap-1.5"><Check size={14} aria-hidden /> En el ticket</span>
                          ) : 'Agregar al ticket'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {totalPaginasPorCobrar > 1 && !errorPorCobrar && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-[var(--fondos-suaves)] pt-4 sm:flex-row">
                  <p className="text-xs text-encabezados-alterno">
                    Mostrando {desdePorCobrar}–{hastaPorCobrar} de {totalPorCobrar}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="inline-flex items-center gap-1"
                      onClick={() => setPaginaPorCobrar((p) => Math.max(1, p - 1))}
                      disabled={paginaPorCobrar <= 1 || cargandoPorCobrar}
                    >
                      <ChevronLeft size={14} aria-hidden /> Anterior
                    </Button>
                    <span className="text-xs text-encabezados-alterno">
                      Página {paginaPorCobrar} de {totalPaginasPorCobrar}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="inline-flex items-center gap-1"
                      onClick={() => setPaginaPorCobrar((p) => Math.min(totalPaginasPorCobrar, p + 1))}
                      disabled={paginaPorCobrar >= totalPaginasPorCobrar || cargandoPorCobrar}
                    >
                      Siguiente <ChevronRight size={14} aria-hidden />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <Card variant="elevated" padding="lg">
              <h2 className="mb-4 text-lg font-semibold text-menu-texto-principal">Agregar al ticket</h2>
              <div className="mb-4 flex gap-2">
                <Button size="sm" variant={tipoLinea === 'producto' ? 'primary' : 'outline'} aria-pressed={tipoLinea === 'producto'} onClick={() => handleTipoLinea('producto')}>Producto</Button>
                <Button size="sm" variant={tipoLinea === 'servicio' ? 'primary' : 'outline'} aria-pressed={tipoLinea === 'servicio'} onClick={() => handleTipoLinea('servicio')}>Servicio</Button>
              </div>

              {tipoLinea === 'producto' ? (
                <div className="space-y-3">
                  <Select
                    label="Producto"
                    value={selProductoId}
                    onChange={(e) => { setSelProductoId(e.target.value); setSelPresentacionId(''); }}
                    options={[{ value: '', label: 'Seleccionar producto...' }, ...catProductos.map((p) => ({ value: String(p.id), label: p.nombre }))]}
                    fullWidth
                  />
                  <Select
                    label="Presentación"
                    value={selPresentacionId}
                    onChange={(e) => setSelPresentacionId(e.target.value)}
                    disabled={!productoSeleccionado}
                    options={[
                      { value: '', label: productoSeleccionado ? 'Seleccionar presentación...' : 'Elige un producto primero' },
                      ...(productoSeleccionado?.presentaciones ?? []).map((pr) => ({
                        value: String(pr.id),
                        label: `${pr.tamaño} · ${fmtMoneda(precioNum(pr.precio))} (stock: ${pr.stock})`,
                      })),
                    ]}
                    fullWidth
                  />
                </div>
              ) : (
                <Select
                  label="Servicio"
                  value={selServicioId}
                  onChange={(e) => setSelServicioId(e.target.value)}
                  helperText="Si el servicio ya se atendió, agrégalo desde Servicios por cobrar para ligarlo a su cita."
                  options={[{ value: '', label: 'Seleccionar servicio...' }, ...catServicios.map((s) => ({ value: String(s.id), label: `${s.nombre} · ${fmtMoneda(precioNum(s.precio))}` }))]}
                  fullWidth
                />
              )}

              <div className="mt-3 flex items-end gap-3">
                <Input label="Cantidad" type="number" min={1} value={selCantidad} onChange={(e) => setSelCantidad(e.target.value)} />
                <Button onClick={handleAgregarLinea}>Agregar al ticket</Button>
              </div>
              {lineaError && <p role="alert" className="mt-2 text-sm text-[var(--danger-texto)]">{lineaError}</p>}
            </Card>

            <Card variant="elevated" padding="lg">
              <h2 className="mb-1 text-lg font-semibold text-menu-texto-principal">
                Ticket ({lineas.length} línea{lineas.length === 1 ? '' : 's'})
              </h2>
              <p className="mb-3 text-xs text-encabezados-alterno">Los precios son los del catálogo. Para ajustarlos usa el descuento con su motivo.</p>
              {lineas.length === 0 ? (
                <p className="py-6 text-center text-sm text-encabezados-alterno">
                  Agrega productos o servicios para armar el ticket.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--borde-visible)]">
                  {lineas.map((l) => {
                    const producto = l.tipo === 'producto' ? catProductos.find((p) => p.presentaciones?.some((pr) => pr.id === l.presentacionId)) : undefined;
                    const presentacion = producto?.presentaciones?.find((pr) => pr.id === l.presentacionId);
                    const excedeStock = presentacion != null && cantidadEnTicket(l.presentacionId as number) > presentacion.stock;
                    const elegibles = personal.filter((p) => p.id !== l.especialistaId);
                    return (
                      <li key={l.key} className="py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 font-medium text-menu-texto-principal">
                              {l.tipo === 'servicio' && <Scissors size={14} aria-hidden className="shrink-0 text-encabezados-alterno" />}
                              {l.nombre}
                            </p>
                            <p className="text-xs text-encabezados-alterno">
                              {fmtMoneda(l.precioUnitario)} c/u
                              {l.citaId ? ` · cita #${l.citaId}${l.clienteNombre ? ` de ${l.clienteNombre}` : ''}` : ''}
                              {l.anticipo ? ` · anticipo pagado ${fmtMoneda(l.anticipo)}` : ''}
                            </p>
                            {excedeStock && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-[var(--warning-texto)]">
                                <AlertTriangle size={12} aria-hidden /> Excede el stock disponible ({presentacion?.stock})
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <label className="sr-only" htmlFor={`cant-${l.key}`}>Cantidad de {l.nombre}</label>
                            <input
                              id={`cant-${l.key}`}
                              type="number"
                              min={1}
                              value={l.cantidad}
                              disabled={!!l.citaId}
                              title={l.citaId ? 'Una cita se cobra una sola vez' : undefined}
                              onChange={(e) => cambiarCantidad(l.key, Math.max(1, Number(e.target.value) || 1))}
                              className={CLASE_CAMPO_CORTO}
                            />
                            <span className="w-24 text-right font-semibold text-menu-texto-principal">{fmtMoneda(l.cantidad * l.precioUnitario)}</span>
                            <button type="button" onClick={() => quitarLinea(l.key)} aria-label={`Quitar ${l.nombre}`} className="rounded p-1 text-[var(--danger-texto)] hover:bg-fondos-suaves">
                              <Trash2 size={16} aria-hidden />
                            </button>
                          </div>
                        </div>
                        {l.tipo === 'servicio' && (l.especialistaNombre || elegibles.length > 0) && (
                          <div className="mt-2">
                            <p className="mb-1.5 text-xs font-medium text-encabezados-alterno">Participaron</p>
                            <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Participantes de ${l.nombre}`}>
                              {l.especialistaNombre && <Badge variant="info" size="sm">{l.especialistaNombre} · atendió</Badge>}
                              {elegibles.map((p) => {
                                const elegido = l.participantes?.includes(p.id) ?? false;
                                return (
                                  <Button key={p.id} size="sm" variant={elegido ? 'primary' : 'outline'} aria-pressed={elegido} onClick={() => alternarParticipante(l.key, p.id)}>
                                    <span className="inline-flex items-center gap-1">{elegido && <Check size={14} aria-hidden />}{p.nombre}</span>
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Columna derecha: panel de cobro */}
          <Card variant="elevated" padding="lg">
            <h2 className="mb-4 text-lg font-semibold text-menu-texto-principal">Cobrar</h2>
            <div className="space-y-4">
              <div className="relative">
                {formClienteId ? (
                  <div>
                    <span className="mb-1 block text-sm font-medium text-menu-texto-principal">Cliente</span>
                    <div className="flex items-center justify-between rounded-lg border border-[var(--borde-visible)] bg-fondos-suaves px-3 py-2">
                      <span className="truncate text-sm font-semibold text-menu-texto-principal">{formClienteNombre}</span>
                      <button type="button" onClick={limpiarCliente} aria-label="Quitar cliente" className="rounded p-1 text-[var(--danger-texto)]">
                        <X size={16} aria-hidden />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Input
                      label="Cliente (nombre o teléfono)"
                      value={busquedaCliente}
                      onChange={(e) => { setBusquedaCliente(e.target.value); setMostrarResultadosCliente(true); }}
                      onFocus={() => setMostrarResultadosCliente(true)}
                      placeholder="Buscar por nombre o teléfono…"
                      helperText="Déjalo vacío para vender a Público en general."
                      fullWidth
                    />
                    {mostrarResultadosCliente && busquedaCliente.trim().length >= 2 && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--borde-visible)] bg-tarjetas-paneles shadow-lg">
                        {buscandoCliente ? (
                          <p className="px-3 py-2 text-sm text-encabezados-alterno">Buscando…</p>
                        ) : resultadosCliente.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-encabezados-alterno">Sin coincidencias.</p>
                        ) : (
                          resultadosCliente.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => seleccionarCliente(c)}
                              className="w-full px-3 py-2 text-left text-sm text-menu-texto-principal hover:bg-fondos-suaves"
                            >
                              <span className="font-semibold">{c.nombre || c.email || 'Cliente'}</span>
                              {c.telefono && <span className="text-encabezados-alterno"> · {c.telefono}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <Select
                label="Método de pago"
                value={formMetodoPago}
                onChange={(e) => { setFormMetodoPago(e.target.value); setCobroError(null); }}
                options={[
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'tarjeta', label: 'Tarjeta' },
                  { value: 'transferencia', label: 'Transferencia' },
                  { value: 'mixto', label: 'Mixto' },
                ]}
                fullWidth
              />
              <Input label="Descuento ($)" type="number" min={0} step={0.01} value={formDescuento} onChange={(e) => { setFormDescuento(e.target.value); setCobroError(null); }} fullWidth />
              {descuentoNum > 0 && (
                <Input
                  label="Motivo del descuento *"
                  value={formMotivoDescuento}
                  maxLength={200}
                  onChange={(e) => { setFormMotivoDescuento(e.target.value); setCobroError(null); }}
                  placeholder="Ej. Clienta frecuente, retoque, promoción…"
                  helperText="Queda registrado en las notas de la venta."
                  fullWidth
                />
              )}
              <Textarea label="Notas" value={formNotas} onChange={(e) => setFormNotas(e.target.value)} placeholder="Observaciones opcionales..." rows={2} fullWidth />

              <div className="space-y-1 border-t border-[var(--borde-visible)] pt-3">
                <div className="flex justify-between text-sm text-encabezados-alterno">
                  <span>Subtotal</span><span>{fmtMoneda(subtotalTicket)}</span>
                </div>
                {descuentoNum > 0 && (
                  <div className="flex justify-between text-sm text-encabezados-alterno">
                    <span>Descuento</span><span>-{fmtMoneda(descuentoNum)}</span>
                  </div>
                )}
                {anticipoTicket > 0 && (
                  <div className="flex justify-between text-sm text-encabezados-alterno">
                    <span>Anticipo</span><span className="mf-cifras">-{fmtMoneda(anticipoTicket)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-menu-texto-principal">
                  <span>{anticipoTicket > 0 ? 'Saldo a pagar' : 'Total'}</span><span className="mf-cifras">{fmtMoneda(totalTicket)}</span>
                </div>
              </div>

              {formMetodoPago === 'mixto' && <PagoMixtoCampos montos={formPagos} onChange={(m) => { setFormPagos(m); setCobroError(null); }} total={totalTicket} />}

              {formMetodoPago === 'efectivo' && (
                <div className="space-y-2 border-t border-[var(--borde-visible)] pt-3">
                  <Input
                    label="Con cuánto paga ($)"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formRecibido}
                    onChange={(e) => setFormRecibido(e.target.value)}
                    placeholder="0.00"
                    fullWidth
                  />
                  {formRecibido !== '' && (
                    <div className={`flex justify-between text-base font-semibold ${cambio < 0 ? 'text-[var(--danger-texto)]' : 'text-menu-texto-principal'}`}>
                      <span>{cambio < 0 ? 'Falta' : 'Cambio'}</span>
                      <span>{fmtMoneda(Math.abs(cambio))}</span>
                    </div>
                  )}
                  <p className="text-xs text-encabezados-alterno">Solo ayuda de caja en pantalla: no se guarda con la venta.</p>
                </div>
              )}

              {cobroError && <p role="alert" className="text-sm font-medium text-[var(--danger-texto)]">{cobroError}</p>}
              <Button fullWidth onClick={handleCobrar} disabled={cobrando || lineas.length === 0}>
                {cobrando ? 'Procesando...' : 'Cobrar'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Aviso post-cobro: ticket listo para descargar */}
        {ultimaVenta && (
          <Card variant="elevated" padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={22} aria-hidden className="text-[var(--boton-acento-bg)]" />
                <div>
                  <p className="font-semibold text-menu-texto-principal">
                    Venta {ultimaVenta.folio || `#${ultimaVenta.id}`} registrada
                  </p>
                  <p className="text-sm text-encabezados-alterno">
                    {fmtMoneda(ultimaVenta.total ?? 0)} · {ultimaVenta.clienteNombre || 'Público en general'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => generarTicketVentaPdf(ultimaVenta)}>
                  <span className="inline-flex items-center gap-1.5"><Download size={14} aria-hidden /> Descargar ticket</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setUltimaVenta(null)}>Cerrar</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Historial del día */}
        <Card variant="elevated" padding="lg">
          <h2 className="mb-4 text-lg font-semibold text-menu-texto-principal">Ventas de hoy</h2>
          {loadingVentas ? (
            <p className="py-6 text-center text-sm text-encabezados-alterno">Cargando ventas…</p>
          ) : errorVentas ? (
            <div className="py-6 text-center">
              <p className="mb-3 text-[var(--danger-texto)]">{errorVentas}</p>
              <Button variant="outline" onClick={cargarVentas}>Reintentar</Button>
            </div>
          ) : ventasHoy.length === 0 ? (
            <p className="py-6 text-center text-sm text-encabezados-alterno">No hay ventas registradas hoy.</p>
          ) : (
            <Table headers={['Folio', 'Cliente', 'Items', 'Método', 'Total', 'Estado', 'Acciones']} headerSutil>
              {ventasHoy.map((v) => (
                <TableRow key={v.id}>
                  <TableCell rowPadding="lg">{v.folio || `#${v.id}`}</TableCell>
                  <TableCell rowPadding="lg">{v.clienteNombre || (v.clienteId ? 'Cliente' : 'Público en general')}</TableCell>
                  <TableCell rowPadding="lg">{v.items.length}</TableCell>
                  <TableCell rowPadding="lg">{v.metodoPago || '-'}</TableCell>
                  <TableCell rowPadding="lg" className="font-semibold">{fmtMoneda(Number(v.total) || 0)}</TableCell>
                  <TableCell rowPadding="lg">
                    <Badge variant={varianteEstadoVenta(v.estado)}>{etiquetaEstadoVenta(v.estado)}</Badge>
                  </TableCell>
                  <TableCell rowPadding="lg">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => generarTicketVentaPdf(v)}>
                        <span className="inline-flex items-center gap-1"><Download size={13} aria-hidden /> Ticket</span>
                      </Button>
                      {v.estado !== 'cancelada' && (
                        <Button size="sm" variant="danger" onClick={() => openCancelar(v.id)}>Cancelar</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
      </div>

      {/* Modal: Corte de caja */}
      <Modal
        isOpen={isModalCorteOpen}
        onClose={() => { if (!savingCorte) setIsModalCorteOpen(false); }}
        title={corteRegistrado ? 'Corte registrado' : 'Corte de caja'}
        size="sm"
        footer={
          corteRegistrado ? (
            <Button onClick={() => setIsModalCorteOpen(false)}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsModalCorteOpen(false)} disabled={savingCorte}>Cancelar</Button>
              <Button onClick={handleAbrirCorte} disabled={savingCorte}>{savingCorte ? 'Registrando…' : 'Registrar corte'}</Button>
            </>
          )
        }
      >
        {corteRegistrado ? (
          <ResumenCorteCaja corte={corteRegistrado} />
        ) : (
          <>
            {corteError && <p className="mb-3 text-sm text-[var(--danger-texto)]">{corteError}</p>}
            <div className="space-y-3">
              <p className="text-sm text-encabezados-alterno">Corte de hoy: suma las ventas pagadas del día (los pagos mixtos se reparten por método) y descuenta las salidas de efectivo (reembolsos). Efectivo esperado = inicial + efectivo cobrado − salidas.</p>
              <Input label="Efectivo inicial ($)" type="number" min={0} step={0.01} value={formCorteEfectivo} onChange={(e) => setFormCorteEfectivo(e.target.value)} fullWidth />
              <Input label="Efectivo contado al cierre ($)" type="number" min={0} step={0.01} inputMode="decimal" required value={formCorteEfectivoFinal} onChange={(e) => setFormCorteEfectivoFinal(e.target.value)} fullWidth />
              <Textarea label="Notas" value={formCorteNotas} onChange={(e) => setFormCorteNotas(e.target.value)} placeholder="Observaciones del turno..." rows={2} fullWidth />
            </div>
          </>
        )}
      </Modal>

      {/* Modal: Cancelar Venta */}
      <Modal
        isOpen={isModalCancelarOpen}
        onClose={() => { if (!savingCancel) { setIsModalCancelarOpen(false); setVentaIdCancelando(null); } }}
        title="Cancelar Venta"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalCancelarOpen(false); setVentaIdCancelando(null); }} disabled={savingCancel}>Volver</Button>
            <Button variant="danger" onClick={handleCancelar} disabled={savingCancel}>{savingCancel ? 'Cancelando...' : 'Cancelar venta'}</Button>
          </>
        }
      >
        <Textarea label="Motivo de cancelación" value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)} placeholder="Describe el motivo (opcional)..." rows={3} fullWidth />
      </Modal>
    </OperacionLayout>
  );
}
