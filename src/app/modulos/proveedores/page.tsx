'use client';

import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { colors } from '../../utils/colors';

export default function ProveedoresPage() {
  const proveedores = [
    { id: 1, nombre: 'Floractiv', contacto: '555-1001', productos: 'Nanoplastía', compras: 12, ultimaCompra: '2024-01-10' },
    { id: 2, nombre: 'Avina', contacto: '555-1002', productos: 'Cabello y Tratamientos', compras: 18, ultimaCompra: '2024-01-08' },
    { id: 3, nombre: 'Tech Italy', contacto: '555-1003', productos: 'Productos Profesionales', compras: 15, ultimaCompra: '2024-01-12' },
    { id: 4, nombre: 'Alfaparf', contacto: '555-1004', productos: 'Productos Profesionales', compras: 10, ultimaCompra: '2024-01-05' },
  ];

  return (
    <ModuleLayout>
      <PageHeader
        title="Proveedores"
        subtitle="Gestiona la relación con proveedores de productos profesionales"
        actions={
          <Button>+ Nuevo Proveedor</Button>
        }
      />

      <Card>
        <Table headers={['Proveedor', 'Contacto', 'Productos', 'Compras', 'Última Compra', 'Acciones']}>
          {proveedores.map((proveedor) => (
            <TableRow key={proveedor.id}>
              <TableCell className="font-semibold">{proveedor.nombre}</TableCell>
              <TableCell>{proveedor.contacto}</TableCell>
              <TableCell>{proveedor.productos}</TableCell>
              <TableCell>{proveedor.compras}</TableCell>
              <TableCell>{proveedor.ultimaCompra}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                  <Button size="sm">Editar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Nuevo Proveedor
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre del Proveedor" placeholder="Nombre comercial" fullWidth />
          <Input label="Contacto" placeholder="Teléfono o email" fullWidth />
          <Input label="Productos que Suministra" placeholder="Descripción de productos" fullWidth />
          <Input label="Dirección" placeholder="Dirección del proveedor" fullWidth />
          <div className="md:col-span-2">
            <Button fullWidth>Registrar Proveedor</Button>
          </div>
        </div>
      </Card>
    </ModuleLayout>
  );
}

