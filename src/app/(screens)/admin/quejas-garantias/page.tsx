'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';

export default function QuejasGarantiasPage() {
  const casos = [
    { id: 1, cliente: 'María González', servicio: 'Alaciado', fecha: '2024-01-10', tipo: 'Queja', estado: 'en_revision', descripcion: 'El resultado no fue el esperado' },
    { id: 2, cliente: 'Ana López', servicio: 'Corte', fecha: '2024-01-12', tipo: 'Garantía', estado: 'resuelto', descripcion: 'Solicita corrección del corte' },
    { id: 3, cliente: 'Carmen Ruiz', servicio: 'Nanoplastía', fecha: '2024-01-14', tipo: 'Sugerencia', estado: 'nuevo', descripcion: 'Sugerencia sobre horarios' },
  ];

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
                  <Button size="sm">Resolver</Button>
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

