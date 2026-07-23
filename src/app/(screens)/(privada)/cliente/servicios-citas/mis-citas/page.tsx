'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import Input from '../../../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../../../components/ui/Table';
import { listarCitas, type CitaApi } from '../../../../../services/citas';

const TZ_MEXICO = 'America/Mexico_City';

export default function MisCitasPage() {
  const router = useRouter();

  const [citas, setCitas] = useState<CitaApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    listarCitas({ orden: 'fechaHoraInicio', limit: 100 })
      .then((r) => setCitas(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar tus citas'))
      .finally(() => setCargando(false));
  }, []);

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

  const formatearFecha = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: TZ_MEXICO,
    });
  };

  const formatearHora = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TZ_MEXICO,
    });
  };

  const filtro = busqueda.trim().toLowerCase();
  const citasFiltradas = filtro
    ? citas.filter((c) =>
        (c.servicioNombre ?? '').toLowerCase().includes(filtro) ||
        formatearFecha(c.fechaHoraInicio).toLowerCase().includes(filtro) ||
        (c.especialistaNombre ?? '').toLowerCase().includes(filtro)
      )
    : citas;

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
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {cargando ? (
        <Card className="text-center py-16">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando tus citas...</p>
        </Card>
      ) : error ? (
        <Card className="text-center py-16">
          <p style={{ color: 'var(--danger-texto)' }}>{error}</p>
        </Card>
      ) : citasFiltradas.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-lead mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            {citas.length === 0 ? 'No tienes citas agendadas' : 'No hay citas que coincidan con tu búsqueda'}
          </p>
          {citas.length === 0 && (
            <Button onClick={() => router.push('/cliente/servicios-citas')}>
              Agendar Mi Primera Cita
            </Button>
          )}
        </Card>
      ) : (
        <Card style={{ animation: 'fadeUp 400ms ease-out both' }}>
          <Table headers={['ID', 'Servicio', 'Fecha', 'Hora', 'Especialista', 'Estado', 'Acciones']}>
            {citasFiltradas.map((cita) => (
              <TableRow key={cita.id}>
                <TableCell className="font-mono text-xs">#{cita.id}</TableCell>
                <TableCell className="font-semibold">{cita.servicioNombre ?? '—'}</TableCell>
                <TableCell>{formatearFecha(cita.fechaHoraInicio)}</TableCell>
                <TableCell>{formatearHora(cita.fechaHoraInicio)}</TableCell>
                <TableCell>{cita.especialistaNombre ?? '—'}</TableCell>
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
                    {(cita.estado === 'confirmada' || cita.estado === 'pendiente') && (
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
      )}
    </ModuleLayout>
  );
}
