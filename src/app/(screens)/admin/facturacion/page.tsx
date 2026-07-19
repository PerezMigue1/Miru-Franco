'use client';

import { useState, useEffect } from 'react';
import { listarPedidos, listarFacturasPorPedido, PedidoApi, FacturaApi } from '../../../services/ecommerce';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { BadgeDollarSign, Clock3, Receipt } from 'lucide-react';

interface FacturaFila {
  id: number;
  pedidoId: number;
  cliente: string;
  concepto: string;
  monto: string;
  fecha: string;
  tipo: string;
  estado: string;
}

function mapearFactura(f: FacturaApi, pedido: PedidoApi): FacturaFila {
  return {
    id: f.id,
    pedidoId: pedido.id,
    cliente: pedido.usuarioId ?? '-',
    concepto: `Pedido #${pedido.id}`,
    monto: `$${pedido.total.toFixed(2)}`,
    fecha: f.creadoEn ? f.creadoEn.slice(0, 10) : '-',
    tipo: 'Nota de Remisión',
    estado: f.estado ?? 'entregada',
  };
}

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState<FacturaFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const pedidos = await listarPedidos();
        const rows: FacturaFila[] = [];
        await Promise.all(
          pedidos.map(async (pedido) => {
            const facs = await listarFacturasPorPedido(pedido.id);
            facs.forEach((f) => rows.push(mapearFactura(f, pedido)));
          })
        );
        setFacturas(rows);
      } catch {
        setError('Error al cargar facturas');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const pendientes = facturas.filter((f) => f.estado !== 'entregada').length;
  const montoTotal = facturas.reduce((acc, f) => acc + (parseFloat(f.monto.replace(/[^0-9.]/g, '')) || 0), 0);

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Facturación
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {facturas.length} documento{facturas.length === 1 ? '' : 's'} registrados
            </p>
          </div>
          <Button>+ Nueva Nota/Factura</Button>
        </div>

        {error && (
          <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Receipt size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total documentos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{facturas.length}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Pendientes</p>
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

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando facturas…</p>
        ) : facturas.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay facturas registradas.</p>
        ) : (
        <Table headers={['Cliente', 'Concepto', 'Monto', 'Fecha', 'Tipo', 'Estado', 'Acciones']} headerSutil>
          {facturas.map((factura) => (
            <TableRow key={factura.id}>
              <TableCell className="font-semibold" rowPadding="lg">{factura.cliente}</TableCell>
              <TableCell rowPadding="lg">{factura.concepto}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{factura.monto}</TableCell>
              <TableCell rowPadding="lg">{factura.fecha}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={factura.tipo === 'Factura Electrónica' ? 'info' : 'default'}>
                  {factura.tipo}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={factura.estado === 'entregada' ? 'success' : 'warning'}>
                  {factura.estado}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver</Button>
                  <Button size="sm">Descargar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        )}
        </Card>

        <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Generar nota/factura
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Select
            label="Tipo de Documento"
            options={[
              { value: 'nota', label: 'Nota de Remisión' },
              { value: 'factura', label: 'Factura Electrónica' },
            ]}
            fullWidth
          />
          <Input label="Concepto" placeholder="Descripción del servicio/producto" fullWidth />
          <Input label="Monto" placeholder="$0.00" fullWidth />
          {false && ( // Mostrar solo si es factura
            <>
              <Input label="RFC" placeholder="RFC del cliente" fullWidth />
              <Input label="Razón Social" placeholder="Razón social" fullWidth />
              <Input label="Uso de CFDI" placeholder="Uso de CFDI" fullWidth />
              <Input label="Correo Electrónico" type="email" placeholder="correo@ejemplo.com" fullWidth />
            </>
          )}
          <div className="md:col-span-2">
            <Button fullWidth>Generar Documento</Button>
          </div>
        </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
