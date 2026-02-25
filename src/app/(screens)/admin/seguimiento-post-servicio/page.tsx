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
import { colors } from '../../../utils/colors';

export default function SeguimientoPostServicioPage() {
  const seguimientos = [
    { id: 1, cliente: 'María González', servicio: 'Alaciado', fechaServicio: '2024-01-10', fechaSeguimiento: '2024-01-12', estado: 'satisfactoria', notas: 'Cliente satisfecha con el resultado' },
    { id: 2, cliente: 'Ana López', servicio: 'Nanoplastía', fechaServicio: '2024-01-08', fechaSeguimiento: '2024-01-11', estado: 'problema', notas: 'Reporta que el cabello se ve diferente' },
    { id: 3, cliente: 'Carmen Ruiz', servicio: 'Corte', fechaServicio: '2024-01-13', fechaSeguimiento: 'Pendiente', estado: 'pendiente', notas: '-' },
  ];

  const estados = {
    satisfactoria: { label: 'Satisfactoria', variant: 'success' as const },
    problema: { label: 'Con Problemas', variant: 'warning' as const },
    pendiente: { label: 'Pendiente', variant: 'info' as const },
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Seguimiento Post-Servicio"
        subtitle="Realiza seguimiento a clientas después de servicios, especialmente tratamientos químicos"
      />

      <Card>
        <Table headers={['Cliente', 'Servicio', 'Fecha Servicio', 'Fecha Seguimiento', 'Estado', 'Notas', 'Acciones']}>
          {seguimientos.map((seguimiento) => (
            <TableRow key={seguimiento.id}>
              <TableCell className="font-semibold">{seguimiento.cliente}</TableCell>
              <TableCell>{seguimiento.servicio}</TableCell>
              <TableCell>{seguimiento.fechaServicio}</TableCell>
              <TableCell>{seguimiento.fechaSeguimiento}</TableCell>
              <TableCell>
                <Badge variant={estados[seguimiento.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[seguimiento.estado as keyof typeof estados]?.label || seguimiento.estado}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate">{seguimiento.notas}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                  {seguimiento.estado === 'pendiente' && (
                    <Button size="sm">Realizar Seguimiento</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Nuevo Seguimiento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Input label="Servicio Realizado" placeholder="Tipo de servicio" fullWidth />
          <Input label="Fecha del Servicio" type="date" fullWidth />
          <Input label="Fecha de Seguimiento" type="date" fullWidth />
          <Select
            label="Resultado"
            options={[
              { value: 'satisfactoria', label: 'Satisfactoria' },
              { value: 'problema', label: 'Con Problemas' },
              { value: 'pendiente', label: 'Pendiente' },
            ]}
            fullWidth
          />
          <div className="md:col-span-2">
            <Textarea label="Notas del Seguimiento" placeholder="Resultado del seguimiento, dudas resueltas, productos usados..." rows={4} fullWidth />
          </div>
          <div className="md:col-span-2">
            <Button fullWidth>Registrar Seguimiento</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}

