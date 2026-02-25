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

export default function DevolucionesCambiosPage() {
  const solicitudes = [
    { id: 1, cliente: 'María González', producto: 'Shampoo Avina', motivo: 'Producto incorrecto', estado: 'pendiente', fecha: '2024-01-15' },
    { id: 2, cliente: 'Ana López', producto: 'Acondicionador Tech Italy', motivo: 'Equivocación', estado: 'procesado', fecha: '2024-01-14' },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Devoluciones y Cambios de Productos"
        subtitle="Gestiona cambios de productos (no se realizan reembolsos en efectivo)"
      />

      <Card>
        <Table headers={['Cliente', 'Producto', 'Motivo', 'Fecha', 'Estado', 'Acciones']}>
          {solicitudes.map((solicitud) => (
            <TableRow key={solicitud.id}>
              <TableCell className="font-semibold">{solicitud.cliente}</TableCell>
              <TableCell>{solicitud.producto}</TableCell>
              <TableCell>{solicitud.motivo}</TableCell>
              <TableCell>{solicitud.fecha}</TableCell>
              <TableCell>
                <Badge variant={solicitud.estado === 'pendiente' ? 'warning' : 'success'}>
                  {solicitud.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                  {solicitud.estado === 'pendiente' && (
                    <Button size="sm">Procesar Cambio</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Nueva Solicitud de Cambio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Input label="Producto a Cambiar" placeholder="Nombre del producto" fullWidth />
          <Select
            label="Motivo"
            options={[
              { value: 'incorrecto', label: 'Producto Incorrecto' },
              { value: 'equivocacion', label: 'Equivocación' },
              { value: 'otro', label: 'Otro' },
            ]}
            fullWidth
          />
          <Input label="Producto de Reemplazo" placeholder="Seleccionar producto..." fullWidth />
          <Input label="Diferencia de Precio" placeholder="$0.00" fullWidth />
          <div className="md:col-span-2">
            <Button fullWidth>Procesar Cambio</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}

