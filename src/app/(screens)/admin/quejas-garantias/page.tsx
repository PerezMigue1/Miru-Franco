'use client';

import { useState, useEffect } from 'react';
import { listarQuejas, actualizarQueja, QuejaApi } from '../../../services/quejas';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';

interface CasoFila {
  id: number;
  cliente: string;
  servicio: string;
  fecha: string;
  tipo: string;
  estado: string;
  descripcion: string;
}

const ESTADO_UI: Record<string, string> = {
  abierta: 'nuevo',
  en_proceso: 'en_revision',
  resuelta: 'resuelto',
  cerrada: 'cerrado',
};

function mapearQueja(q: QuejaApi): CasoFila {
  return {
    id: q.id,
    cliente: q.clienteNombre ?? '-',
    servicio: '-',
    fecha: q.creadoEn ? q.creadoEn.slice(0, 10) : '-',
    tipo: 'Queja',
    estado: ESTADO_UI[q.estado] ?? q.estado,
    descripcion: q.descripcion,
  };
}

export default function QuejasGarantiasPage() {
  const [casos, setCasos] = useState<CasoFila[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    setLoading(true);
    listarQuejas()
      .then(({ data }) => setCasos(data.map(mapearQueja)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const resolver = async (id: number) => {
    await actualizarQueja(id, { estado: 'resuelta' });
    cargar();
  };

  const estados = {
    nuevo: { label: 'Nuevo', variant: 'info' as const },
    en_revision: { label: 'En Revisión', variant: 'warning' as const },
    resuelto: { label: 'Resuelto', variant: 'success' as const },
    cerrado: { label: 'Cerrado', variant: 'default' as const },
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Manejo de Quejas, Sugerencias y Garantías"
        subtitle="Gestiona las garantías de satisfacción y resolución de casos"
      />

      <Card>
        <Table headers={['Cliente', 'Servicio', 'Fecha', 'Tipo', 'Descripción', 'Estado', 'Acciones']}>
          {casos.map((caso) => (
            <TableRow key={caso.id}>
              <TableCell className="font-semibold">{caso.cliente}</TableCell>
              <TableCell>{caso.servicio}</TableCell>
              <TableCell>{caso.fecha}</TableCell>
              <TableCell>
                <Badge variant={caso.tipo === 'Garantía' ? 'warning' : caso.tipo === 'Queja' ? 'danger' : 'info'}>
                  {caso.tipo}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate">{caso.descripcion}</TableCell>
              <TableCell>
                <Badge variant={estados[caso.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[caso.estado as keyof typeof estados]?.label || caso.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                  <Button size="sm" onClick={() => resolver(caso.id)}>Resolver</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Registrar Nuevo Caso
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Input label="Servicio Relacionado" placeholder="Tipo de servicio" fullWidth />
          <Select
            label="Tipo"
            options={[
              { value: 'queja', label: 'Queja' },
              { value: 'garantia', label: 'Garantía' },
              { value: 'sugerencia', label: 'Sugerencia' },
            ]}
            fullWidth
          />
          <Input label="Fecha del Servicio" type="date" fullWidth />
          <div className="md:col-span-2">
            <Textarea label="Descripción" placeholder="Detalles del caso..." rows={4} fullWidth />
          </div>
          <div className="md:col-span-2">
            <Button>Registrar Caso</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}
