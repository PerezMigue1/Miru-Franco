'use client';

import { useRouter } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import Input from '../../../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../../../components/ui/Table';
export default function MisPedidosPage() {
  const router = useRouter();

  const pedidos = [
    {
      id: 'PED-2024-001',
      fecha: '2024-02-15',
      productos: 3,
      total: 930,
      estado: 'en-proceso',
      metodoPago: 'Tarjeta',
    },
    {
      id: 'PED-2024-002',
      fecha: '2024-02-10',
      productos: 2,
      total: 530,
      estado: 'enviado',
      metodoPago: 'PayPal',
    },
    {
      id: 'PED-2024-003',
      fecha: '2024-02-05',
      productos: 1,
      total: 350,
      estado: 'entregado',
      metodoPago: 'Tarjeta',
    },
    {
      id: 'PED-2024-004',
      fecha: '2024-01-28',
      productos: 4,
      total: 1200,
      estado: 'entregado',
      metodoPago: 'Transferencia',
    },
  ];

  const obtenerVariantEstado = (estado: string) => {
    switch (estado) {
      case 'en-proceso':
        return 'warning';
      case 'enviado':
        return 'info';
      case 'entregado':
        return 'success';
      case 'cancelado':
        return 'danger';
      default:
        return 'default';
    }
  };

  const formatearEstado = (estado: string) => {
    const estados: { [key: string]: string } = {
      'en-proceso': 'En Proceso',
      'enviado': 'Enviado',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado',
    };
    return estados[estado] || estado;
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ModuleLayout>
      <PageHeader
        title="Mis Pedidos"
        subtitle="Consulta el estado de todos tus pedidos"
        actions={
          <Button onClick={() => router.push('/cliente/tienda-online')}>
            + Nuevo Pedido
          </Button>
        }
      />

      <div className="mb-6">
        <Input 
          placeholder="Buscar pedido por número, fecha..." 
          className="w-full max-w-md" 
        />
      </div>

      <Card>
        <Table headers={['Número de Pedido', 'Fecha', 'Productos', 'Total', 'Método de Pago', 'Estado', 'Acciones']}>
          {pedidos.map((pedido) => (
            <TableRow key={pedido.id}>
              <TableCell className="font-mono font-semibold">{pedido.id}</TableCell>
              <TableCell>{formatearFecha(pedido.fecha)}</TableCell>
              <TableCell>{pedido.productos} producto{pedido.productos > 1 ? 's' : ''}</TableCell>
              <TableCell className="font-semibold">${pedido.total.toLocaleString()}</TableCell>
              <TableCell>{pedido.metodoPago}</TableCell>
              <TableCell>
                <Badge variant={obtenerVariantEstado(pedido.estado)}>
                  {formatearEstado(pedido.estado)}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/cliente/tienda-online/mis-pedidos/${pedido.id}`)}
                >
                  Ver Detalle
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      {pedidos.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-lead mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            No tienes pedidos realizados
          </p>
          <Button onClick={() => router.push('/cliente/tienda-online')}>
            Explorar Productos
          </Button>
        </Card>
      )}
    </ModuleLayout>
  );
}










