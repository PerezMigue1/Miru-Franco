'use client';

import { useState, useEffect } from 'react';
import { listarPedidos, listarPagosPorPedido, PedidoApi, PagoApi } from '../../../services/ecommerce';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

interface PagoFila {
  id: number;
  pedidoId: number;
  cliente: string;
  concepto: string;
  monto: string;
  metodo: string;
  fecha: string;
  tipo: string;
}

function mapearPago(p: PagoApi, pedido: PedidoApi): PagoFila {
  return {
    id: p.id,
    pedidoId: pedido.id,
    cliente: pedido.usuarioId ?? '-',
    concepto: `Pedido #${pedido.id}`,
    monto: `$${p.monto.toFixed(2)}`,
    metodo: p.metodo || '-',
    fecha: '-',
    tipo: p.intentoNumero > 1 ? 'Anticipo' : 'Completo',
  };
}

export default function PagosPage() {
  const [pagos, setPagos] = useState<PagoFila[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const pedidos = await listarPedidos();
        const rows: PagoFila[] = [];
        await Promise.all(
          pedidos.map(async (pedido) => {
            const ps = await listarPagosPorPedido(pedido.id);
            ps.forEach((p) => rows.push(mapearPago(p, pedido)));
          })
        );
        setPagos(rows);
      } catch {
        // mantener tabla vacía
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const totalDia = pagos.reduce((acc, p) => acc + parseFloat(p.monto.replace('$', '') || '0'), 0);

  return (
    <AdminLayout>
      <PageHeader
        title="Pagos"
        subtitle="Registra y gestiona todos los pagos realizados por servicios, productos y anticipos"
        actions={
          <Button>+ Registrar Pago</Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Total del Día</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : `$${totalDia.toFixed(2)}`}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Efectivo</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Transferencias</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Anticipos Pendientes</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>-</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table headers={['Cliente', 'Concepto', 'Monto', 'Método', 'Fecha', 'Tipo', 'Acciones']}>
          {pagos.map((pago) => (
            <TableRow key={pago.id}>
              <TableCell className="font-semibold">{pago.cliente}</TableCell>
              <TableCell>{pago.concepto}</TableCell>
              <TableCell className="font-semibold">{pago.monto}</TableCell>
              <TableCell>
                <Badge variant={pago.metodo === 'Efectivo' ? 'success' : 'info'}>
                  {pago.metodo}
                </Badge>
              </TableCell>
              <TableCell>{pago.fecha}</TableCell>
              <TableCell>
                <Badge variant={pago.tipo === 'Completo' ? 'success' : 'warning'}>
                  {pago.tipo}
                </Badge>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline">Ver Detalles</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Registrar Nuevo Pago
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Select
            label="Concepto"
            options={[
              { value: 'servicio', label: 'Servicio' },
              { value: 'producto', label: 'Producto' },
              { value: 'anticipo', label: 'Anticipo' },
            ]}
            fullWidth
          />
          <Input label="Monto" placeholder="$0.00" fullWidth />
          <Select
            label="Método de Pago"
            options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'transferencia', label: 'Transferencia' },
            ]}
            fullWidth
          />
          <Input label="Fecha" type="datetime-local" fullWidth />
          <div className="md:col-span-2">
            <Button fullWidth>Registrar Pago</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}
