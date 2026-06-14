'use client';

import { useState, useEffect } from 'react';
import { obtenerCaducidades, CaducidadApi } from '../../../services/inventarioMovimientos';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';

interface ProductoCaducidad {
  id: number;
  nombre: string;
  fechaApertura: string;
  fechaCaducidad: string;
  estado: 'vigente' | 'proximo' | 'vencido';
  diasRestantes: number;
}

function mapearCaducidad(c: CaducidadApi, idx: number): ProductoCaducidad {
  let estado: 'vigente' | 'proximo' | 'vencido' = 'vigente';
  if (c.diasRestantes < 0) estado = 'vencido';
  else if (c.diasRestantes <= 30) estado = 'proximo';
  return {
    id: c.presentacionId || idx,
    nombre: [c.productoNombre, c.tamanio].filter(Boolean).join(' ') || '-',
    fechaApertura: '-',
    fechaCaducidad: c.fechaCaducidad ?? '-',
    estado,
    diasRestantes: c.diasRestantes,
  };
}

export default function ControlCaducidadPage() {
  const [productos, setProductos] = useState<ProductoCaducidad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obtenerCaducidades(30)
      .then((data) => setProductos(data.map(mapearCaducidad)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const estados = {
    vigente: { label: 'Vigente', variant: 'success' as const },
    proximo: { label: 'Próximo a Vencer', variant: 'warning' as const },
    vencido: { label: 'Vencido', variant: 'danger' as const },
  };

  const vigentes = productos.filter((p) => p.estado === 'vigente').length;
  const proximos = productos.filter((p) => p.estado === 'proximo').length;
  const vencidos = productos.filter((p) => p.estado === 'vencido').length;

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
            <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{loading ? '…' : vigentes}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Próximos a Vencer</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>{loading ? '…' : proximos}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Vencidos</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--danger)' }}>{loading ? '…' : vencidos}</p>
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
