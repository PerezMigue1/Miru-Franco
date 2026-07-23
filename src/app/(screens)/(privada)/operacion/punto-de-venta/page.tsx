'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import { listarVentas, crearVenta, cancelarVenta, abrirCorte, type VentaLocalApi } from '../../../../services/pos';
import { getProductosSinRedirigir, type Producto } from '../../../../services/productos';
import { getServicios, type Servicio } from '../../../../services/servicios';
import { listarClientes, type ClienteApi } from '../../../../services/clientes';
import { usePermisos } from '../../../../utils/permisos';
import { etiquetaEstadoVenta, varianteEstadoVenta } from '../../../../utils/estados';
import { generarTicketVentaPdf } from '../../../../utils/ticketVenta';
import { ShoppingCart, Trash2, AlertTriangle, BadgeDollarSign, Download, CheckCircle2 } from 'lucide-react';

interface LineaTicket {
  key: string;
  tipo: 'producto' | 'servicio';
  presentacionId?: number;
  servicioId?: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

function precioNum(p?: string | number | null): number {
  return Number(String(p ?? '').replace(/[^0-9.]/g, '')) || 0;
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function nuevaKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PuntoDeVentaPage() {
  const { tienePermiso } = usePermisos();
  const puedeCorte = tienePermiso('caja:escritura');

  const [catProductos, setCatProductos] = useState<Producto[]>([]);
  const [catServicios, setCatServicios] = useState<Servicio[]>([]);

  const [ventasHoy, setVentasHoy] = useState<VentaLocalApi[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);

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
  const [formDescuento, setFormDescuento] = useState('0');
  const [formNotas, setFormNotas] = useState('');
  const [formRecibido, setFormRecibido] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);
  /** Última venta cobrada — solo para ofrecer "Descargar ticket" justo después de cobrar. */
  const [ultimaVenta, setUltimaVenta] = useState<VentaLocalApi | null>(null);

  // Corte de caja (solo caja:escritura)
  const [isModalCorteOpen, setIsModalCorteOpen] = useState(false);
  const [formCorteEfectivo, setFormCorteEfectivo] = useState('0');
  const [formCorteNotas, setFormCorteNotas] = useState('');
  const [savingCorte, setSavingCorte] = useState(false);
  const [corteError, setCorteError] = useState<string | null>(null);

  // Cancelar venta
  const [isModalCancelarOpen, setIsModalCancelarOpen] = useState(false);
  const [ventaIdCancelando, setVentaIdCancelando] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [savingCancel, setSavingCancel] = useState(false);

  const cargarVentas = useCallback(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    setLoadingVentas(true);
    setErrorVentas(null);
    listarVentas({ desde: hoy, limit: 100 })
      .then(({ data }) => setVentasHoy(data))
      .catch((e) => setErrorVentas(e instanceof Error ? e.message : 'Error al cargar las ventas'))
      .finally(() => setLoadingVentas(false));
  }, []);

  useEffect(() => {
    cargarVentas();
    getProductosSinRedirigir().then(({ data }) => setCatProductos(data)).catch(() => {});
    getServicios().then(({ data }) => setCatServicios(data)).catch(() => {});
  }, [cargarVentas]);

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
        nombre: `${productoSeleccionado.nombre} — ${presentacionSeleccionada.tamaño}`,
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
      }]);
      setSelServicioId(''); setSelCantidad('1');
    }
  };

  const actualizarLinea = (key: string, cambios: Partial<Pick<LineaTicket, 'cantidad' | 'precioUnitario'>>) => {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
  };

  const quitarLinea = (key: string) => {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  };

  const subtotalTicket = lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
  const descuentoNum = Number(formDescuento) || 0;
  const totalTicket = Math.max(0, subtotalTicket - descuentoNum);

  const resetTicket = () => {
    setLineas([]);
    limpiarCliente();
    setFormMetodoPago('efectivo'); setFormDescuento('0'); setFormNotas(''); setFormRecibido('');
    setCobroError(null);
  };

  // Cambio a devolver — solo ayuda visual en pantalla, nunca se envía al backend
  // (VentaLocal no tiene columnas para esto y no se va a migrar por un cálculo de caja).
  const recibidoNum = Number(formRecibido) || 0;
  const cambio = recibidoNum - totalTicket;

  const handleCobrar = async () => {
    if (lineas.length === 0) { setCobroError('Agrega al menos un producto o servicio al ticket'); return; }
    setCobrando(true); setCobroError(null);
    try {
      const venta = await crearVenta({
        items: lineas.map((l) => ({
          ...(l.tipo === 'producto' ? { presentacionId: l.presentacionId } : { servicioId: l.servicioId }),
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
        })),
        metodoPago: formMetodoPago,
        clienteId: formClienteId || undefined,
        descuento: descuentoNum || undefined,
        notas: formNotas.trim() || undefined,
      });
      setUltimaVenta(venta);
      resetTicket();
      cargarVentas();
    } catch (e) {
      setCobroError(e instanceof Error ? e.message : 'No se pudo procesar la venta');
    } finally {
      setCobrando(false);
    }
  };

  const handleAbrirCorte = async () => {
    setSavingCorte(true); setCorteError(null);
    try {
      await abrirCorte({ efectivoInicial: Number(formCorteEfectivo) || 0, notas: formCorteNotas.trim() || undefined });
      setIsModalCorteOpen(false); setFormCorteEfectivo('0'); setFormCorteNotas('');
    } catch (e) {
      setCorteError(e instanceof Error ? e.message : 'Error al abrir corte');
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

  return (
    <OperacionLayout permisoRequerido="ventas:escritura">
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Punto de venta
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Un solo ticket para productos y servicios
            </p>
          </div>
          {puedeCorte && (
            <Button
              variant="outline"
              onClick={() => { setCorteError(null); setFormCorteEfectivo('0'); setFormCorteNotas(''); setIsModalCorteOpen(true); }}
            >
              Abrir Corte de Caja
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <ShoppingCart size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Ventas de hoy</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loadingVentas ? '…' : ventasHoy.length}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total del día</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{fmtMoneda(totalDia)}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
          {/* Columna izquierda: agregar línea + ticket */}
          <div className="space-y-4">
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Agregar al ticket
              </h2>
              <div className="flex gap-2 mb-4">
                <Button size="sm" variant={tipoLinea === 'producto' ? 'primary' : 'outline'} onClick={() => handleTipoLinea('producto')}>Producto</Button>
                <Button size="sm" variant={tipoLinea === 'servicio' ? 'primary' : 'outline'} onClick={() => handleTipoLinea('servicio')}>Servicio</Button>
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
                        label: `${pr.tamaño} — ${fmtMoneda(precioNum(pr.precio))} (stock: ${pr.stock})`,
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
                  options={[{ value: '', label: 'Seleccionar servicio...' }, ...catServicios.map((s) => ({ value: String(s.id), label: `${s.nombre} — ${fmtMoneda(precioNum(s.precio))}` }))]}
                  fullWidth
                />
              )}

              <div className="mt-3 flex items-end gap-3">
                <Input label="Cantidad" type="number" min={1} value={selCantidad} onChange={(e) => setSelCantidad(e.target.value)} />
                <Button onClick={handleAgregarLinea}>Agregar al ticket</Button>
              </div>
              {lineaError && <p className="text-sm mt-2" style={{ color: 'var(--danger-texto)' }}>{lineaError}</p>}
            </Card>

            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Ticket ({lineas.length} línea{lineas.length === 1 ? '' : 's'})
              </h2>
              {lineas.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--encabezados-alterno)' }}>
                  Agrega productos o servicios arriba para armar el ticket.
                </p>
              ) : (
                <Table headers={['Concepto', 'Cant.', 'P. unitario', 'Subtotal', '']} headerSutil>
                  {lineas.map((l) => {
                    const producto = l.tipo === 'producto' ? catProductos.find((p) => p.presentaciones?.some((pr) => pr.id === l.presentacionId)) : undefined;
                    const presentacion = producto?.presentaciones?.find((pr) => pr.id === l.presentacionId);
                    const excedeStock = presentacion != null && cantidadEnTicket(l.presentacionId as number) > presentacion.stock;
                    return (
                      <TableRow key={l.key}>
                        <TableCell rowPadding="lg">
                          {l.nombre}
                          {excedeStock && (
                            <span className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--warning-texto)' }}>
                              <AlertTriangle size={12} aria-hidden /> Excede el stock disponible ({presentacion?.stock})
                            </span>
                          )}
                        </TableCell>
                        <TableCell rowPadding="lg">
                          <input
                            type="number"
                            min={1}
                            value={l.cantidad}
                            onChange={(e) => actualizarLinea(l.key, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-16 rounded border px-2 py-1 text-sm"
                            style={{ borderColor: 'var(--borde-visible)', backgroundColor: 'var(--fondo-general)', color: 'var(--menu-texto-principal)' }}
                          />
                        </TableCell>
                        <TableCell rowPadding="lg">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={l.precioUnitario}
                            onChange={(e) => actualizarLinea(l.key, { precioUnitario: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-24 rounded border px-2 py-1 text-sm"
                            style={{ borderColor: 'var(--borde-visible)', backgroundColor: 'var(--fondo-general)', color: 'var(--menu-texto-principal)' }}
                          />
                        </TableCell>
                        <TableCell rowPadding="lg" className="font-semibold">{fmtMoneda(l.cantidad * l.precioUnitario)}</TableCell>
                        <TableCell rowPadding="lg">
                          <button onClick={() => quitarLinea(l.key)} aria-label="Quitar línea" style={{ color: 'var(--danger-texto)' }}>
                            <Trash2 size={16} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Table>
              )}
            </Card>
          </div>

          {/* Columna derecha: panel de cobro */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
              Cobrar
            </h2>
            <div className="space-y-4">
              <div className="relative">
                {formClienteId ? (
                  <div>
                    <label className="text-sm font-medium block mb-1" style={{ color: 'var(--menu-texto-principal)' }}>Cliente</label>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--borde-visible)', backgroundColor: 'var(--fondos-suaves)' }}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{formClienteNombre}</span>
                      <button onClick={limpiarCliente} aria-label="Quitar cliente" style={{ color: 'var(--danger-texto)' }}>×</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Input
                      label="Cliente (nombre o teléfono)"
                      value={busquedaCliente}
                      onChange={(e) => { setBusquedaCliente(e.target.value); setMostrarResultadosCliente(true); }}
                      onFocus={() => setMostrarResultadosCliente(true)}
                      placeholder="Buscar por nombre o teléfono... (vacío = Público en general)"
                      fullWidth
                    />
                    {mostrarResultadosCliente && busquedaCliente.trim().length >= 2 && (
                      <div
                        className="absolute z-10 mt-1 w-full rounded-lg border shadow-lg max-h-56 overflow-y-auto"
                        style={{ borderColor: 'var(--borde-visible)', backgroundColor: 'var(--tarjetas-paneles)' }}
                      >
                        {buscandoCliente ? (
                          <p className="text-sm px-3 py-2" style={{ color: 'var(--encabezados-alterno)' }}>Buscando…</p>
                        ) : resultadosCliente.length === 0 ? (
                          <p className="text-sm px-3 py-2" style={{ color: 'var(--encabezados-alterno)' }}>Sin coincidencias.</p>
                        ) : (
                          resultadosCliente.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => seleccionarCliente(c)}
                              className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
                              style={{ color: 'var(--menu-texto-principal)' }}
                            >
                              <span className="font-semibold">{c.nombre || c.email || 'Cliente'}</span>
                              {c.telefono && <span style={{ color: 'var(--encabezados-alterno)' }}> — {c.telefono}</span>}
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
                onChange={(e) => setFormMetodoPago(e.target.value)}
                options={[
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'tarjeta', label: 'Tarjeta' },
                  { value: 'transferencia', label: 'Transferencia' },
                  { value: 'mixto', label: 'Mixto' },
                ]}
                fullWidth
              />
              <Input label="Descuento ($)" type="number" min={0} step={0.01} value={formDescuento} onChange={(e) => setFormDescuento(e.target.value)} fullWidth />
              <Textarea label="Notas" value={formNotas} onChange={(e) => setFormNotas(e.target.value)} placeholder="Observaciones opcionales..." rows={2} fullWidth />

              <div className="pt-3 border-t space-y-1" style={{ borderColor: 'var(--borde-visible)' }}>
                <div className="flex justify-between text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  <span>Subtotal</span><span>{fmtMoneda(subtotalTicket)}</span>
                </div>
                {descuentoNum > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    <span>Descuento</span><span>-{fmtMoneda(descuentoNum)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                  <span>Total</span><span>{fmtMoneda(totalTicket)}</span>
                </div>
              </div>

              {formMetodoPago === 'efectivo' && (
                <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--borde-visible)' }}>
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
                    <div className="flex justify-between text-base font-semibold" style={{ color: cambio < 0 ? 'var(--danger-texto)' : 'var(--menu-texto-principal)' }}>
                      <span>{cambio < 0 ? 'Falta' : 'Cambio'}</span>
                      <span>{fmtMoneda(Math.abs(cambio))}</span>
                    </div>
                  )}
                  <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                    Solo ayuda de caja en pantalla — no se guarda con la venta.
                  </p>
                </div>
              )}

              {cobroError && <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{cobroError}</p>}
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
                <CheckCircle2 size={22} style={{ color: 'var(--boton-acento-bg)' }} />
                <div>
                  <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    Venta {ultimaVenta.folio || `#${ultimaVenta.id}`} registrada
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {fmtMoneda(ultimaVenta.total ?? 0)} — {ultimaVenta.clienteNombre || 'Público en general'}
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
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Ventas de hoy
          </h2>
          {loadingVentas ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando ventas…</p>
          ) : errorVentas ? (
            <div className="text-center py-6">
              <p className="mb-3" style={{ color: 'var(--danger-texto)' }}>{errorVentas}</p>
              <Button variant="outline" onClick={cargarVentas}>Reintentar</Button>
            </div>
          ) : ventasHoy.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay ventas registradas hoy.</p>
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

      {/* Modal: Abrir Corte de Caja */}
      <Modal
        isOpen={isModalCorteOpen}
        onClose={() => { if (!savingCorte) setIsModalCorteOpen(false); }}
        title="Abrir Corte de Caja"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalCorteOpen(false)} disabled={savingCorte}>Cancelar</Button>
            <Button onClick={handleAbrirCorte} disabled={savingCorte}>{savingCorte ? 'Abriendo...' : 'Abrir corte'}</Button>
          </>
        }
      >
        {corteError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{corteError}</p>}
        <div className="space-y-3">
          <Input label="Efectivo inicial ($)" type="number" min={0} step={0.01} value={formCorteEfectivo} onChange={(e) => setFormCorteEfectivo(e.target.value)} fullWidth />
          <Textarea label="Notas" value={formCorteNotas} onChange={(e) => setFormCorteNotas(e.target.value)} placeholder="Observaciones del turno..." rows={2} fullWidth />
        </div>
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
