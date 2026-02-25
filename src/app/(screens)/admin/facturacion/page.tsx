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

export default function FacturacionPage() {
  const facturas = [
    { id: 1, cliente: 'María González', concepto: 'Servicio - Corte', monto: '$350', fecha: '2024-01-15', tipo: 'Nota de Remisión', estado: 'entregada' },
    { id: 2, cliente: 'Ana López', concepto: 'Producto - Shampoo', monto: '$380', fecha: '2024-01-14', tipo: 'Factura Electrónica', estado: 'enviada' },
    { id: 3, cliente: 'Carmen Ruiz', concepto: 'Servicio - Nanoplastía', monto: '$1,200', fecha: '2024-01-13', tipo: 'Nota de Remisión', estado: 'entregada' },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Facturación"
        subtitle="Gestiona notas de remisión y facturas electrónicas"
        actions={
          <Button>+ Nueva Nota/Factura</Button>
        }
      />

      <Card>
        <Table headers={['Cliente', 'Concepto', 'Monto', 'Fecha', 'Tipo', 'Estado', 'Acciones']}>
          {facturas.map((factura) => (
            <TableRow key={factura.id}>
              <TableCell className="font-semibold">{factura.cliente}</TableCell>
              <TableCell>{factura.concepto}</TableCell>
              <TableCell className="font-semibold">{factura.monto}</TableCell>
              <TableCell>{factura.fecha}</TableCell>
              <TableCell>
                <Badge variant={factura.tipo === 'Factura Electrónica' ? 'info' : 'default'}>
                  {factura.tipo}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={factura.estado === 'entregada' ? 'success' : 'warning'}>
                  {factura.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver</Button>
                  <Button size="sm">Descargar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Generar Nota/Factura
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Select
            label="Tipo de Documento"
            options={[
              { value: 'nota', label: 'Nota de Remisión' },
              { value: 'factura', label: 'Factura Electrónica' },
            ]}
            fullWidth
          />
          <Input label="Concepto" placeholder="Descripción del servicio/producto" fullWidth />
          <Input label="Monto" placeholder="$0.00" fullWidth />
          {false && ( // Mostrar solo si es factura
            <>
              <Input label="RFC" placeholder="RFC del cliente" fullWidth />
              <Input label="Razón Social" placeholder="Razón social" fullWidth />
              <Input label="Uso de CFDI" placeholder="Uso de CFDI" fullWidth />
              <Input label="Correo Electrónico" type="email" placeholder="correo@ejemplo.com" fullWidth />
            </>
          )}
          <div className="md:col-span-2">
            <Button fullWidth>Generar Documento</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}

