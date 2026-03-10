'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';

export default function ControlCaducidadPage() {
  const productos = [
    { id: 1, nombre: 'Shampoo Avina', fechaApertura: '2024-01-01', fechaCaducidad: '2024-04-01', estado: 'vigente', diasRestantes: 75 },
    { id: 2, nombre: 'Mascarilla Alfaparf', fechaApertura: '2023-12-15', fechaCaducidad: '2024-02-15', estado: 'proximo', diasRestantes: 30 },
    { id: 3, nombre: 'Aceite Floractiv', fechaApertura: '2023-11-20', fechaCaducidad: '2024-01-20', estado: 'vencido', diasRestantes: -5 },
  ];

  const estados = {
    vigente: { label: 'Vigente', variant: 'success' as const },
    proximo: { label: 'Próximo a Vencer', variant: 'warning' as const },
    vencido: { label: 'Vencido', variant: 'danger' as const },
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Control de Productos con Caducidad"
        subtitle="Monitorea productos abiertos y próximos a caducar"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Vigentes</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>18</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Próximos a Vencer</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>3</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Vencidos</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--danger)' }}>1</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table headers={['Producto', 'Fecha de Apertura', 'Fecha de Caducidad', 'Días Restantes', 'Estado', 'Acciones']}>
          {productos.map((producto) => (
            <TableRow key={producto.id}>
              <TableCell className="font-semibold">{producto.nombre}</TableCell>
              <TableCell>{producto.fechaApertura}</TableCell>
              <TableCell>{producto.fechaCaducidad}</TableCell>
              <TableCell>
                <span style={{ color: producto.diasRestantes < 0 ? 'var(--danger)' : producto.diasRestantes < 30 ? 'var(--warning)' : 'var(--success)' }}>
                  {producto.diasRestantes > 0 ? `${producto.diasRestantes} días` : `Vencido hace ${Math.abs(producto.diasRestantes)} días`}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={estados[producto.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[producto.estado as keyof typeof estados]?.label || producto.estado}
                </Badge>
              </TableCell>
              <TableCell>
                {producto.estado === 'vencido' && (
                  <Button size="sm" variant="danger">Descartar</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </AdminLayout>
  );
}

