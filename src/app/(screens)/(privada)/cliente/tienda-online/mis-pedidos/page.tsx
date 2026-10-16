'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import Input from '../../../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../../../components/ui/Table';
import { listarPedidos, etiquetaEstadoPedido, etiquetaMetodoPagoPedido, varianteBadgeEstadoPedido } from '../../../../../services/ecommerce';
import type { PedidoApi } from '../../../../../services/ecommerce';
import { formatearPrecioMXN } from '../../../../../utils/formatoPrecio';
import TarjetaPedidoMovil from './TarjetaPedidoMovil';
import { useTextosSitio } from '../../../../../hooks/useTextosSitio';

export default function MisPedidosPage() {
  const { t } = useTextosSitio();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listarPedidos({ propios: true });
        if (cancelled) return;
        setPedidos(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar pedidos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtrados = pedidos.filter((p) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      String(p.id).includes(q) ||
      (p.creadoEn && p.creadoEn.toLowerCase().includes(q)) ||
      (p.estado && p.estado.toLowerCase().includes(q))
    );
  });

  const formatearFecha = (fecha: string | undefined) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ModuleLayout>
      <PageHeader
        title="Mis pedidos"
        subtitle="Consulta el estado de todos tus pedidos"
        actions={
          <Button onClick={() => router.push('/cliente/tienda-online')}>+ Nuevo pedido</Button>
        }
      />

      {error && (
        <Card className="mb-4 p-4" style={{ borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger-texto)' }}>{error}</p>
        </Card>
      )}

      <div className="mb-6">
        <Input
          placeholder="Buscar por número, fecha o estado…"
          className="w-full max-w-md"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {loading ? (
        <Card className="text-center py-16">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando pedidos…</p>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-lead mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            {pedidos.length === 0 ? t('pedidos.lista.vacia') : t('pedidos.lista.sinResultados')}
          </p>
          <Button onClick={() => router.push('/cliente/tienda-online')}>Explorar productos</Button>
        </Card>
      ) : (
        <Card style={{ animation: 'fadeUp 350ms var(--mf-ease-out) both' }}>
          {/* Por debajo de 640 px, tarjetas: en la tabla el estado y "Ver detalle" quedaban fuera de vista. */}
          <ul className="space-y-3 sm:hidden" aria-label="Mis pedidos">
            {filtrados.map((pedido) => (
              <TarjetaPedidoMovil key={pedido.id} pedido={pedido} fecha={formatearFecha(pedido.creadoEn)} />
            ))}
          </ul>
          <div className="hidden sm:block">
          <Table
            headers={['Número', 'Fecha', 'Total', 'Método de pago', 'Estado', 'Acciones']}
          >
            {filtrados.map((pedido) => (
              <TableRow key={pedido.id}>
                <TableCell className="font-mono font-semibold">#{pedido.id}</TableCell>
                <TableCell>{formatearFecha(pedido.creadoEn)}</TableCell>
                <TableCell className="font-semibold">
                  {formatearPrecioMXN(pedido.total)} {pedido.moneda}
                </TableCell>
                <TableCell>{pedido.metodoPago ? etiquetaMetodoPagoPedido(pedido.metodoPago) : '-'}</TableCell>
                <TableCell>
                  <Badge variant={varianteBadgeEstadoPedido(pedido.estado)}>
                    {etiquetaEstadoPedido(pedido.estado, pedido.metodoPago)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/cliente/tienda-online/mis-pedidos/${pedido.id}`)}
                  >
                    Ver detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </Table>
          </div>
        </Card>
      )}
    </ModuleLayout>
  );
}
