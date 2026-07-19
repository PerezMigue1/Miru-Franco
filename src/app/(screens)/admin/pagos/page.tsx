'use client';

import { useState, useEffect } from 'react';
import { listarPedidos, listarPagosPorPedido, PedidoApi, PagoApi } from '../../../services/ecommerce';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { BadgeDollarSign, Banknote, Clock3, CreditCard } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);

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
        setError('Error al cargar pagos');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const totalDia = pagos.reduce((acc, p) => acc + parseFloat(p.monto.replace('$', '') || '0'), 0);

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
              {pagos.length} pago{pagos.length === 1 ? '' : 's'} registrados
            </p>
          </div>
          <Button>+ Registrar Pago</Button>
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
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total del día</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : `$${totalDia.toFixed(2)}`}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Banknote size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Efectivo</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CreditCard size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Transferencias</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Anticipos pendientes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--warning-texto)' }}>-</p>
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
        <Table headers={['Cliente', 'Concepto', 'Monto', 'Método', 'Fecha', 'Tipo', 'Acciones']} headerSutil>
          {pagos.map((pago) => (
            <TableRow key={pago.id}>
              <TableCell className="font-semibold" rowPadding="lg">{pago.cliente}</TableCell>
              <TableCell rowPadding="lg">{pago.concepto}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{pago.monto}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={pago.metodo === 'Efectivo' ? 'success' : 'info'}>
                  {pago.metodo}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">{pago.fecha}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={pago.tipo === 'Completo' ? 'success' : 'warning'}>
                  {pago.tipo}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <Button size="sm" variant="outline">Ver Detalles</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        )}
        </Card>

        <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Registrar nuevo pago
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
      </div>
    </AdminLayout>
  );
}
