'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listarPedidosPaginado,
  listarPagosPorPedido,
  PedidoApi,
  PagoApi,
  etiquetaEstadoPago,
  etiquetaMetodoPagoPedido,
  varianteBadgeEstadoPago,
} from '../../../services/ecommerce';
import { enParaleloLimitado } from '../../../utils/enParaleloLimitado';
import { resumenPagos } from './resumenPagos';
import { getUsuarios } from '../../../services/usuarios';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import TarjetaKpi from '../../../components/ui/TarjetaKpi';
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
      // Los pagos se consultan pedido por pedido (no hay listado de pagos en el API): se acota a los
      // últimos 100 pedidos para no lanzar miles de peticiones, y el encabezado lo dice.
      const [usuarios, { data: pedidos }] = await Promise.all([getUsuarios(), listarPedidosPaginado({ page: 1, limit: 100 })]);
      const nombresClientes = new Map(usuarios.map((u) => [u.id, u.nombre]));
      const rows: PagoFila[] = [];
      await enParaleloLimitado(
        pedidos.map((pedido: PedidoApi) => async () => {
          const ps = await listarPagosPorPedido(pedido.id);
          ps.forEach((p) => {
            rows.push({
              ...p,
              cliente: (pedido.usuarioId && nombresClientes.get(pedido.usuarioId)) || 'Cliente sin nombre',
            });
          });
        }),
        8
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

  const { totalPagos, montoAprobado, pendientes, rechazados } = resumenPagos(pagos);

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
              {pagos.length} pago{pagos.length === 1 ? '' : 's'} de los últimos 100 pedidos de la tienda en línea
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="px-4 py-3 rounded-[10px] text-sm font-semibold" style={{ backgroundColor: 'var(--danger)', color: 'var(--marfil)', boxShadow: 'var(--mf-sombra-1)' }}>
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <TarjetaKpi icono={Receipt} etiqueta="Total de pagos" cargando={loading} valor={totalPagos} />
          <TarjetaKpi icono={BadgeDollarSign} etiqueta="Monto aprobado" cargando={loading} valor={fmtMoneda(montoAprobado)} />
          <TarjetaKpi icono={Clock3} etiqueta="Pendientes" cargando={loading} valor={pendientes} tono="aviso" />
          <TarjetaKpi icono={XCircle} etiqueta="Rechazados/cancelados" cargando={loading} valor={rechazados} tono="peligro" />
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
              <TableCell rowPadding="lg">{pago.metodo ? etiquetaMetodoPagoPedido(pago.metodo) : '-'}</TableCell>
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
            <p><span className="font-semibold">Método:</span> {pagoDetalle.metodo ? etiquetaMetodoPagoPedido(pagoDetalle.metodo) : '-'}</p>
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
