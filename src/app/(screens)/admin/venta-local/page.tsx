'use client';

import { useState, useEffect } from 'react';
import { listarVentas, crearVenta, cancelarVenta, abrirCorte, VentaLocalApi } from '../../../services/pos';
import { getProductosSinRedirigir, type Producto } from '../../../services/productos';
import { listarClientes, type ClienteApi } from '../../../services/clientes';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import { getCategoryColor } from '../../../utils/categoryColors';
import { BadgeDollarSign, Receipt, ShoppingCart } from 'lucide-react';

interface VentaFila {
  id: number;
  cliente: string;
  productos: string;
  total: string;
  metodo: string;
  fecha: string;
}

function mapearVenta(v: VentaLocalApi): VentaFila {
  const itemsDesc = v.items.length > 0 ? `${v.items.length} ítem(s)` : '-';
  return {
    id: v.id,
    cliente: v.clienteId ?? 'Cliente general',
    productos: itemsDesc,
    total: v.total != null ? `$${v.total.toFixed(2)}` : '-',
    metodo: v.metodoPago || '-',
    fecha: v.creadoEn ? new Date(v.creadoEn).toLocaleString('es-MX') : '-',
  };
}

export default function VentaLocalPage() {
  const [ventasHoy, setVentasHoy] = useState<VentaFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [catProductos, setCatProductos] = useState<Producto[]>([]);
  const [catClientes, setCatClientes] = useState<ClienteApi[]>([]);

  // Formulario nueva venta
  const [formClienteId, setFormClienteId] = useState('');
  const [formProductoId, setFormProductoId] = useState('');
  const [formCantidad, setFormCantidad] = useState('1');
  const [formPrecioUnitario, setFormPrecioUnitario] = useState('');
  const [formMetodoPago, setFormMetodoPago] = useState('efectivo');
  const [formDescuento, setFormDescuento] = useState('0');
  const [formNotas, setFormNotas] = useState('');
  const [savingVenta, setSavingVenta] = useState(false);
  const [ventaError, setVentaError] = useState<string | null>(null);

  // Modal CorteCaja
  const [isModalCorteOpen, setIsModalCorteOpen] = useState(false);
  const [formCorteEfectivo, setFormCorteEfectivo] = useState('0');
  const [formCorteNotas, setFormCorteNotas] = useState('');
  const [savingCorte, setSavingCorte] = useState(false);
  const [corteError, setCorteError] = useState<string | null>(null);

  // Modal cancelar venta
  const [isModalCancelarOpen, setIsModalCancelarOpen] = useState(false);
  const [ventaIdCancelando, setVentaIdCancelando] = useState<number | null>(null);
  const [cancelMotivoVenta, setCancelMotivoVenta] = useState('');
  const [savingCancelVenta, setSavingCancelVenta] = useState(false);

  const cargar = () => {
    const hoy = new Date().toISOString().slice(0, 10);
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

  const handleCrearVenta = async () => {
    if (!formProductoId || !formCantidad || !formPrecioUnitario) {
      setVentaError('Selecciona producto, cantidad y precio'); return;
    }
    setSavingVenta(true); setVentaError(null);
    try {
      const prod = catProductos.find((p) => String(p.id) === formProductoId);
      const presId = prod?.presentaciones?.[0]?.id ?? Number(formProductoId);
      await crearVenta({
        items: [{ presentacionId: presId, cantidad: Number(formCantidad), precioUnitario: Number(String(formPrecioUnitario).replace(/[^0-9.]/g, '')) }],
        metodoPago: formMetodoPago,
        clienteId: formClienteId || undefined,
        descuento: formDescuento ? Number(formDescuento) : undefined,
        notas: formNotas.trim() || undefined,
      });
      setFormProductoId(''); setFormCantidad('1'); setFormPrecioUnitario('');
      setFormClienteId(''); setFormDescuento('0'); setFormNotas('');
      cargar();
    } catch (e) { setVentaError(e instanceof Error ? e.message : 'Error al procesar venta'); }
    finally { setSavingVenta(false); }
  };

  const handleAbrirCorte = async () => {
    setSavingCorte(true); setCorteError(null);
    try {
      await abrirCorte({ efectivoInicial: Number(formCorteEfectivo) || 0, notas: formCorteNotas.trim() || undefined });
      setIsModalCorteOpen(false); setFormCorteEfectivo('0'); setFormCorteNotas('');
    } catch (e) { setCorteError(e instanceof Error ? e.message : 'Error al abrir corte'); }
    finally { setSavingCorte(false); }
  };

  const openCancelarVenta = (id: number) => { setVentaIdCancelando(id); setCancelMotivoVenta(''); setIsModalCancelarOpen(true); };

  const handleCancelarVenta = async () => {
    if (!ventaIdCancelando) return;
    setSavingCancelVenta(true);
    try {
      await cancelarVenta(ventaIdCancelando, { motivoCancelacion: cancelMotivoVenta.trim() || 'Cancelada desde panel admin' });
      setIsModalCancelarOpen(false); setVentaIdCancelando(null); cargar();
    } catch { /* silencioso */ }
    finally { setSavingCancelVenta(false); }
  };

  const totalDia = ventasHoy.reduce((acc, v) => acc + (parseFloat(v.total.replace(/[^0-9.]/g, '')) || 0), 0);

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
              {ventasHoy.length} venta{ventasHoy.length === 1 ? '' : 's'} hoy
            </p>
          </div>
          <Button variant="outline" onClick={() => { setCorteError(null); setFormCorteEfectivo('0'); setFormCorteNotas(''); setIsModalCorteOpen(true); }}>Abrir Corte de Caja</Button>
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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : ventasHoy.length}</p>
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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>${totalDia.toLocaleString('es-MX')}</p>
              </div>
            </div>
          </Card>
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
                if (p) setFormPrecioUnitario(String(p.presentaciones?.[0]?.precio ?? p.precio).replace(/[^0-9.]/g, ''));
              }}
              options={[{ value: '', label: 'Seleccionar producto...' }, ...catProductos.map((p) => ({ value: String(p.id), label: `${p.nombre} — $${p.presentaciones?.[0]?.precio ?? p.precio}` }))]}
              fullWidth
            />
            <Input label="Cantidad" type="number" min={1} value={formCantidad} onChange={(e) => setFormCantidad(e.target.value)} fullWidth />
            <Input label="Precio unitario" type="number" min={0} step={0.01} placeholder="0.00" value={formPrecioUnitario} onChange={(e) => setFormPrecioUnitario(e.target.value)} fullWidth />
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
            <Input label="Descuento ($)" type="number" min={0} step={0.01} value={formDescuento} onChange={(e) => setFormDescuento(e.target.value)} placeholder="0" fullWidth />
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
                    ${producto.presentaciones?.[0]?.precio ?? producto.precio}
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
        <Table headers={['Cliente', 'Productos', 'Total', 'Método de Pago', 'Fecha', 'Acciones']} headerSutil>
          {ventasHoy.map((venta) => (
            <TableRow key={venta.id}>
              <TableCell rowPadding="lg">{venta.cliente}</TableCell>
              <TableCell rowPadding="lg">{venta.productos}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{venta.total}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={venta.metodo === 'efectivo' || venta.metodo === 'Efectivo' ? 'success' : 'info'}>
                  {venta.metodo}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">{venta.fecha}</TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                  <Button size="sm" variant="danger" onClick={() => openCancelarVenta(venta.id)}>Cancelar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
      </div>
      {/* Modal: Abrir Corte de Caja */}
      <Modal
        isOpen={isModalCorteOpen}
        onClose={() => { if (!savingCorte) { setIsModalCorteOpen(false); } }}
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
        onClose={() => { if (!savingCancelVenta) { setIsModalCancelarOpen(false); setVentaIdCancelando(null); } }}
        title="Cancelar Venta"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalCancelarOpen(false); setVentaIdCancelando(null); }} disabled={savingCancelVenta}>Volver</Button>
            <Button variant="danger" onClick={handleCancelarVenta} disabled={savingCancelVenta}>{savingCancelVenta ? 'Cancelando...' : 'Cancelar venta'}</Button>
          </>
        }
      >
        <Textarea label="Motivo de cancelación" value={cancelMotivoVenta} onChange={(e) => setCancelMotivoVenta(e.target.value)} placeholder="Describe el motivo (opcional)..." rows={3} fullWidth />
      </Modal>
    </AdminLayout>
  );
}
