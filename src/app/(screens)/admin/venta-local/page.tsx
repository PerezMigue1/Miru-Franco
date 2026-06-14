'use client';

import { useState, useEffect } from 'react';
import { listarVentas, crearVenta, cancelarVenta, VentaLocalApi } from '../../../services/pos';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import { getCategoryColor } from '../../../utils/categoryColors';

interface VentaFila {
  id: number;
  cliente: string;
  productos: string;
  total: string;
  metodo: string;
  fecha: string;
}

function mapearVenta(v: VentaLocalApi): VentaFila {
  const itemsDesc = v.items.length > 0 ? `${v.items.length} ítem(s)` : '-';
  return {
    id: v.id,
    cliente: v.clienteId ?? 'Cliente general',
    productos: itemsDesc,
    total: v.total != null ? `$${v.total.toFixed(2)}` : '-',
    metodo: v.metodoPago || '-',
    fecha: v.creadoEn ? new Date(v.creadoEn).toLocaleString('es-MX') : '-',
  };
}

export default function VentaLocalPage() {
  const productos = [
    { id: 1, nombre: 'Shampoo Avina', precio: '$350', stock: 15, categoria: 'Cuidado' },
    { id: 2, nombre: 'Acondicionador Tech Italy', precio: '$380', stock: 12, categoria: 'Cuidado' },
    { id: 3, nombre: 'Mascarilla Alfaparf', precio: '$450', stock: 8, categoria: 'Tratamiento' },
    { id: 4, nombre: 'Aceite Floractiv', precio: '$280', stock: 20, categoria: 'Tratamiento' },
  ];

  const [ventasHoy, setVentasHoy] = useState<VentaFila[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    setLoading(true);
    listarVentas({ desde: hoy })
      .then(({ data }) => setVentasHoy(data.map(mapearVenta)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  return (
    <AdminLayout>
      <PageHeader
        title="Venta de Productos en el Local"
        subtitle="Gestiona las ventas de productos directamente en el salón"
        actions={
          <Button>+ Nueva Venta</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Nueva Venta
          </h2>
          <div className="space-y-4">
            <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
            <Select
              label="Producto"
              options={productos.map(p => ({ value: p.id.toString(), label: `${p.nombre} - ${p.precio}` }))}
              fullWidth
            />
            <Input label="Cantidad" type="number" defaultValue="1" fullWidth />
            <Input label="Precio Unitario" placeholder="$0.00" fullWidth />
            <Input label="Total" placeholder="$0.00" fullWidth />
            <Select
              label="Método de Pago"
              options={[
                { value: 'efectivo', label: 'Efectivo' },
                { value: 'transferencia', label: 'Transferencia' },
              ]}
              fullWidth
            />
            <Button fullWidth>Procesar Venta</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Productos Disponibles
          </h2>
          <div className="space-y-3">
            {productos.map((producto) => (
              <div
                key={producto.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'var(--fondos-suaves)' }}
              >
                <div>
                  <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {producto.nombre}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {producto.precio} • Stock: {producto.stock}
                  </p>
                </div>
                <Badge variant={getCategoryColor(producto.categoria)}>
                  {producto.categoria}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Ventas de Hoy
        </h2>
        <Table headers={['Cliente', 'Productos', 'Total', 'Método de Pago', 'Fecha', 'Acciones']}>
          {ventasHoy.map((venta) => (
            <TableRow key={venta.id}>
              <TableCell>{venta.cliente}</TableCell>
              <TableCell>{venta.productos}</TableCell>
              <TableCell className="font-semibold">{venta.total}</TableCell>
              <TableCell>
                <Badge variant={venta.metodo === 'efectivo' || venta.metodo === 'Efectivo' ? 'success' : 'info'}>
                  {venta.metodo}
                </Badge>
              </TableCell>
              <TableCell>{venta.fecha}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline">Ver Detalles</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </AdminLayout>
  );
}
