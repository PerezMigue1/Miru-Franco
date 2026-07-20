'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listarPedidos,
  listarPagosPorPedido,
  PedidoApi,
  PagoApi,
  etiquetaEstadoPago,
  varianteBadgeEstadoPago,
} from '../../../services/ecommerce';
import { getUsuarios } from '../../../services/usuarios';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { BadgeDollarSign, Clock3, Receipt, XCircle } from 'lucide-react';

function fmtFecha(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PagoFila extends PagoApi {
  cliente: string;
}

export default function PagosPage() {
  const [pagos, setPagos] = useState<PagoFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagoDetalle, setPagoDetalle] = useState<PagoFila | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [usuarios, pedidos] = await Promise.all([getUsuarios(), listarPedidos()]);
      const nombresClientes = new Map(usuarios.map((u) => [u.id, u.nombre]));
      const rows: PagoFila[] = [];
      await Promise.all(
        pedidos.map(async (pedido: PedidoApi) => {
          const ps = await listarPagosPorPedido(pedido.id);
          ps.forEach((p) => {
            rows.push({
              ...p,
              cliente: (pedido.usuarioId && nombresClientes.get(pedido.usuarioId)) || 'Cliente sin nombre',
            });
          });
        })
      );
      rows.sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''));
      setPagos(rows);
    } catch {
      setError('Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const totalPagos = pagos.length;
  const montoTotal = pagos.reduce((acc, p) => acc + p.monto, 0);
  const pendientes = pagos.filter((p) => p.estado === 'pendiente').length;
  const rechazados = pagos.filter((p) => p.estado === 'rechazado' || p.estado === 'cancelado').length;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Pagos
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {pagos.length} pago{pagos.length === 1 ? '' : 's'} registrados — historial de la pasarela de e-commerce
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Receipt size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total de pagos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : totalPagos}</p>
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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : fmtMoneda(montoTotal)}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Pendientes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--warning-texto)' }}>{loading ? '…' : pendientes}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <XCircle size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Rechazados/cancelados</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--danger-texto)' }}>{loading ? '…' : rechazados}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando pagos…</p>
        ) : pagos.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay pagos registrados.</p>
        ) : (
        <Table headers={['Cliente', 'Pedido', 'Monto', 'Método', 'Estado', 'Fecha', 'Acciones']} headerSutil>
          {pagos.map((pago) => (
            <TableRow key={pago.id}>
              <TableCell className="font-semibold" rowPadding="lg">{pago.cliente}</TableCell>
              <TableCell rowPadding="lg">#{pago.pedidoId}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{fmtMoneda(pago.monto)}</TableCell>
              <TableCell rowPadding="lg">{pago.metodo || '-'}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={varianteBadgeEstadoPago(pago.estado)}>
                  {etiquetaEstadoPago(pago.estado)}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">{fmtFecha(pago.creadoEn)}</TableCell>
              <TableCell rowPadding="lg">
                <Button size="sm" variant="outline" onClick={() => setPagoDetalle(pago)}>Ver Detalles</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        )}
        </Card>
      </div>

      {/* Modal: Ver detalles (solo lectura) */}
      <Modal
        isOpen={pagoDetalle !== null}
        onClose={() => setPagoDetalle(null)}
        title={`Pago #${pagoDetalle?.id ?? ''}`}
        size="sm"
        footer={<Button variant="outline" onClick={() => setPagoDetalle(null)}>Cerrar</Button>}
      >
        {pagoDetalle && (
          <div className="space-y-2 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
            <p><span className="font-semibold">Cliente:</span> {pagoDetalle.cliente}</p>
            <p><span className="font-semibold">Pedido:</span> #{pagoDetalle.pedidoId}</p>
            <p><span className="font-semibold">Monto:</span> {fmtMoneda(pagoDetalle.monto)} {pagoDetalle.moneda}</p>
            <p><span className="font-semibold">Método:</span> {pagoDetalle.metodo || '-'}</p>
            <p><span className="font-semibold">Proveedor:</span> {pagoDetalle.proveedor || '-'}</p>
            <p>
              <span className="font-semibold">Estado:</span>{' '}
              <Badge variant={varianteBadgeEstadoPago(pagoDetalle.estado)}>
                {etiquetaEstadoPago(pagoDetalle.estado)}
              </Badge>
            </p>
            <p><span className="font-semibold">Referencia externa:</span> {pagoDetalle.referenciaExterna || '-'}</p>
            <p><span className="font-semibold">Intento #:</span> {pagoDetalle.intentoNumero}</p>
            <p><span className="font-semibold">Creado:</span> {fmtFecha(pagoDetalle.creadoEn)}</p>
            <p><span className="font-semibold">Pagado:</span> {fmtFecha(pagoDetalle.pagadoEn)}</p>
            {pagoDetalle.errorMensaje && (
              <p style={{ color: 'var(--danger-texto)' }}>
                <span className="font-semibold">Error:</span> {pagoDetalle.errorMensaje}
              </p>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
