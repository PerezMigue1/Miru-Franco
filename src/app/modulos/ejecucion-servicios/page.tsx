'use client';

import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { colors } from '../../utils/colors';

export default function EjecucionServiciosPage() {
  const servicios = [
    { id: 1, cliente: 'María González', servicio: 'Corte', especialista: 'Mildred', inicio: '10:00', fin: '10:45', estado: 'en_proceso', productos: ['Shampoo', 'Acondicionador'] },
    { id: 2, cliente: 'Ana López', servicio: 'Alaciado', especialista: 'Auxiliar', inicio: '14:00', estado: 'pendiente', productos: [] },
    { id: 3, cliente: 'Carmen Ruiz', servicio: 'Nanoplastía', especialista: 'Mildred', inicio: '09:00', fin: '12:30', estado: 'completado', productos: ['Nanoplastía Premium', 'Shampoo'] },
  ];

  const estados = {
    pendiente: { label: 'Pendiente', variant: 'warning' as const },
    en_proceso: { label: 'En Proceso', variant: 'info' as const },
    completado: { label: 'Completado', variant: 'success' as const },
  };

  return (
    <ModuleLayout>
      <PageHeader
        title="Ejecución de Servicios"
        subtitle="Gestiona los servicios en curso y registra la información detallada de cada trabajo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Servicios Pendientes</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>2</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>En Proceso</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>1</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Completados Hoy</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>5</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table headers={['Cliente', 'Servicio', 'Especialista', 'Inicio', 'Fin', 'Duración', 'Productos', 'Estado', 'Acciones']}>
          {servicios.map((servicio) => (
            <TableRow key={servicio.id}>
              <TableCell>{servicio.cliente}</TableCell>
              <TableCell>{servicio.servicio}</TableCell>
              <TableCell>{servicio.especialista}</TableCell>
              <TableCell>{servicio.inicio}</TableCell>
              <TableCell>{servicio.fin || '-'}</TableCell>
              <TableCell>
                {servicio.fin ? `${servicio.inicio} - ${servicio.fin}` : 'En curso'}
              </TableCell>
              <TableCell>
                {servicio.productos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {servicio.productos.map((p, i) => (
                      <Badge key={i} variant="default" size="sm">{p}</Badge>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <Badge variant={estados[servicio.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[servicio.estado as keyof typeof estados]?.label || servicio.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary">
                    {servicio.estado === 'pendiente' ? 'Iniciar' : servicio.estado === 'en_proceso' ? 'Finalizar' : 'Ver Detalles'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Registrar Nuevo Servicio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Buscar cliente..." fullWidth />
          <Select
            label="Tipo de Servicio"
            options={[
              { value: 'corte', label: 'Corte' },
              { value: 'alaciado', label: 'Alaciado' },
              { value: 'nanoplastia', label: 'Nanoplastía' },
            ]}
            fullWidth
          />
          <Input label="Productos Utilizados" placeholder="Separar por comas" fullWidth />
          <Input label="Tiempo Empleado (minutos)" type="number" fullWidth />
          <div className="md:col-span-2">
            <Textarea label="Observaciones" placeholder="Notas sobre el servicio..." rows={4} fullWidth />
          </div>
          <div className="md:col-span-2">
            <Button>Registrar Servicio</Button>
          </div>
        </div>
      </Card>
    </ModuleLayout>
  );
}

