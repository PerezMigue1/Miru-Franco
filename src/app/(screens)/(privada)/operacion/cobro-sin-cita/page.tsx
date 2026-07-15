'use client';

import { useState, useEffect, useCallback } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { BadgeDollarSign, ShoppingBag } from 'lucide-react';
import { listarVentas, crearVenta, VentaLocalApi } from '../../../../services/pos';
import { getServicios, Servicio } from '../../../../services/servicios';
import { listarClientes, ClienteApi } from '../../../../services/clientes';
import { etiquetaEstadoVenta, varianteEstadoVenta } from '../../../../utils/estados';

function precioNum(p?: string): number {
  return Number(String(p ?? '').replace(/[^0-9.]/g, '')) || 0;
}
function fmtMoneda(v?: number | null): string {
  return `$${Number(v ?? 0).toFixed(2)}`;
}
function hora(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function CobroSinCitaPage() {
  const [ventas, setVentas] = useState<VentaLocalApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [clientes, setClientes] = useState<ClienteApi[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fServicioId, setFServicioId] = useState('');
  const [fCantidad, setFCantidad] = useState('1');
  const [fMetodoPago, setFMetodoPago] = useState('efectivo');
  const [fClienteId, setFClienteId] = useState('');

  const hoy = new Date().toISOString().slice(0, 10);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    listarVentas({ desde: hoy, limit: 100 })
      .then(({ data }) => setVentas(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar las ventas'))
      .finally(() => setLoading(false));
  }, [hoy]);

  useEffect(() => {
    cargar();
    getServicios().then(({ data }) => setServicios(data)).catch(() => {});
    listarClientes({ limit: 200 }).then(({ data }) => setClientes(data)).catch(() => {});
  }, [cargar]);

  const reset = () => {
    setFServicioId(''); setFCantidad('1'); setFMetodoPago('efectivo'); setFClienteId('');
    setFormError(null);
  };

  const handleCobrar = async () => {
    if (!fServicioId || !fCantidad || Number(fCantidad) < 1) {
      setFormError('Selecciona un servicio y una cantidad válida');
      return;
    }
    const servicio = servicios.find((s) => String(s.id) === fServicioId);
    if (!servicio) { setFormError('Servicio no válido'); return; }
    setSaving(true); setFormError(null);
    try {
      await crearVenta({
        items: [{
          servicioId: Number(fServicioId),
          cantidad: Number(fCantidad),
          precioUnitario: precioNum(servicio.precio),
        }],
        metodoPago: fMetodoPago,
        clienteId: fClienteId || undefined,
      });
      setIsOpen(false); reset(); cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo registrar el cobro');
    } finally {
      setSaving(false);
    }
  };

  const totalCobrado = ventas.reduce((s, v) => s + (Number(v.total) || 0), 0);

  return (
    <OperacionLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Cobro sin Cita
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Cobra servicios de clientes que llegan sin cita previa (venta en mostrador)
            </p>
          </div>
          <Button onClick={() => { reset(); setIsOpen(true); }}>+ Cobrar servicio</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <ShoppingBag size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Ventas de hoy</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : ventas.length}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total cobrado</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--oro-texto)' }}>{loading ? '…' : fmtMoneda(totalCobrado)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando ventas del día…</p>
        ) : error ? (
          <div className="text-center py-8">
            <p className="mb-3" style={{ color: 'var(--danger-texto)' }}>{error}</p>
            <Button variant="outline" onClick={cargar}>Reintentar</Button>
          </div>
        ) : ventas.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
            No hay ventas sin cita registradas hoy.
          </p>
        ) : (
          <Table headers={['Folio', 'Hora', 'Items', 'Método', 'Total', 'Estado']} headerSutil>
            {ventas.map((v) => (
              <TableRow key={v.id}>
                <TableCell rowPadding="lg">{v.id}</TableCell>
                <TableCell rowPadding="lg">{hora(v.creadoEn)}</TableCell>
                <TableCell rowPadding="lg">{v.items.length}</TableCell>
                <TableCell rowPadding="lg">{v.metodoPago}</TableCell>
                <TableCell rowPadding="lg">{fmtMoneda(v.total)}</TableCell>
                <TableCell rowPadding="lg">
                  <Badge variant={varianteEstadoVenta(v.estado)}>
                    {etiquetaEstadoVenta(v.estado)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
        </Card>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => { if (!saving) { setIsOpen(false); reset(); } }}
        title="Cobrar servicio (sin cita)"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsOpen(false); reset(); }} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCobrar} disabled={saving}>{saving ? 'Cobrando…' : 'Registrar cobro'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="space-y-4">
          <Select
            label="Servicio *"
            value={fServicioId}
            onChange={(e) => setFServicioId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar servicio…' }, ...servicios.map((s) => ({ value: String(s.id), label: `${s.nombre} — ${fmtMoneda(precioNum(s.precio))}` }))]}
            fullWidth
          />
          <Input label="Cantidad *" type="number" min={1} value={fCantidad} onChange={(e) => setFCantidad(e.target.value)} fullWidth />
          <Select
            label="Método de pago *"
            value={fMetodoPago}
            onChange={(e) => setFMetodoPago(e.target.value)}
            options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'tarjeta', label: 'Tarjeta' },
              { value: 'transferencia', label: 'Transferencia' },
              { value: 'mixto', label: 'Mixto' },
            ]}
            fullWidth
          />
          <Select
            label="Cliente (opcional)"
            value={fClienteId}
            onChange={(e) => setFClienteId(e.target.value)}
            options={[{ value: '', label: 'Público general' }, ...clientes.map((c) => ({ value: c.id, label: c.nombre ?? c.email ?? c.id }))]}
            fullWidth
          />
        </div>
      </Modal>
    </OperacionLayout>
  );
}
