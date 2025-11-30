'use client';

import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { colors } from '../../utils/colors';

export default function ComprasProveedoresPage() {
  const proveedores = [
    { id: 1, nombre: 'Floractiv', contacto: '555-1001', productos: 'Nanoplastía', ultimaCompra: '2024-01-10' },
    { id: 2, nombre: 'Avina', contacto: '555-1002', productos: 'Cabello y Tratamientos', ultimaCompra: '2024-01-08' },
    { id: 3, nombre: 'Tech Italy', contacto: '555-1003', productos: 'Productos Profesionales', ultimaCompra: '2024-01-12' },
    { id: 4, nombre: 'Alfaparf', contacto: '555-1004', productos: 'Productos Profesionales', ultimaCompra: '2024-01-05' },
  ];

  const compras = [
    { id: 1, proveedor: 'Avina', fecha: '2024-01-08', productos: 12, total: '$8,500', estado: 'recibida' },
    { id: 2, proveedor: 'Tech Italy', fecha: '2024-01-12', productos: 8, total: '$6,200', estado: 'pendiente' },
    { id: 3, proveedor: 'Floractiv', fecha: '2024-01-10', productos: 5, total: '$4,800', estado: 'recibida' },
  ];

  return (
    <ModuleLayout>
      <PageHeader
        title="Compras a Proveedores"
        subtitle="Gestiona las compras y recepción de productos de proveedores"
        actions={
          <Button>+ Nueva Orden de Compra</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Proveedores
          </h2>
          <div className="space-y-3">
            {proveedores.map((proveedor) => (
              <div
                key={proveedor.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <div>
                  <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                    {proveedor.nombre}
                  </p>
                  <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                    {proveedor.productos} • Tel: {proveedor.contacto}
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.encabezadosAlterno }}>
                    Última compra: {proveedor.ultimaCompra}
                  </p>
                </div>
                <Button size="sm">Comprar</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Nueva Orden de Compra
          </h2>
          <div className="space-y-4">
            <Select
              label="Proveedor"
              options={proveedores.map(p => ({ value: p.id.toString(), label: p.nombre }))}
              fullWidth
            />
            <Input label="Fecha de Pedido" type="date" fullWidth />
            <Input label="Productos" placeholder="Lista de productos..." fullWidth />
            <Input label="Total Estimado" placeholder="$0.00" fullWidth />
            <Button fullWidth>Crear Orden</Button>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Historial de Compras
        </h2>
        <Table headers={['Proveedor', 'Fecha', 'Productos', 'Total', 'Estado', 'Acciones']}>
          {compras.map((compra) => (
            <TableRow key={compra.id}>
              <TableCell className="font-semibold">{compra.proveedor}</TableCell>
              <TableCell>{compra.fecha}</TableCell>
              <TableCell>{compra.productos} productos</TableCell>
              <TableCell className="font-semibold">{compra.total}</TableCell>
              <TableCell>
                <Badge variant={compra.estado === 'recibida' ? 'success' : 'warning'}>
                  {compra.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                  {compra.estado === 'pendiente' && (
                    <Button size="sm">Recibir</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </ModuleLayout>
  );
}

