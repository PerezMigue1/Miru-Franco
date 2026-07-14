'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { BadgeDollarSign, Clock3, ShoppingCart } from 'lucide-react';

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

  const pendientes = compras.filter((c) => c.estado === 'pendiente').length;
  const montoTotal = compras.reduce((acc, c) => acc + (parseFloat(c.total.replace(/[^0-9.]/g, '')) || 0), 0);

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Compras a Proveedores
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {compras.length} compra{compras.length === 1 ? '' : 's'} registradas
            </p>
          </div>
          <Button>+ Nueva Orden de Compra</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <ShoppingCart size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total compras</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{compras.length}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Pendientes de recibir</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{pendientes}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Monto total</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>${montoTotal.toLocaleString('es-MX')}</p>
              </div>
            </div>
          </Card>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Proveedores
          </h2>
          <div className="space-y-3">
            {proveedores.map((proveedor) => (
              <div
                key={proveedor.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: 'var(--fondos-suaves)' }}
              >
                <div>
                  <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {proveedor.nombre}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {proveedor.productos} • Tel: {proveedor.contacto}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Última compra: {proveedor.ultimaCompra}
                  </p>
                </div>
                <Button size="sm">Comprar</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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

      <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Historial de Compras
        </h2>
        <Table headers={['Proveedor', 'Fecha', 'Productos', 'Total', 'Estado', 'Acciones']} headerSutil>
          {compras.map((compra) => (
            <TableRow key={compra.id}>
              <TableCell className="font-semibold" rowPadding="lg">{compra.proveedor}</TableCell>
              <TableCell rowPadding="lg">{compra.fecha}</TableCell>
              <TableCell rowPadding="lg">{compra.productos} productos</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{compra.total}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={compra.estado === 'recibida' ? 'success' : 'warning'}>
                  {compra.estado}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
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
      </div>
    </AdminLayout>
  );
}

