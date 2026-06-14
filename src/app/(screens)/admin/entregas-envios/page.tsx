'use client';

import { useState, useEffect } from 'react';
import { listarPedidos, listarEnviosPorPedido, actualizarEnvio, PedidoApi, EnvioApi } from '../../../services/ecommerce';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

interface EntregaFila {
  id: number;
  pedidoId: number;
  cliente: string;
  direccion: string;
  tipo: string;
  zona: string;
  estado: string;
  mensajero: string;
}

function mapearEnvio(e: EnvioApi, pedido: PedidoApi): EntregaFila {
  return {
    id: e.id,
    pedidoId: pedido.id,
    cliente: pedido.usuarioId ?? '-',
    direccion: pedido.direccionTextoCompleta ?? '-',
    tipo: 'Domicilio',
    zona: '-',
    estado: e.estadoEnvio ?? 'preparado',
    mensajero: e.empresaEnvio ?? '-',
  };
}

export default function EntregasEnviosPage() {
  const [entregas, setEntregas] = useState<EntregaFila[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const pedidos = await listarPedidos();
      const enviados = pedidos.filter((p) => ['preparando', 'enviado', 'pagado'].includes(p.estado));
      const rows: EntregaFila[] = [];
      await Promise.all(
        enviados.map(async (pedido) => {
          const envios = await listarEnviosPorPedido(pedido.id);
          envios.forEach((e) => rows.push(mapearEnvio(e, pedido)));
        })
      );
      setEntregas(rows);
    } catch {
      // mantener tabla vacía en error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleEnviar = async (id: number) => {
    await actualizarEnvio(id, { estadoEnvio: 'en_camino' });
    cargar();
  };

  const handleEntregado = async (id: number) => {
    await actualizarEnvio(id, { estadoEnvio: 'entregado' });
    cargar();
  };

  const estados = {
    preparado: { label: 'Preparado', variant: 'info' as const },
    en_camino: { label: 'En Camino', variant: 'warning' as const },
    entregado: { label: 'Entregado', variant: 'success' as const },
    listo: { label: 'Listo para Recolectar', variant: 'success' as const },
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Gestión de Entregas y Envíos"
        subtitle="Coordina entregas a domicilio y recolecciones en tienda"
      />

      <Card>
        <Table headers={['Cliente', 'Dirección', 'Tipo', 'Zona', 'Estado', 'Mensajero', 'Acciones']}>
          {entregas.map((entrega) => (
            <TableRow key={entrega.id}>
              <TableCell>{entrega.cliente}</TableCell>
              <TableCell>{entrega.direccion}</TableCell>
              <TableCell>
                <Badge variant={entrega.tipo === 'Domicilio' ? 'info' : 'default'}>
                  {entrega.tipo}
                </Badge>
              </TableCell>
              <TableCell>
                {entrega.zona === 'Gratuita' ? (
                  <Badge variant="success">{entrega.zona}</Badge>
                ) : (
                  entrega.zona
                )}
              </TableCell>
              <TableCell>
                <Badge variant={estados[entrega.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[entrega.estado as keyof typeof estados]?.label || entrega.estado}
                </Badge>
              </TableCell>
              <TableCell>{entrega.mensajero}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                  {entrega.estado === 'preparado' && (
                    <Button size="sm" onClick={() => handleEnviar(entrega.id)}>Enviar</Button>
                  )}
                  {entrega.estado === 'en_camino' && (
                    <Button size="sm" variant="success" onClick={() => handleEntregado(entrega.id)}>Marcar Entregado</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Coordinar Nueva Entrega
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Select
            label="Tipo de Entrega"
            options={[
              { value: 'domicilio', label: 'Entrega a Domicilio' },
              { value: 'recoleccion', label: 'Recolección en Tienda' },
            ]}
            fullWidth
          />
          <Input label="Dirección Completa" placeholder="Calle, número, colonia" fullWidth />
          <Select
            label="Zona"
            options={[
              { value: 'gratuita1', label: 'Colonia Juárez (Gratuita)' },
              { value: 'gratuita2', label: 'Centro (Gratuita)' },
              { value: 'gratuita3', label: 'Centro Reloj (Gratuita)' },
              { value: 'gratuita4', label: 'Mercado (Gratuita)' },
              { value: 'pago', label: 'Otra zona (Con costo)' },
            ]}
            fullWidth
          />
          <Input label="Costo de Envío" placeholder="$0.00" fullWidth />
          <Select
            label="Mensajero"
            options={[
              { value: 'motociclista1', label: 'Motociclista 1' },
              { value: 'motociclista2', label: 'Motociclista 2' },
            ]}
            fullWidth
          />
          <div className="md:col-span-2">
            <Button fullWidth>Coordinar Entrega</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}
