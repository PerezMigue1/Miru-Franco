'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Select from '../../../../components/ui/Select';
import Input from '../../../../components/ui/Input';
import {
  listarFacturasDelCliente,
  listarPedidos,
  crearFactura,
  type FacturaApi,
  type PedidoApi,
} from '../../../../services/ecommerce';
import { hasValidToken } from '../../../../utils/security';
import { showAlert, showToast } from '../../../../utils/toast';

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<FacturaApi[]>([]);
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarSolicitud, setMostrarSolicitud] = useState(false);
  const [pedidoSolicitud, setPedidoSolicitud] = useState('');
  const [folioSolicitud, setFolioSolicitud] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = async () => {
    if (!hasValidToken()) {
      setError('Inicia sesión para ver tus facturas.');
      setLoading(false);
      return;
    }
    try {
      const [f, p] = await Promise.all([listarFacturasDelCliente(), listarPedidos()]);
      setFacturas(f);
      setPedidos(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const abrirDocumento = (url: string | null | undefined, etiqueta: string) => {
    if (!url?.trim()) {
      void showAlert('Aún no hay archivo disponible para este documento.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`Abriendo ${etiqueta}…`, 'info');
  };

  const solicitarRegistro = async () => {
    const pid = parseInt(pedidoSolicitud, 10);
    if (!Number.isFinite(pid)) {
      void showAlert('Selecciona un pedido.');
      return;
    }
    setEnviando(true);
    try {
      await crearFactura({
        pedidoId: pid,
        folio: folioSolicitud.trim() || undefined,
        estado: 'solicitada',
      });
      showToast('Solicitud registrada. El administrador completará los datos fiscales.', 'success');
      setMostrarSolicitud(false);
      setPedidoSolicitud('');
      setFolioSolicitud('');
      await cargar();
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'No se pudo registrar la solicitud');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModuleLayout>
      <div className="max-w-5xl mx-auto py-4">
        <div className="text-center mb-8">
          <h1 className="text-hero mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Mis facturas
          </h1>
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Documentos fiscales asociados a tus pedidos en línea
          </p>
        </div>

        {error && (
          <Card className="mb-4 p-4" style={{ borderColor: 'var(--danger)' }}>
            <p className="mb-2" style={{ color: 'var(--danger)' }}>{error}</p>
            {!hasValidToken() && (
              <Link href="/login" className="text-sm font-semibold underline" style={{ color: 'var(--botones-principales)' }}>
                Iniciar sesión
              </Link>
            )}
          </Card>
        )}

        {loading ? (
          <Card className="p-8 text-center">
            <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <Table headers={['Pedido', 'Folio / serie', 'UUID', 'Estado', 'Creado', 'XML', 'PDF']}>
                {facturas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
                      No hay facturas registradas para tus pedidos.
                    </TableCell>
                  </TableRow>
                ) : (
                  facturas.map((doc) => (
                    <TableRow key={`${doc.pedidoId}-${doc.id}`}>
                      <TableCell className="font-mono font-semibold">#{doc.pedidoId}</TableCell>
                      <TableCell>
                        {[doc.serie, doc.folio].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">
                        <span title={doc.uuidFiscal ?? ''}>{doc.uuidFiscal ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.estado === 'timbrada' || doc.estado === 'emitida' ? 'success' : 'warning'}>
                          {doc.estado ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {doc.creadoEn ? new Date(doc.creadoEn).toLocaleDateString('es-MX') : '—'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => abrirDocumento(doc.xmlUrl, 'XML')}>
                          XML
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => abrirDocumento(doc.pdfUrl, 'PDF')}>
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </Table>
            </Card>

            {!mostrarSolicitud ? (
              <Card>
                <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Solicitar factura
                </h2>
                <p className="mb-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  Registra una solicitud vinculada a un pedido. El equipo completará timbrado y enlaces cuando corresponda.
                </p>
                <Button onClick={() => setMostrarSolicitud(true)} disabled={!hasValidToken() || pedidos.length === 0}>
                  Nueva solicitud
                </Button>
                {hasValidToken() && pedidos.length === 0 && (
                  <p className="text-sm mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                    No tienes pedidos aún.{' '}
                    <Link href="/cliente/tienda-online" className="underline font-medium">
                      Ir a la tienda
                    </Link>
                  </p>
                )}
              </Card>
            ) : (
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Nueva solicitud de factura
                </h2>
                <div className="space-y-4 max-w-md">
                  <Select
                    label="Pedido"
                    value={pedidoSolicitud}
                    onChange={(e) => setPedidoSolicitud(e.target.value)}
                    options={[
                      { value: '', label: 'Selecciona pedido…' },
                      ...pedidos.map((p) => ({
                        value: String(p.id),
                        label: `#${p.id} — ${new Date(p.creadoEn ?? '').toLocaleDateString('es-MX')} — $${p.total}`,
                      })),
                    ]}
                    fullWidth
                  />
                  <Input
                    label="Referencia / folio deseado (opcional)"
                    value={folioSolicitud}
                    onChange={(e) => setFolioSolicitud(e.target.value)}
                    fullWidth
                    placeholder="Ej. prefijo interno"
                  />
                  <div className="flex gap-3">
                    <Button variant="outline" fullWidth onClick={() => setMostrarSolicitud(false)} disabled={enviando}>
                      Cancelar
                    </Button>
                    <Button fullWidth onClick={() => void solicitarRegistro()} disabled={enviando}>
                      {enviando ? 'Enviando…' : 'Registrar solicitud'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
