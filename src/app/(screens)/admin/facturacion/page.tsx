'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listarPedidos,
  listarFacturasPorPedido,
  crearFactura,
  PedidoApi,
  FacturaApi,
} from '../../../services/ecommerce';
import { getUsuarios } from '../../../services/usuarios';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { BadgeDollarSign, Clock3, Receipt } from 'lucide-react';

interface FacturaFila {
  id: number;
  pedidoId: number;
  cliente: string;
  monto: string;
  fecha: string;
  folio: string;
  serie: string;
  uuidFiscal: string;
  estado: string | null;
  pdfUrl: string | null;
}

function fmtFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function mapearFactura(f: FacturaApi, pedido: PedidoApi | undefined, nombresClientes: Map<string, string>): FacturaFila {
  const clienteId = pedido?.usuarioId;
  return {
    id: f.id,
    pedidoId: f.pedidoId,
    cliente: (clienteId && nombresClientes.get(clienteId)) || 'Cliente sin nombre',
    monto: pedido ? fmtMoneda(pedido.total) : '-',
    fecha: fmtFecha(f.creadoEn),
    folio: f.folio || '-',
    serie: f.serie || '-',
    uuidFiscal: f.uuidFiscal || '-',
    estado: f.estado || null,
    pdfUrl: f.pdfUrl || null,
  };
}

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState<FacturaFila[]>([]);
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [nombresClientes, setNombresClientes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [facturaDetalle, setFacturaDetalle] = useState<FacturaFila | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formPedidoId, setFormPedidoId] = useState('');
  const [formFolio, setFormFolio] = useState('');
  const [formSerie, setFormSerie] = useState('');
  const [formUuidFiscal, setFormUuidFiscal] = useState('');
  const [formEstado, setFormEstado] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [usuarios, listaPedidos] = await Promise.all([getUsuarios(), listarPedidos()]);
      const mapaNombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
      const mapaPedidos = new Map(listaPedidos.map((p) => [p.id, p]));

      const rows: FacturaFila[] = [];
      await Promise.all(
        listaPedidos.map(async (pedido) => {
          const facs = await listarFacturasPorPedido(pedido.id);
          facs.forEach((f) => rows.push(mapearFactura(f, mapaPedidos.get(f.pedidoId), mapaNombres)));
        })
      );

      setPedidos(listaPedidos);
      setNombresClientes(mapaNombres);
      setFacturas(rows);
    } catch {
      setError('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const openNueva = () => {
    setFormPedidoId('');
    setFormFolio('');
    setFormSerie('');
    setFormUuidFiscal('');
    setFormEstado('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleGenerar = async () => {
    setFormError(null);
    if (!formPedidoId) { setFormError('Selecciona un pedido'); return; }
    setSaving(true);
    try {
      await crearFactura({
        pedidoId: Number(formPedidoId),
        folio: formFolio.trim() || undefined,
        serie: formSerie.trim() || undefined,
        uuidFiscal: formUuidFiscal.trim() || undefined,
        estado: formEstado.trim() || undefined,
      });
      setIsModalOpen(false);
      cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo generar el documento');
    } finally {
      setSaving(false);
    }
  };

  const pendientes = facturas.filter((f) => !f.estado).length;
  const montoTotal = pedidos
    .filter((p) => facturas.some((f) => f.pedidoId === p.id))
    .reduce((acc, p) => acc + p.total, 0);

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Facturación
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {facturas.length} documento{facturas.length === 1 ? '' : 's'} registrados
            </p>
          </div>
          <Button onClick={openNueva}>+ Nueva Nota/Factura</Button>
        </div>

        {error && (
          <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Receipt size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total documentos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{facturas.length}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Sin estado registrado</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{pendientes}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Monto total</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{fmtMoneda(montoTotal)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando facturas…</p>
        ) : facturas.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay facturas registradas.</p>
        ) : (
        <Table headers={['Cliente', 'Folio', 'Monto', 'Fecha', 'Estado', 'Acciones']} headerSutil>
          {facturas.map((factura) => (
            <TableRow key={factura.id}>
              <TableCell className="font-semibold" rowPadding="lg">{factura.cliente}</TableCell>
              <TableCell rowPadding="lg">{factura.folio}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{factura.monto}</TableCell>
              <TableCell rowPadding="lg">{factura.fecha}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={factura.estado ? 'info' : 'default'}>
                  {factura.estado || 'Sin estado'}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setFacturaDetalle(factura)}>Ver</Button>
                  <Button
                    size="sm"
                    disabled={!factura.pdfUrl}
                    title={factura.pdfUrl ? undefined : 'No hay PDF cargado para este documento'}
                    onClick={() => factura.pdfUrl && window.open(factura.pdfUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Descargar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        )}
        </Card>
      </div>

      {/* Modal: Generar nota/factura */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { if (!saving) setIsModalOpen(false); }}
        title="Generar nota/factura"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleGenerar} disabled={saving}>{saving ? 'Generando...' : 'Generar Documento'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="grid grid-cols-1 gap-4">
          <Select
            label="Pedido *"
            value={formPedidoId}
            onChange={(e) => setFormPedidoId(e.target.value)}
            options={[
              { value: '', label: 'Selecciona un pedido…' },
              ...pedidos.map((p) => ({
                value: String(p.id),
                label: `#${p.id} — ${(p.usuarioId && nombresClientes.get(p.usuarioId)) || 'Cliente sin nombre'} — ${fmtMoneda(p.total)} — ${fmtFecha(p.creadoEn)}`,
              })),
            ]}
            fullWidth
          />
          <Input label="Folio" value={formFolio} onChange={(e) => setFormFolio(e.target.value)} placeholder="Ej. A-0001" fullWidth />
          <Input label="Serie" value={formSerie} onChange={(e) => setFormSerie(e.target.value)} placeholder="Ej. A" fullWidth />
          <Input label="UUID Fiscal" value={formUuidFiscal} onChange={(e) => setFormUuidFiscal(e.target.value)} placeholder="UUID del CFDI (si aplica)" fullWidth />
          <Input label="Estado" value={formEstado} onChange={(e) => setFormEstado(e.target.value)} placeholder="Ej. timbrada, cancelada..." fullWidth />
        </div>
      </Modal>

      {/* Modal: Ver detalle */}
      <Modal
        isOpen={facturaDetalle !== null}
        onClose={() => setFacturaDetalle(null)}
        title={`Documento — Pedido #${facturaDetalle?.pedidoId ?? ''}`}
        size="sm"
        footer={<Button variant="outline" onClick={() => setFacturaDetalle(null)}>Cerrar</Button>}
      >
        {facturaDetalle && (
          <div className="space-y-2 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
            <p><span className="font-semibold">Cliente:</span> {facturaDetalle.cliente}</p>
            <p><span className="font-semibold">Monto:</span> {facturaDetalle.monto}</p>
            <p><span className="font-semibold">Fecha:</span> {facturaDetalle.fecha}</p>
            <p><span className="font-semibold">Folio:</span> {facturaDetalle.folio}</p>
            <p><span className="font-semibold">Serie:</span> {facturaDetalle.serie}</p>
            <p><span className="font-semibold">UUID Fiscal:</span> {facturaDetalle.uuidFiscal}</p>
            <p><span className="font-semibold">Estado:</span> {facturaDetalle.estado || 'Sin estado registrado'}</p>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
