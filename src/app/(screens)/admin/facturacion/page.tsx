'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listarFacturas,
  listarTodosLosPedidos,
  obtenerPedido,
  crearFactura,
  PedidoApi,
  FacturaApi,
  TipoDocumentoFactura,
} from '../../../services/ecommerce';
import { getUsuarios } from '../../../services/usuarios';
import { enParaleloLimitado } from '../../../utils/enParaleloLimitado';
import { etiquetaEstadoFactura } from '../../../utils/estados';
import { montoFactura as montoDeFactura, montoTotalFacturas, pedidosReferenciados } from './facturasPedidos';
import { subirPdfCloudinary } from '../../../utils/cloudinary';
import { generarNotaVentaPdf } from '../../../utils/generarNotaPdf';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import TarjetaKpi from '../../../components/ui/TarjetaKpi';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { BadgeDollarSign, Clock3, Info, Receipt } from 'lucide-react';
import { AVISO_SIN_TIMBRADO, textoBotonGuardar, tituloModalDocumento } from './textosFacturacion';

function fmtFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Estado del documento en palabras ("solicitada" → "Solicitada"). */
const estadoLegible = (estado?: string | null): string | null => (estado ? etiquetaEstadoFactura(estado) : null);

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState<FacturaApi[]>([]);
  /** Solo los pedidos de los CFDI de la lista: se traen después de pintar las facturas. */
  const [pedidosPorId, setPedidosPorId] = useState<Map<number, PedidoApi>>(new Map());
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  /** Lista completa de pedidos para elegir uno al registrar un CFDI: se pide al elegir ese tipo. */
  const [listaPedidos, setListaPedidos] = useState<PedidoApi[] | null>(null);
  const [cargandoListaPedidos, setCargandoListaPedidos] = useState(false);
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

  // Antes un Promise.all esperaba la lista completa de pedidos (10 a 15 s con "0 documentos" y $0.00).
  // Ahora las facturas se pintan en cuanto llegan; los nombres y los pedidos de los CFDI, después.
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCargandoPedidos(true);
    void getUsuarios()
      .then((usuarios) => setNombresClientes(new Map(usuarios.map((u) => [u.id, u.nombre]))))
      .catch(() => {});
    let lista: FacturaApi[] = [];
    try {
      lista = await listarFacturas();
      setFacturas(lista);
    } catch {
      setError('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
    try {
      const encontrados = await enParaleloLimitado(
        pedidosReferenciados(lista).map((id) => () => obtenerPedido(id).catch(() => null)),
        6,
      );
      setPedidosPorId(new Map(encontrados.filter((p): p is PedidoApi => p !== null).map((p) => [p.id, p])));
    } finally {
      setCargandoPedidos(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarListaPedidos = () => {
    if (listaPedidos || cargandoListaPedidos) return;
    setCargandoListaPedidos(true);
    listarTodosLosPedidos()
      .then(setListaPedidos)
      .catch(() => setFormError('No se pudo cargar la lista de pedidos; puedes registrar el CFDI sin pedido.'))
      .finally(() => setCargandoListaPedidos(false));
  };

  const nombreDeUsuario = (usuarioId?: string | null): string =>
    (usuarioId && nombresClientes.get(usuarioId)) || 'Cliente sin nombre';

  /** null mientras el pedido del CFDI sigue llegando (la celda pinta skeleton). */
  const nombreCliente = (f: FacturaApi): string | null => {
    if (f.tipo === 'nota') return f.clienteNombre || 'Cliente sin nombre';
    const pedido = f.pedidoId != null ? pedidosPorId.get(f.pedidoId) : undefined;
    if (!pedido && f.pedidoId != null && cargandoPedidos) return null;
    return nombreDeUsuario(pedido?.usuarioId);
  };

  const montoFactura = (f: FacturaApi): number | null => montoDeFactura(f, pedidosPorId, cargandoPedidos);

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
        pdfUrl = await subirPdfCloudinary(formPdfFile);
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
      void generarNotaVentaPdf({
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
  const montoTotal = montoTotalFacturas(facturas, pedidosPorId, cargandoPedidos);
  // Sin role="status" por celda (decenas de regiones vivas): la tabla lleva un solo aria-busy mientras cargan.
  const skeletonCelda = <span className="mf-skeleton inline-block h-4 w-24 align-middle" aria-hidden />;

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
              {loading ? (
                <span className="mf-skeleton inline-block h-4 w-40 align-middle" role="status" aria-label="Cargando documentos" />
              ) : (
                `${facturas.length} documento${facturas.length === 1 ? '' : 's'} registrados`
              )}
            </p>
          </div>
          <Button onClick={openNueva}>+ Nota de venta o CFDI timbrado</Button>
        </div>

        <div
          className="flex items-start gap-3 px-4 py-3 rounded-[10px] text-sm"
          style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--menu-texto-principal)' }}
        >
          <Info size={18} aria-hidden className="shrink-0 mt-0.5" />
          <p>{AVISO_SIN_TIMBRADO}</p>
        </div>

        {error && (
          <div role="alert" className="px-4 py-3 rounded-[10px] text-sm font-semibold" style={{ backgroundColor: 'var(--danger)', color: 'var(--marfil)', boxShadow: 'var(--mf-sombra-1)' }}>
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TarjetaKpi icono={Receipt} etiqueta="Notas de venta" cargando={loading} valor={notasCount} />

          <TarjetaKpi icono={Clock3} etiqueta="CFDI sin PDF cargado" cargando={loading} valor={cfdiSinPdf} />

          <TarjetaKpi icono={BadgeDollarSign} etiqueta="Monto total" cargando={loading || montoTotal === null} valor={fmtMoneda(montoTotal ?? 0)} />
        </div>

        {/* Listado */}
        {/* Sin relleno alrededor de la tabla: con tarjeta y marco, en móvil solo cabían 1 o 2 columnas. */}
        <Card variant="elevated" padding="lg" className="!p-0 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5" role="status" aria-label="Cargando facturas">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="mf-skeleton h-10 w-full" />
            ))}
          </div>
        ) : facturas.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay facturas registradas.</p>
        ) : (
        <Table headers={['Cliente', 'Tipo', 'Folio/Concepto', 'Monto', 'Fecha', 'Estado', 'Acciones']} ocupada={cargandoPedidos} headerSutil stickyFirstColumn etiqueta="Facturas: desplaza para ver más columnas">
          {facturas.map((f) => {
            const cliente = nombreCliente(f);
            const monto = montoFactura(f);
            return (
            <TableRow key={f.id}>
              <TableCell className="font-semibold" rowPadding="lg">{cliente ?? skeletonCelda}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={f.tipo === 'nota' ? 'default' : 'info'}>
                  {f.tipo === 'nota' ? 'Nota de venta' : 'CFDI'}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">{f.tipo === 'nota' ? (f.concepto || '-') : (f.folio || '-')}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{monto === null ? skeletonCelda : fmtMoneda(monto)}</TableCell>
              <TableCell rowPadding="lg">{fmtFecha(f.creadoEn)}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={f.estado ? 'info' : 'default'}>
                  {estadoLegible(f.estado) ?? 'Sin estado'}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex flex-nowrap gap-2 whitespace-nowrap">
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
            );
          })}
        </Table>
        )}
        </Card>
      </div>

      {/* Modal: Generar nota/factura */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { if (!saving) setIsModalOpen(false); }}
        title={tituloModalDocumento(formTipo)}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleGenerar} disabled={saving}>
              {textoBotonGuardar(formTipo, { guardando: saving, subiendoPdf })}
            </Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="grid grid-cols-1 gap-4">
          <Select
            label="Tipo de Documento"
            value={formTipo}
            onChange={(e) => {
              const tipo = e.target.value as TipoDocumentoFactura;
              setFormTipo(tipo);
              if (tipo === 'cfdi') cargarListaPedidos();
            }}
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
                  { value: '', label: cargandoListaPedidos ? 'Cargando pedidos…' : 'Sin pedido asociado' },
                  ...(listaPedidos ?? []).map((p) => ({
                    value: String(p.id),
                    label: `#${p.id} · ${nombreDeUsuario(p.usuarioId)} · ${fmtMoneda(p.total)}`,
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
                <label htmlFor="cfdi-pdf" className="mf-etiqueta">
                  PDF del CFDI (el que entregó el PAC/contador)
                </label>
                {/* Campo del sistema (44 px de alto) con el botón nativo teñido de la paleta. */}
                <input
                  id="cfdi-pdf"
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFormPdfFile(e.target.files?.[0] ?? null)}
                  className="mf-campo w-full px-2 py-1.5 text-sm file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--fondos-suaves)] file:px-3 file:font-semibold file:text-[var(--menu-texto-principal)]"
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                {AVISO_SIN_TIMBRADO}
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
            <p><span className="font-semibold">Cliente:</span> {nombreCliente(facturaDetalle) ?? 'Cargando…'}</p>
            <p><span className="font-semibold">Monto:</span> {montoFactura(facturaDetalle) === null ? 'Cargando…' : fmtMoneda(montoFactura(facturaDetalle) ?? 0)}</p>
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
            <p><span className="font-semibold">Estado:</span> {estadoLegible(facturaDetalle.estado) ?? 'Sin estado registrado'}</p>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
