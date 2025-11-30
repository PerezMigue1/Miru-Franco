'use client';

import { useParams } from 'next/navigation';
import ModuleLayout from '../../../components/layouts/ModuleLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import { colors } from '../../../utils/colors';
import { getCategoryColor } from '../../../utils/categoryColors';

export default function ProductoDetalleAdminPage() {
  const params = useParams();
  const id = params.id as string;
  
  const producto = {
    id: parseInt(id),
    nombre: 'Shampoo Avina',
    precio: '$350',
    categoria: 'Cuidado',
    stock: 15,
    minimo: 10,
    tipo: 'Venta',
    estado: 'disponible',
    proveedor: 'Avina',
    descripcion: 'Limpieza profunda y cuidado intensivo',
  };

  const movimientos = [
    { id: 1, tipo: 'Venta', cantidad: -2, fecha: '2024-01-15', cliente: 'María González' },
    { id: 2, tipo: 'Compra', cantidad: 20, fecha: '2024-01-10', proveedor: 'Avina' },
    { id: 3, tipo: 'Venta', cantidad: -3, fecha: '2024-01-12', cliente: 'Ana López' },
  ];

  return (
    <ModuleLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-6xl mx-auto">
          <Button variant="outline" onClick={() => window.history.back()} className="mb-6">
            ← Volver
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-hero mb-2" style={{ color: colors.menuTextoPrincipal }}>
                      {producto.nombre}
                    </h1>
                    <Badge variant={getCategoryColor(producto.categoria)} size="lg">
                      {producto.categoria}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Editar</Button>
                    <Button variant="danger">Eliminar</Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Precio</p>
                    <p className="text-xl font-bold" style={{ color: colors.menuTextoPrincipal }}>
                      {producto.precio}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Stock</p>
                    <p className="text-xl font-bold" style={{ color: colors.menuTextoPrincipal }}>
                      {producto.stock}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Mínimo</p>
                    <p className="text-xl font-bold" style={{ color: colors.menuTextoPrincipal }}>
                      {producto.minimo}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Proveedor</p>
                    <p className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                      {producto.proveedor}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Descripción" defaultValue={producto.descripcion} fullWidth />
                  <Input label="Categoría" defaultValue={producto.categoria} fullWidth />
                  <Input label="Precio" defaultValue={producto.precio} fullWidth />
                  <Input label="Stock Actual" type="number" defaultValue={producto.stock.toString()} fullWidth />
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Movimientos Recientes
                </h2>
                <Table headers={['Tipo', 'Cantidad', 'Fecha', 'Referencia']}>
                  {movimientos.map((movimiento) => (
                    <TableRow key={movimiento.id}>
                      <TableCell>
                        <Badge variant={movimiento.tipo === 'Venta' ? 'success' : 'info'}>
                          {movimiento.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className={movimiento.cantidad < 0 ? 'text-red-600' : 'text-green-600'}>
                        {movimiento.cantidad > 0 ? '+' : ''}{movimiento.cantidad}
                      </TableCell>
                      <TableCell>{movimiento.fecha}</TableCell>
                      <TableCell>{movimiento.cliente || movimiento.proveedor}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Estado del Producto
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span style={{ color: colors.encabezadosAlterno }}>Tipo:</span>
                    <Badge variant={producto.tipo === 'Venta' ? 'success' : 'info'}>
                      {producto.tipo}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.encabezadosAlterno }}>Estado:</span>
                    <Badge variant={producto.estado === 'disponible' ? 'success' : 'warning'}>
                      {producto.estado}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.encabezadosAlterno }}>Stock vs Mínimo:</span>
                    <span className="font-semibold" style={{ color: producto.stock <= producto.minimo ? colors.warning : colors.success }}>
                      {producto.stock > producto.minimo ? '✓ OK' : '⚠ Bajo'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Acciones Rápidas
                </h3>
                <div className="space-y-2">
                  <Button variant="outline" fullWidth>Registrar Entrada</Button>
                  <Button variant="outline" fullWidth>Registrar Salida</Button>
                  <Button variant="outline" fullWidth>Ver Historial Completo</Button>
                  <Button variant="outline" fullWidth>Actualizar Precio</Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

