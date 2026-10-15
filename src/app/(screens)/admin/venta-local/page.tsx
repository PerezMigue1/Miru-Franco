'use client';

import { useState, useEffect } from 'react';
import { listarVentas, crearVenta, cancelarVenta, anularVentaCortada, abrirCorte, resumenCorteTexto, VentaLocalApi, EstadoVentaLocal, type CorteApi } from '../../../services/pos';
import ResumenCorteCaja from '../../../components/operacion/ResumenCorteCaja';
import { showToast } from '../../../utils/toast';
import { getProductosSinRedirigir, type Producto } from '../../../services/productos';
import { listarClientes, type ClienteApi } from '../../../services/clientes';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import TarjetaKpi from '../../../components/ui/TarjetaKpi';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import { getCategoryColor } from '../../../utils/categoryColors';
import { BadgeDollarSign, Receipt, ShoppingCart } from 'lucide-react';
import { hoyEnMexico } from '../../../utils/fechaSoloDia';
import PagoMixtoCampos from '../../../components/operacion/PagoMixtoCampos';
import { itemsDeVenta, pagosMixtos, totalesTicket, validarCobro, type LineaCobro, type MontosMixtos } from '../../../utils/cobroPos';
import { formatearPrecioMXN } from '../../../utils/formatoPrecio';
import { usePermisos } from '../../../utils/permisos';
import {
  accionesDeVenta,
  etiquetaMetodoVenta,
  mensajeErrorAccionVenta,
  presentacionIdDeVenta,
  textoDevolucionFueraDeCaja,
  textoModalAnular,
  textoTotalDelDia,
  totalDelDia,
  ventasPagadasDelDia,
} from './ventasDia';

interface VentaFila {
  id: number;
  clienteId: string | null;
  productos: string;
  total: string;
  metodo: string;
  fecha: string;
  /** Objeto original completo — la fila mapeada resume para la tabla, pero el detalle
   *  (items, descuento, estado) necesita los datos crudos que aquí no se pierden. */
  raw: VentaLocalApi;
}

function mapearVenta(v: VentaLocalApi): VentaFila {
  const itemsDesc = v.items.length > 0 ? `${v.items.length} ítem(s)` : '-';
  return {
    id: v.id,
    clienteId: v.clienteId ?? null,
    productos: itemsDesc,
    total: v.total != null ? `$${v.total.toFixed(2)}` : '-',
    metodo: etiquetaMetodoVenta(v.metodoPago),
    fecha: v.creadoEn ? new Date(v.creadoEn).toLocaleString('es-MX') : '-',
    raw: v,
  };
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ETIQUETA_ESTADO_VENTA: Record<EstadoVentaLocal, string> = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
};

function varianteBadgeEstadoVenta(estado: EstadoVentaLocal): 'success' | 'warning' | 'danger' {
  if (estado === 'pagada') return 'success';
  if (estado === 'cancelada') return 'danger';
  return 'warning';
}

export default function VentaLocalPage() {
  // Anular una venta cortada exige devoluciones:gestionar (misma clave que el backend).
  const { tienePermiso } = usePermisos();
  const [ventasHoy, setVentasHoy] = useState<VentaFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [catProductos, setCatProductos] = useState<Producto[]>([]);
  const [catClientes, setCatClientes] = useState<ClienteApi[]>([]);

  // Formulario nueva venta
  const [formClienteId, setFormClienteId] = useState('');
  const [formProductoId, setFormProductoId] = useState('');
  const [formPresentacionId, setFormPresentacionId] = useState('');
  const [formCantidad, setFormCantidad] = useState('1');
  const [formPrecioUnitario, setFormPrecioUnitario] = useState('');
  const [formMetodoPago, setFormMetodoPago] = useState('efectivo');
  const [formDescuento, setFormDescuento] = useState('0');
  const [formMotivoDescuento, setFormMotivoDescuento] = useState('');
  const [formPagos, setFormPagos] = useState<MontosMixtos>({});
  const [formNotas, setFormNotas] = useState('');
  const [savingVenta, setSavingVenta] = useState(false);
  const [ventaError, setVentaError] = useState<string | null>(null);

  // Modal CorteCaja
  const [isModalCorteOpen, setIsModalCorteOpen] = useState(false);
  const [formCorteEfectivo, setFormCorteEfectivo] = useState('0');
  const [formCorteEfectivoFinal, setFormCorteEfectivoFinal] = useState('');
  const [formCorteNotas, setFormCorteNotas] = useState('');
  const [savingCorte, setSavingCorte] = useState(false);
  const [corteError, setCorteError] = useState<string | null>(null);
  // Corte recién registrado: el modal muestra su cuenta del efectivo y las salidas.
  const [corteRegistrado, setCorteRegistrado] = useState<CorteApi | null>(null);

  // Modal cancelar/anular venta (mismo modal; 'anular' es para ventas que YA entraron a un corte)
  const [isModalCancelarOpen, setIsModalCancelarOpen] = useState(false);
  const [accionVenta, setAccionVenta] = useState<'cancelar' | 'anular'>('cancelar');
  const [ventaIdCancelando, setVentaIdCancelando] = useState<number | null>(null);
  const [cancelMotivoVenta, setCancelMotivoVenta] = useState('');
  const [savingCancelVenta, setSavingCancelVenta] = useState(false);
  const [cancelVentaError, setCancelVentaError] = useState<string | null>(null);

  // Modal Ver Detalles (solo lectura)
  const [ventaDetalle, setVentaDetalle] = useState<VentaFila | null>(null);

  const cargar = () => {
    const hoy = hoyEnMexico();
    setLoading(true);
    listarVentas({ desde: hoy })
      .then(({ data }) => setVentasHoy(data.map(mapearVenta)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    getProductosSinRedirigir().then(({ data }) => setCatProductos(data)).catch(() => {});
    listarClientes().then(({ data }) => setCatClientes(data)).catch(() => {});
  }, []);

  // El precio es el del catálogo (el backend cobra el de la base); solo se muestra.
  const prodVenta = catProductos.find((p) => String(p.id) === formProductoId);
  // Sin presentación (o sin elegirla cuando hay varias) no se arma la línea: nunca se manda el id del producto.
  const presentacionVentaId = presentacionIdDeVenta(prodVenta, formProductoId, formPresentacionId);
  const presentacionesVenta = (prodVenta?.presentaciones ?? []).filter((pr) => pr.id != null);
  const lineasVenta: LineaCobro[] = formProductoId && presentacionVentaId != null && Number(formCantidad) >= 1
    ? [{
        tipo: 'producto',
        presentacionId: presentacionVentaId,
        cantidad: Number(formCantidad),
        precioUnitario: Number(String(formPrecioUnitario).replace(/[^0-9.]/g, '')) || 0,
      }]
    : [];
  const { descuento: descuentoVenta, total: totalVenta } = totalesTicket(lineasVenta, Number(formDescuento) || 0);

  const handleCrearVenta = async () => {
    if (!formProductoId || !formCantidad) {
      setVentaError('Selecciona producto y cantidad'); return;
    }
    if (presentacionVentaId == null) {
      setVentaError(presentacionesVenta.length > 1
        ? 'Elige la presentación del producto.'
        : 'Este producto no tiene presentaciones a la venta.');
      return;
    }
    const problema = validarCobro({ lineas: lineasVenta, descuento: Number(formDescuento) || 0, motivoDescuento: formMotivoDescuento, metodoPago: formMetodoPago, pagos: formPagos });
    if (problema) { setVentaError(problema); return; }
    setSavingVenta(true); setVentaError(null);
    try {
      await crearVenta({
        items: itemsDeVenta(lineasVenta),
        metodoPago: formMetodoPago,
        clienteId: formClienteId || undefined,
        descuento: descuentoVenta || undefined,
        motivoDescuento: descuentoVenta > 0 ? formMotivoDescuento.trim() : undefined,
        pagos: pagosMixtos(formMetodoPago, formPagos),
        notas: formNotas.trim() || undefined,
      });
      setFormProductoId(''); setFormPresentacionId(''); setFormCantidad('1'); setFormPrecioUnitario('');
      setFormClienteId(''); setFormDescuento('0'); setFormMotivoDescuento(''); setFormPagos({}); setFormNotas('');
      cargar();
    } catch (e) { setVentaError(e instanceof Error ? e.message : 'Error al procesar venta'); }
    finally { setSavingVenta(false); }
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
    } catch (e) { setCorteError(e instanceof Error ? e.message : 'No se pudo registrar el corte'); }
    finally { setSavingCorte(false); }
  };

  const openCancelarVenta = (id: number) => { setAccionVenta('cancelar'); setVentaIdCancelando(id); setCancelMotivoVenta(''); setCancelVentaError(null); setIsModalCancelarOpen(true); };
  const openAnularVenta = (id: number) => { setAccionVenta('anular'); setVentaIdCancelando(id); setCancelMotivoVenta(''); setCancelVentaError(null); setIsModalCancelarOpen(true); };

  const handleCancelarVenta = async () => {
    if (!ventaIdCancelando) return;
    // Anular una venta cortada mueve dinero del corte: el motivo es obligatorio.
    if (accionVenta === 'anular' && !cancelMotivoVenta.trim()) {
      setCancelVentaError('Escribe el motivo de la anulación.');
      return;
    }
    setSavingCancelVenta(true);
    setCancelVentaError(null);
    try {
      if (accionVenta === 'anular') {
        await anularVentaCortada(ventaIdCancelando, { motivoCancelacion: cancelMotivoVenta.trim() });
        showToast('Venta anulada: la salida de efectivo se descuenta en el siguiente corte.', 'success', 8000);
      } else {
        await cancelarVenta(ventaIdCancelando, { motivoCancelacion: cancelMotivoVenta.trim() || 'Cancelada desde panel admin' });
      }
      setIsModalCancelarOpen(false); setVentaIdCancelando(null); cargar();
    } catch (e) {
      // El modal se queda abierto con el motivo del rechazo (p. ej. el 409 de quien no opera la caja).
      setCancelVentaError(mensajeErrorAccionVenta(e, accionVenta));
    }
    finally { setSavingCancelVenta(false); }
  };

  const ventaCancelando = ventasHoy.find((v) => v.id === ventaIdCancelando) ?? null;

  const nombreCliente = (clienteId: string | null | undefined): string => {
    if (!clienteId) return 'Cliente general';
    const c = catClientes.find((cl) => cl.id === clienteId);
    return c?.nombre || c?.email || 'Cliente general';
  };

  const nombreProductoPorPresentacion = (presentacionId: number | null | undefined): string => {
    if (presentacionId == null) return 'Servicio';
    for (const p of catProductos) {
      if (p.presentaciones?.some((pr) => pr.id === presentacionId)) return p.nombre;
    }
    return `Presentación #${presentacionId}`;
  };

  const totalDia = totalDelDia(ventasHoy.map((v) => v.raw));

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Venta Local
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {ventasHoy.length} venta{ventasHoy.length === 1 ? '' : 's'} registrada{ventasHoy.length === 1 ? '' : 's'} hoy
            </p>
          </div>
          <Button variant="outline" onClick={() => { setCorteError(null); setCorteRegistrado(null); setFormCorteEfectivo('0'); setFormCorteEfectivoFinal(''); setFormCorteNotas(''); setIsModalCorteOpen(true); }}>Corte de caja</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <TarjetaKpi icono={ShoppingCart} etiqueta="Ventas de hoy (pagadas)" cargando={loading} valor={ventasPagadasDelDia(ventasHoy.map((v) => v.raw))} />
          <TarjetaKpi icono={BadgeDollarSign} etiqueta="Total del día (pagadas)" cargando={loading} valor={textoTotalDelDia(totalDia)} />
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Nueva Venta
          </h2>
          <div className="space-y-4">
            <Select
              label="Cliente"
              value={formClienteId}
              onChange={(e) => setFormClienteId(e.target.value)}
              options={[{ value: '', label: 'Cliente general' }, ...catClientes.map((c) => ({ value: c.id, label: c.nombre ?? c.email ?? c.id }))]}
              fullWidth
            />
            <Select
              label="Producto"
              value={formProductoId}
              onChange={(e) => {
                setFormProductoId(e.target.value);
                const p = catProductos.find((x) => String(x.id) === e.target.value);
                const presentaciones = (p?.presentaciones ?? []).filter((pr) => pr.id != null);
                // Con una sola presentación se usa esa; con varias hay que elegirla.
                const unica = presentaciones.length === 1 ? presentaciones[0] : undefined;
                setFormPresentacionId(unica?.id != null ? String(unica.id) : '');
                setFormPrecioUnitario(unica ? String(unica.precio).replace(/[^0-9.]/g, '') : '');
              }}
              options={[{ value: '', label: 'Seleccionar producto...' }, ...catProductos.map((p) => ({ value: String(p.id), label: `${p.nombre} - ${(p.presentaciones?.length ?? 0) > 1 ? 'desde ' : ''}${formatearPrecioMXN(p.precio)}` }))]}
              fullWidth
            />
            {presentacionesVenta.length > 1 && (
              <Select
                label="Presentación"
                value={formPresentacionId}
                onChange={(e) => {
                  setFormPresentacionId(e.target.value);
                  const pr = presentacionesVenta.find((x) => String(x.id) === e.target.value);
                  setFormPrecioUnitario(pr ? String(pr.precio).replace(/[^0-9.]/g, '') : '');
                }}
                options={[
                  { value: '', label: 'Elige la presentación...' },
                  ...presentacionesVenta.map((pr) => ({ value: String(pr.id), label: `${pr.tamaño} - ${pr.precio} - Stock: ${pr.stock}` })),
                ]}
                fullWidth
              />
            )}
            {prodVenta && presentacionesVenta.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>Este producto no tiene presentaciones a la venta.</p>
            )}
            <Input label="Cantidad" type="number" min={1} step={1} value={formCantidad} onChange={(e) => setFormCantidad(e.target.value)} fullWidth />
            <Input label="Precio unitario" type="number" value={formPrecioUnitario} readOnly helperText="Precio del catálogo. Para ajustarlo usa el descuento con su motivo." placeholder="0.00" fullWidth />
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
            {formMetodoPago === 'mixto' && <PagoMixtoCampos montos={formPagos} onChange={(m) => { setFormPagos(m); setVentaError(null); }} total={totalVenta} />}
            <Input label="Descuento ($)" type="number" min={0} step={0.01} value={formDescuento} onChange={(e) => setFormDescuento(e.target.value)} placeholder="0" fullWidth />
            {descuentoVenta > 0 && (
              <Input label="Motivo del descuento *" value={formMotivoDescuento} maxLength={200} onChange={(e) => setFormMotivoDescuento(e.target.value)} placeholder="Ej. Clienta frecuente, promoción…" fullWidth />
            )}
            <Textarea label="Notas" value={formNotas} onChange={(e) => setFormNotas(e.target.value)} placeholder="Observaciones opcionales..." rows={2} fullWidth />
            {ventaError && <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{ventaError}</p>}
            <Button fullWidth onClick={handleCrearVenta} disabled={savingVenta}>{savingVenta ? 'Procesando...' : 'Procesar Venta'}</Button>
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Productos Disponibles
          </h2>
          <div className="space-y-3">
            {catProductos.slice(0, 10).map((producto) => (
              <div
                key={producto.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'var(--fondos-suaves)' }}
              >
                <div>
                  <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {producto.nombre}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {formatearPrecioMXN(producto.presentaciones?.[0]?.precio ?? producto.precio)}
                    {producto.presentaciones?.[0]?.stock != null ? ` • Stock: ${producto.presentaciones[0].stock}` : ''}
                  </p>
                </div>
                <Badge variant={getCategoryColor(producto.categoria)}>
                  {producto.categoria}
                </Badge>
              </div>
            ))}
            {catProductos.length === 0 && <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Cargando productos...</p>}
          </div>
        </Card>
      </div>

      <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Ventas de Hoy
        </h2>
        <Table headers={['Cliente', 'Productos', 'Total', 'Método de Pago', 'Estado', 'Fecha', 'Acciones']} headerSutil>
          {ventasHoy.map((venta) => (
            <TableRow key={venta.id}>
              <TableCell rowPadding="lg">{nombreCliente(venta.clienteId)}</TableCell>
              <TableCell rowPadding="lg">{venta.productos}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{venta.total}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={venta.raw.metodoPago === 'efectivo' ? 'success' : 'info'}>
                  {venta.metodo}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={varianteBadgeEstadoVenta(venta.raw.estado)}>
                  {ETIQUETA_ESTADO_VENTA[venta.raw.estado] ?? venta.raw.estado}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">{venta.fecha}</TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setVentaDetalle(venta)}>Ver Detalles</Button>
                  {(() => {
                    const acciones = accionesDeVenta(venta.raw.estado, venta.raw.corteId, venta.raw.metodoPago, tienePermiso);
                    return (
                      <>
                        {acciones.cancelar && (
                          <Button size="sm" variant="danger" onClick={() => openCancelarVenta(venta.id)}>Cancelar</Button>
                        )}
                        {acciones.anularCortada && (
                          <Button size="sm" variant="outline-danger" onClick={() => openAnularVenta(venta.id)}>Anular venta cortada</Button>
                        )}
                        {acciones.devolverFueraDeCaja && (
                          <p className="max-w-xs whitespace-normal text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                            {textoDevolucionFueraDeCaja(venta.raw.metodoPago)}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
      </div>
      {/* Modal: Corte de caja */}
      <Modal
        isOpen={isModalCorteOpen}
        onClose={() => { if (!savingCorte) { setIsModalCorteOpen(false); } }}
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
            {corteError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{corteError}</p>}
            <div className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Corte de hoy: suma las ventas pagadas del día y descuenta las salidas de efectivo (reembolsos). Efectivo esperado = inicial + efectivo cobrado − salidas.</p>
              <Input label="Efectivo inicial ($)" type="number" min={0} step={0.01} value={formCorteEfectivo} onChange={(e) => setFormCorteEfectivo(e.target.value)} fullWidth />
              <Input label="Efectivo contado al cierre ($)" type="number" min={0} step={0.01} inputMode="decimal" required value={formCorteEfectivoFinal} onChange={(e) => setFormCorteEfectivoFinal(e.target.value)} fullWidth />
              <Textarea label="Notas" value={formCorteNotas} onChange={(e) => setFormCorteNotas(e.target.value)} placeholder="Observaciones del turno..." rows={2} fullWidth />
            </div>
          </>
        )}
      </Modal>

      {/* Modal: Cancelar / Anular Venta (el mismo modal; anular exige motivo) */}
      <Modal
        isOpen={isModalCancelarOpen}
        onClose={() => { if (!savingCancelVenta) { setIsModalCancelarOpen(false); setVentaIdCancelando(null); } }}
        title={accionVenta === 'anular' ? 'Anular venta cortada' : 'Cancelar Venta'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalCancelarOpen(false); setVentaIdCancelando(null); }} disabled={savingCancelVenta}>Volver</Button>
            <Button variant="danger" onClick={handleCancelarVenta} disabled={savingCancelVenta}>
              {accionVenta === 'anular'
                ? (savingCancelVenta ? 'Anulando...' : 'Anular venta')
                : (savingCancelVenta ? 'Cancelando...' : 'Cancelar venta')}
            </Button>
          </>
        }
      >
        {cancelVentaError && <p role="alert" className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{cancelVentaError}</p>}
        {accionVenta === 'anular' && ventaCancelando &&
          textoModalAnular(ventaCancelando.raw).map((parrafo) => (
            <p key={parrafo} className="text-sm mb-3" style={{ color: 'var(--encabezados-alterno)' }}>{parrafo}</p>
          ))}
        <Textarea
          label={accionVenta === 'anular' ? 'Motivo de la anulación *' : 'Motivo de cancelación'}
          value={cancelMotivoVenta}
          onChange={(e) => setCancelMotivoVenta(e.target.value)}
          placeholder={accionVenta === 'anular' ? 'Describe el motivo (obligatorio)...' : 'Describe el motivo (opcional)...'}
          rows={3}
          fullWidth
        />
      </Modal>

      {/* Modal: Ver Detalles (solo lectura) */}
      <Modal
        isOpen={ventaDetalle !== null}
        onClose={() => setVentaDetalle(null)}
        title={`Venta #${ventaDetalle?.id ?? ''}`}
        size="sm"
        footer={<Button variant="outline" onClick={() => setVentaDetalle(null)}>Cerrar</Button>}
      >
        {ventaDetalle && (
          <div className="space-y-3 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
            <p><span className="font-semibold">Cliente:</span> {nombreCliente(ventaDetalle.clienteId)}</p>
            <p><span className="font-semibold">Fecha:</span> {ventaDetalle.fecha}</p>
            <p><span className="font-semibold">Método de pago:</span> {ventaDetalle.metodo}</p>
            <p>
              <span className="font-semibold">Estado:</span>{' '}
              <Badge variant={varianteBadgeEstadoVenta(ventaDetalle.raw.estado)}>
                {ETIQUETA_ESTADO_VENTA[ventaDetalle.raw.estado]}
              </Badge>
            </p>

            {ventaDetalle.raw.items.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Items</p>
                <Table headers={['Producto', 'Cant.', 'P. unitario', 'Subtotal']} headerSutil>
                  {ventaDetalle.raw.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{nombreProductoPorPresentacion(item.presentacionId)}</TableCell>
                      <TableCell>{item.cantidad}</TableCell>
                      <TableCell>{fmtMoneda(item.precioUnitario)}</TableCell>
                      <TableCell>{fmtMoneda(item.subtotal ?? item.cantidad * item.precioUnitario)}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
            )}

            {ventaDetalle.raw.descuento != null && ventaDetalle.raw.descuento > 0 && (
              <p><span className="font-semibold">Descuento:</span> {fmtMoneda(ventaDetalle.raw.descuento)}</p>
            )}
            <p className="text-base"><span className="font-semibold">Total:</span> {ventaDetalle.total}</p>
            {ventaDetalle.raw.notas && (
              <p><span className="font-semibold">Notas:</span> {ventaDetalle.raw.notas}</p>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
