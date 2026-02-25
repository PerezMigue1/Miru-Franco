'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { colors } from '../../../utils/colors';

export default function VentaOnlinePage() {
  const pedidos = [
    { id: 1, cliente: 'María González', productos: 'Shampoo Avina x2', total: '$700', estado: 'pendiente', metodo: 'Transferencia', zona: 'Colonia Juárez', entrega: 'Gratuita' },
    { id: 2, cliente: 'Ana López', productos: 'Acondicionador Tech Italy', total: '$380', estado: 'preparado', metodo: 'Efectivo', zona: 'Centro', entrega: 'Gratuita' },
    { id: 3, cliente: 'Carmen Ruiz', productos: 'Mascarilla Alfaparf', total: '$450', estado: 'enviado', metodo: 'Transferencia', zona: 'Zona Norte', entrega: '$50' },
  ];

  const estados = {
    pendiente: { label: 'Pendiente', variant: 'warning' as const },
    preparado: { label: 'Preparado', variant: 'info' as const },
    enviado: { label: 'Enviado', variant: 'success' as const },
    entregado: { label: 'Entregado', variant: 'success' as const },
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Venta de Productos en Línea"
        subtitle="Gestiona pedidos recibidos vía WhatsApp y redes sociales"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Pendientes</p>
            <p className="text-2xl font-bold" style={{ color: colors.menuTextoPrincipal }}>5</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Preparados</p>
            <p className="text-2xl font-bold" style={{ color: colors.menuTextoPrincipal }}>2</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>En Tránsito</p>
            <p className="text-2xl font-bold" style={{ color: colors.menuTextoPrincipal }}>3</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Entregados</p>
            <p className="text-2xl font-bold" style={{ color: colors.menuTextoPrincipal }}>12</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table headers={['Cliente', 'Productos', 'Total', 'Método de Pago', 'Zona', 'Costo Envío', 'Estado', 'Acciones']}>
          {pedidos.map((pedido) => (
            <TableRow key={pedido.id}>
              <TableCell>{pedido.cliente}</TableCell>
              <TableCell>{pedido.productos}</TableCell>
              <TableCell className="font-semibold">{pedido.total}</TableCell>
              <TableCell>
                <Badge variant={pedido.metodo === 'Efectivo' ? 'success' : 'info'}>
                  {pedido.metodo}
                </Badge>
              </TableCell>
              <TableCell>{pedido.zona}</TableCell>
              <TableCell>
                <Badge variant={pedido.entrega === 'Gratuita' ? 'success' : 'default'}>
                  {pedido.entrega}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={estados[pedido.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[pedido.estado as keyof typeof estados]?.label || pedido.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver</Button>
                  <Button size="sm" variant="primary">
                    {pedido.estado === 'pendiente' ? 'Preparar' : pedido.estado === 'preparado' ? 'Enviar' : 'Rastrear'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Nuevo Pedido Online
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Input label="Teléfono/WhatsApp" placeholder="555-1234-5678" fullWidth />
          <Select
            label="Producto"
            options={[
              { value: '1', label: 'Shampoo Avina - $350' },
              { value: '2', label: 'Acondicionador Tech Italy - $380' },
            ]}
            fullWidth
          />
          <Input label="Cantidad" type="number" defaultValue="1" fullWidth />
          <Input label="Dirección de Entrega" placeholder="Calle, número, colonia" fullWidth />
          <Select
            label="Zona"
            options={[
              { value: 'gratuita', label: 'Colonia Juárez (Gratuita)' },
              { value: 'gratuita2', label: 'Centro (Gratuita)' },
              { value: 'pago', label: 'Otra zona (Con costo)' },
            ]}
            fullWidth
          />
          <Select
            label="Método de Pago"
            options={[
              { value: 'transferencia', label: 'Transferencia' },
              { value: 'efectivo', label: 'Efectivo al recibir' },
            ]}
            fullWidth
          />
          <Input label="Costo de Envío" placeholder="$0.00" fullWidth />
          <div className="md:col-span-2">
            <Button fullWidth>Registrar Pedido</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}

