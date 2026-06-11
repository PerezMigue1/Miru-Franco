'use client';

import { useRouter } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import Input from '../../../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../../../components/ui/Table';
export default function MisCitasPage() {
  const router = useRouter();

  const citas = [
    {
      id: 'CITA-2024-001',
      servicio: 'Corte de Cabello',
      fecha: '2024-02-15',
      hora: '10:00',
      especialista: 'Mildred',
      precio: '$350',
      estado: 'confirmada',
    },
    {
      id: 'CITA-2024-002',
      servicio: 'Alaciado',
      fecha: '2024-02-20',
      hora: '14:00',
      especialista: 'Carmen',
      precio: '$800',
      estado: 'confirmada',
    },
    {
      id: 'CITA-2024-003',
      servicio: 'Tinte',
      fecha: '2024-01-10',
      hora: '11:30',
      especialista: 'Laura',
      precio: '$600',
      estado: 'completada',
    },
    {
      id: 'CITA-2024-004',
      servicio: 'Peinado',
      fecha: '2024-01-05',
      hora: '16:00',
      especialista: 'Mildred',
      precio: '$400',
      estado: 'completada',
    },
  ];

  const obtenerVariantEstado = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return 'success';
      case 'completada':
        return 'info';
      case 'cancelada':
        return 'danger';
      case 'pendiente':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ModuleLayout>
      <PageHeader
        title="Mis Citas"
        subtitle="Gestiona todas tus citas agendadas"
        actions={
          <Button onClick={() => router.push('/cliente/servicios-citas')}>
            + Nueva Cita
          </Button>
        }
      />

      <div className="mb-6">
        <Input 
          placeholder="Buscar cita por servicio, fecha..." 
          className="w-full max-w-md" 
        />
      </div>

      <Card style={{ animation: 'fadeUp 400ms ease-out both' }}>
        <Table headers={['ID', 'Servicio', 'Fecha', 'Hora', 'Especialista', 'Precio', 'Estado', 'Acciones']}>
          {citas.map((cita) => (
            <TableRow key={cita.id}>
              <TableCell className="font-mono text-xs">{cita.id}</TableCell>
              <TableCell className="font-semibold">{cita.servicio}</TableCell>
              <TableCell>{formatearFecha(cita.fecha)}</TableCell>
              <TableCell>{cita.hora}</TableCell>
              <TableCell>{cita.especialista}</TableCell>
              <TableCell>{cita.precio}</TableCell>
              <TableCell>
                <Badge variant={obtenerVariantEstado(cita.estado)}>
                  {cita.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/cliente/servicios-citas/mis-citas/${cita.id}`)}
                  >
                    Ver
                  </Button>
                  {cita.estado === 'confirmada' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/cliente/servicios-citas/reprogramar/${cita.id}`)}
                      >
                        Reprogramar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => router.push(`/cliente/servicios-citas/cancelar/${cita.id}`)}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      {citas.length === 0 && (
        <Card className="text-center py-16">
          <p className="text-lead mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            No tienes citas agendadas
          </p>
          <Button onClick={() => router.push('/cliente/servicios-citas')}>
            Agendar Mi Primera Cita
          </Button>
        </Card>
      )}
    </ModuleLayout>
  );
}













