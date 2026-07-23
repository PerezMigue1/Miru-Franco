'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Badge from '../../../../../../components/ui/Badge';
import { obtenerCita, type CitaApi } from '../../../../../../services/citas';
import { getServicioPorId } from '../../../../../../services/servicios';
import type { Servicio } from '../../../../../../services/servicios';

const TZ_MEXICO = 'America/Mexico_City';

export default function DetalleMiCitaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [cita, setCita] = useState<CitaApi | null>(null);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !Number.isFinite(Number(id))) {
      queueMicrotask(() => {
        setError('Cita no encontrada.');
        setCargando(false);
      });
      return;
    }
    obtenerCita(Number(id))
      .then((c) => {
        if (!c) {
          setError('Cita no encontrada.');
          return;
        }
        setCita(c);
        return getServicioPorId(String(c.servicioId)).then(setServicio);
      })
      .catch(() => setError('No se pudo cargar la cita.'))
      .finally(() => setCargando(false));
  }, [id]);

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

  if (cargando) {
    return (
      <ModuleLayout>
        <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[200px]">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !cita) {
    return (
      <ModuleLayout>
        <div className="max-w-5xl mx-auto">
          <Card className="text-center py-16">
            <p style={{ color: 'var(--danger-texto)' }}>{error ?? 'Cita no encontrada.'}</p>
            <Button className="mt-4" onClick={() => router.push('/cliente/servicios-citas/mis-citas')}>
              Volver a Mis Citas
            </Button>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  const puedeGestionar = cita.estado === 'confirmada' || cita.estado === 'pendiente';

  return (
    <ModuleLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-hero mb-2"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Detalle de la Cita
            </h1>
            <Badge variant={obtenerVariantEstado(cita.estado)} size="lg">
              {cita.estado}
            </Badge>
          </div>
          {puedeGestionar && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/cliente/servicios-citas/reprogramar/${cita.id}`)}
              >
                Reprogramar
              </Button>
              <Button
                variant="danger"
                onClick={() => router.push(`/cliente/servicios-citas/cancelar/${cita.id}`)}
              >
                Cancelar Cita
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2
                className="text-page-title mb-4"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Información del Servicio
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Servicio
                  </p>
                  <p
                    className="text-xl font-bold"
                    style={{ color: 'var(--menu-texto-principal)' }}
                  >
                    {cita.servicioNombre ?? servicio?.nombre ?? '—'}
                  </p>
                  {servicio?.descripcion && (
                    <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      {servicio.descripcion}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Duración
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{servicio?.duracion ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Precio
                    </p>
                    <p
                      className="text-xl font-bold"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      {servicio?.precio ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h2
                className="text-page-title mb-4"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Detalles de la Cita
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Fecha
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>
                      {new Date(cita.fechaHoraInicio).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: TZ_MEXICO,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Hora
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>
                      {new Date(cita.fechaHoraInicio).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: TZ_MEXICO,
                      })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Especialista
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.especialistaNombre ?? '—'}</p>
                </div>
                {cita.notas && (
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Notas
                    </p>
                    <p style={{ color: 'var(--encabezados-alterno)' }}>{cita.notas}</p>
                  </div>
                )}
                {cita.motivoCancelacion && (
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Motivo de cancelación
                    </p>
                    <p style={{ color: 'var(--encabezados-alterno)' }}>{cita.motivoCancelacion}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div>
            <Card>
              <h3
                className="text-subtitle mb-4"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Recordatorios
              </h3>
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Recibirás un recordatorio por correo electrónico 24 horas antes de tu cita.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
