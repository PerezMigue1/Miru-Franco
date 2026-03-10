'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
export default function PagosPage() {
  const pagos = [
    { id: 1, cliente: 'María González', concepto: 'Servicio - Corte', monto: '$350', metodo: 'Efectivo', fecha: '2024-01-15 10:30', tipo: 'Completo' },
    { id: 2, cliente: 'Ana López', concepto: 'Anticipo - Alaciado', monto: '$500', metodo: 'Transferencia', fecha: '2024-01-14 14:00', tipo: 'Anticipo' },
    { id: 3, cliente: 'Carmen Ruiz', concepto: 'Servicio - Nanoplastía', monto: '$1,200', metodo: 'Efectivo', fecha: '2024-01-13 12:00', tipo: 'Completo' },
  ];

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
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>$2,050</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Efectivo</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>$1,550</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Transferencias</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>$500</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Anticipos Pendientes</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>$1,200</p>
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

