'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listarFacturas,
  listarPedidos,
  crearFactura,
  PedidoApi,
  FacturaApi,
  TipoDocumentoFactura,
} from '../../../services/ecommerce';
import { getUsuarios } from '../../../services/usuarios';
import { subirPdfCloudinary, PRESET_PRODUCTOS } from '../../../utils/cloudinary';
import { generarNotaVentaPdf } from '../../../utils/generarNotaPdf';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { BadgeDollarSign, Clock3, Receipt } from 'lucide-react';

function fmtFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState<FacturaApi[]>([]);
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [nombresClientes, setNombresClientes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [facturaDetalle, setFacturaDetalle] = useState<FacturaApi | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formTipo, setFormTipo] = useState<TipoDocumentoFactura>('nota');
  // Nota
  const [formClienteNombre, setFormClienteNombre] = useState('');
  const [formConcepto, setFormConcepto] = useState('');
  const [formMonto, setFormMonto] = useState('');
  // CFDI
  const [formPedidoId, setFormPedidoId] = useState('');
  const [formFolio, setFormFolio] = useState('');
  const [formSerie, setFormSerie] = useState('');
  const [formUuidFiscal, setFormUuidFiscal] = useState('');
  const [formRfc, setFormRfc] = useState('');
  const [formRazonSocial, setFormRazonSocial] = useState('');
  const [formEstado, setFormEstado] = useState('');
  const [formPdfFile, setFormPdfFile] = useState<File | null>(null);
  const [subiendoPdf, setSubiendoPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [usuarios, listaPedidos, listaFacturas] = await Promise.all([
        getUsuarios(),
        listarPedidos(),
        listarFacturas(),
      ]);
      setNombresClientes(new Map(usuarios.map((u) => [u.id, u.nombre])));
      setPedidos(listaPedidos);
      setFacturas(listaFacturas);
    } catch {
      setError('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const nombreClientePedido = (pedidoId?: number | null): string => {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    return (pedido?.usuarioId && nombresClientes.get(pedido.usuarioId)) || 'Cliente sin nombre';
  };

  const nombreCliente = (f: FacturaApi): string =>
    f.tipo === 'nota' ? (f.clienteNombre || 'Cliente sin nombre') : nombreClientePedido(f.pedidoId);

  const montoFactura = (f: FacturaApi): number => {
    if (f.tipo === 'nota') return f.monto ?? 0;
    const pedido = pedidos.find((p) => p.id === f.pedidoId);
    return pedido?.total ?? 0;
  };

  const openNueva = () => {
    setFormTipo('nota');
    setFormClienteNombre('');
    setFormConcepto('');
    setFormMonto('');
    setFormPedidoId('');
    setFormFolio('');
    setFormSerie('');
    setFormUuidFiscal('');
    setFormRfc('');
    setFormRazonSocial('');
    setFormEstado('');
    setFormPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleGenerar = async () => {
    setFormError(null);

    if (formTipo === 'nota') {
      if (!formClienteNombre.trim()) { setFormError('Ingresa el nombre del cliente'); return; }
      if (!formConcepto.trim()) { setFormError('Ingresa el concepto'); return; }
      const monto = Number(formMonto);
      if (!formMonto || monto <= 0) { setFormError('Monto inválido'); return; }
    } else if (formEstado !== 'solicitada') {
      if (!formFolio.trim() && !formUuidFiscal.trim()) {
        setFormError('Ingresa al menos el folio o el UUID fiscal');
        return;
      }
    }

    setSaving(true);
    try {
      let pdfUrl: string | undefined;
      if (formTipo === 'cfdi' && formPdfFile) {
        setSubiendoPdf(true);
        pdfUrl = await subirPdfCloudinary(formPdfFile, PRESET_PRODUCTOS);
        setSubiendoPdf(false);
      }

      await crearFactura({
        tipo: formTipo,
        estado: formEstado.trim() || undefined,
        ...(formTipo === 'nota'
          ? {
              clienteNombre: formClienteNombre.trim(),
              concepto: formConcepto.trim(),
              monto: Number(formMonto),
            }
          : {
              pedidoId: formPedidoId ? Number(formPedidoId) : undefined,
              folio: formFolio.trim() || undefined,
              serie: formSerie.trim() || undefined,
              uuidFiscal: formUuidFiscal.trim() || undefined,
              rfc: formRfc.trim() || undefined,
              razonSocial: formRazonSocial.trim() || undefined,
              pdfUrl,
            }),
      });
      setIsModalOpen(false);
      cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo generar el documento');
    } finally {
      setSaving(false);
      setSubiendoPdf(false);
    }
  };

  const handleDescargar = (f: FacturaApi) => {
    if (f.tipo === 'nota') {
      generarNotaVentaPdf({
        id: f.id,
        clienteNombre: f.clienteNombre || 'Cliente sin nombre',
        concepto: f.concepto || '-',
        monto: f.monto ?? 0,
        fecha: fmtFecha(f.creadoEn),
      });
    } else if (f.pdfUrl) {
      window.open(f.pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const notasCount = facturas.filter((f) => f.tipo === 'nota').length;
  const cfdiSinPdf = facturas.filter((f) => f.tipo === 'cfdi' && !f.pdfUrl).length;
  const montoTotal = facturas.reduce((acc, f) => acc + montoFactura(f), 0);

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
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Notas de venta</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{notasCount}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>CFDI sin PDF cargado</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{cfdiSinPdf}</p>
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
        <Table headers={['Cliente', 'Tipo', 'Folio/Concepto', 'Monto', 'Fecha', 'Estado', 'Acciones']} headerSutil>
          {facturas.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-semibold" rowPadding="lg">{nombreCliente(f)}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={f.tipo === 'nota' ? 'default' : 'info'}>
                  {f.tipo === 'nota' ? 'Nota de venta' : 'CFDI'}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">{f.tipo === 'nota' ? (f.concepto || '-') : (f.folio || '-')}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{fmtMoneda(montoFactura(f))}</TableCell>
              <TableCell rowPadding="lg">{fmtFecha(f.creadoEn)}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={f.estado ? 'info' : 'default'}>
                  {f.estado || 'Sin estado'}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setFacturaDetalle(f)}>Ver</Button>
                  <Button
                    size="sm"
                    disabled={f.tipo === 'cfdi' && !f.pdfUrl}
                    title={f.tipo === 'cfdi' && !f.pdfUrl ? 'No hay PDF fiscal cargado' : undefined}
                    onClick={() => handleDescargar(f)}
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
            <Button onClick={handleGenerar} disabled={saving}>
              {subiendoPdf ? 'Subiendo PDF...' : saving ? 'Generando...' : 'Generar Documento'}
            </Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="grid grid-cols-1 gap-4">
          <Select
            label="Tipo de Documento"
            value={formTipo}
            onChange={(e) => setFormTipo(e.target.value as TipoDocumentoFactura)}
            options={[
              { value: 'nota', label: 'Nota de venta (sin validez fiscal)' },
              { value: 'cfdi', label: 'Factura CFDI (registrar documento ya timbrado)' },
            ]}
            fullWidth
          />

          {formTipo === 'nota' ? (
            <>
              <Input label="Cliente *" value={formClienteNombre} onChange={(e) => setFormClienteNombre(e.target.value)} placeholder="Nombre del cliente" fullWidth />
              <Input label="Concepto *" value={formConcepto} onChange={(e) => setFormConcepto(e.target.value)} placeholder="Descripción del servicio/producto" fullWidth />
              <Input label="Monto *" type="number" min={0.01} step="0.01" value={formMonto} onChange={(e) => setFormMonto(e.target.value)} placeholder="0.00" fullWidth />
              <Select
                label="Estado (opcional)"
                value={formEstado}
                onChange={(e) => setFormEstado(e.target.value)}
                options={[
                  { value: '', label: 'Sin especificar' },
                  { value: 'pendiente', label: 'Pendiente' },
                  { value: 'pagada', label: 'Pagada' },
                  { value: 'cancelada', label: 'Cancelada' },
                ]}
                fullWidth
              />
              <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                El PDF se genera automáticamente al descargar, con el sello &quot;COMPROBANTE NO FISCAL&quot;.
              </p>
            </>
          ) : (
            <>
              <Select
                label="Pedido (opcional)"
                value={formPedidoId}
                onChange={(e) => setFormPedidoId(e.target.value)}
                options={[
                  { value: '', label: 'Sin pedido asociado' },
                  ...pedidos.map((p) => ({
                    value: String(p.id),
                    label: `#${p.id} — ${nombreClientePedido(p.id)} — ${fmtMoneda(p.total)}`,
                  })),
                ]}
                fullWidth
              />
              <Input label="Folio" value={formFolio} onChange={(e) => setFormFolio(e.target.value)} placeholder="Ej. A-0001" fullWidth />
              <Input label="Serie" value={formSerie} onChange={(e) => setFormSerie(e.target.value)} placeholder="Ej. A" fullWidth />
              <Input label="UUID Fiscal" value={formUuidFiscal} onChange={(e) => setFormUuidFiscal(e.target.value)} placeholder="UUID del CFDI timbrado por el PAC" fullWidth />
              <Input label="RFC" value={formRfc} onChange={(e) => setFormRfc(e.target.value)} placeholder="RFC del cliente" fullWidth />
              <Input label="Razón Social" value={formRazonSocial} onChange={(e) => setFormRazonSocial(e.target.value)} placeholder="Razón social" fullWidth />
              <Select
                label="Estado (opcional)"
                value={formEstado}
                onChange={(e) => setFormEstado(e.target.value)}
                options={[
                  { value: '', label: 'Sin especificar' },
                  { value: 'solicitada', label: 'Solicitada' },
                  { value: 'timbrada', label: 'Timbrada' },
                  { value: 'cancelada', label: 'Cancelada' },
                ]}
                fullWidth
              />
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                  PDF del CFDI (el que entregó el PAC/contador)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFormPdfFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                El sistema no genera ni timbra CFDI — solo registra los datos y guarda el PDF que ya existe.
              </p>
            </>
          )}
        </div>
      </Modal>

      {/* Modal: Ver detalle */}
      <Modal
        isOpen={facturaDetalle !== null}
        onClose={() => setFacturaDetalle(null)}
        title={facturaDetalle?.tipo === 'nota' ? `Nota de venta #${facturaDetalle?.id ?? ''}` : `CFDI #${facturaDetalle?.id ?? ''}`}
        size="sm"
        footer={<Button variant="outline" onClick={() => setFacturaDetalle(null)}>Cerrar</Button>}
      >
        {facturaDetalle && (
          <div className="space-y-2 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
            <p><span className="font-semibold">Cliente:</span> {nombreCliente(facturaDetalle)}</p>
            <p><span className="font-semibold">Monto:</span> {fmtMoneda(montoFactura(facturaDetalle))}</p>
            <p><span className="font-semibold">Fecha:</span> {fmtFecha(facturaDetalle.creadoEn)}</p>
            {facturaDetalle.tipo === 'nota' ? (
              <p><span className="font-semibold">Concepto:</span> {facturaDetalle.concepto || '-'}</p>
            ) : (
              <>
                <p><span className="font-semibold">Folio:</span> {facturaDetalle.folio || '-'}</p>
                <p><span className="font-semibold">Serie:</span> {facturaDetalle.serie || '-'}</p>
                <p><span className="font-semibold">UUID Fiscal:</span> {facturaDetalle.uuidFiscal || '-'}</p>
                <p><span className="font-semibold">RFC:</span> {facturaDetalle.rfc || '-'}</p>
                <p><span className="font-semibold">Razón Social:</span> {facturaDetalle.razonSocial || '-'}</p>
              </>
            )}
            <p><span className="font-semibold">Estado:</span> {facturaDetalle.estado || 'Sin estado registrado'}</p>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
