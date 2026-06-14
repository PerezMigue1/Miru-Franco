'use client';

import { useState, useEffect } from 'react';
import { listarPedidos, listarDevolucionesPedido, PedidoApi, DevolucionApi } from '../../../services/ecommerce';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

interface DevolucionFila {
  id: number;
  pedidoId: number;
  cliente: string;
  producto: string;
  motivo: string;
  estado: string;
  fecha: string;
}

function mapearDevolucion(d: DevolucionApi, pedido: PedidoApi): DevolucionFila {
  return {
    id: d.id,
    pedidoId: pedido.id,
    cliente: pedido.usuarioId ?? '-',
    producto: `Pedido #${pedido.id}`,
    motivo: d.motivo ?? '-',
    estado: d.estado ?? 'pendiente',
    fecha: d.creadoEn ? d.creadoEn.slice(0, 10) : '-',
  };
}

export default function DevolucionesCambiosPage() {
  const [solicitudes, setSolicitudes] = useState<DevolucionFila[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const pedidos = await listarPedidos();
        const rows: DevolucionFila[] = [];
        await Promise.all(
          pedidos.map(async (pedido) => {
            const devs = await listarDevolucionesPedido(pedido.id);
            devs.forEach((d) => rows.push(mapearDevolucion(d, pedido)));
          })
        );
        setSolicitudes(rows);
      } catch {
        // mantener tabla vacía
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

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
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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
