'use client';

import { useRouter } from 'next/navigation';
import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { colors } from '../../utils/colors';
import { getCategoryColor } from '../../utils/categoryColors';

export default function InventarioPage() {
  const router = useRouter();
  
  const productos = [
    { id: 1, nombre: 'Shampoo Avina', categoria: 'Cuidado', stock: 15, minimo: 10, tipo: 'Venta', estado: 'disponible' },
    { id: 2, nombre: 'Nanoplastía Premium', categoria: 'Químico', stock: 5, minimo: 8, tipo: 'Uso Interno', estado: 'bajo' },
    { id: 3, nombre: 'Acondicionador Tech Italy', categoria: 'Cuidado', stock: 12, minimo: 10, tipo: 'Venta', estado: 'disponible' },
    { id: 4, nombre: 'Mascarilla Alfaparf', categoria: 'Tratamiento', stock: 3, minimo: 5, tipo: 'Venta', estado: 'bajo' },
  ];

  return (
    <ModuleLayout>
      <PageHeader
        title="Gestión de Inventario"
        subtitle="Control y supervisión en tiempo real de todos los productos"
        actions={
          <Button>+ Agregar Producto</Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Total Productos</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>45</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Stock Bajo</p>
            <p className="text-3xl font-bold" style={{ color: colors.warning }}>8</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Próximos a Caducar</p>
            <p className="text-3xl font-bold" style={{ color: colors.danger }}>2</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Valor Total</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>$45,000</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-page-title" style={{ color: colors.menuTextoPrincipal }}>
            Productos
          </h2>
          <div className="flex gap-2">
            <Input placeholder="Buscar producto..." className="w-64" />
            <Select
              options={[
                { value: 'all', label: 'Todas las categorías' },
                { value: 'cuidado', label: 'Cuidado' },
                { value: 'quimico', label: 'Químico' },
              ]}
            />
          </div>
        </div>
        <Table headers={['Producto', 'Categoría', 'Stock', 'Mínimo', 'Tipo', 'Estado', 'Acciones']}>
          {productos.map((producto) => (
            <TableRow key={producto.id}>
              <TableCell className="font-semibold">{producto.nombre}</TableCell>
              <TableCell>
                <Badge variant={getCategoryColor(producto.categoria)} size="sm">
                  {producto.categoria}
                </Badge>
              </TableCell>
              <TableCell>{producto.stock}</TableCell>
              <TableCell>{producto.minimo}</TableCell>
              <TableCell>
                <Badge variant={producto.tipo === 'Venta' ? 'success' : 'info'}>
                  {producto.tipo}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={producto.estado === 'disponible' ? 'success' : 'warning'}>
                  {producto.estado === 'disponible' ? 'Disponible' : 'Stock Bajo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push(`/modulos/productos/${producto.id}`)}
                  >
                    Ver Detalles
                  </Button>
                  <Button size="sm" variant="primary">Movimientos</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </ModuleLayout>
  );
}

