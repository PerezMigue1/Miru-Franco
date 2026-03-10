'use client';

import { useParams, useRouter } from 'next/navigation';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../../components/ui/PageHeader';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Badge from '../../../../../../components/ui/Badge';
export default function DetalleMiCitaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const cita = {
    id: id,
    servicio: 'Corte de Cabello',
    descripcion: 'Corte profesional personalizado según tu estilo',
    fecha: '2024-02-15',
    hora: '10:00',
    duracion: '45 min',
    especialista: 'Mildred',
    precio: '$350',
    estado: 'confirmada',
    notas: 'Cliente prefiere corte en capas',
    contacto: {
      nombre: 'María González',
      telefono: '555-1234-5678',
      email: 'maria@ejemplo.com',
    },
  };

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
            <Badge variant={obtenerVariantEstado(cita.estado) as any} size="lg">
              {cita.estado}
            </Badge>
          </div>
          {cita.estado === 'confirmada' && (
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
                    {cita.servicio}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    {cita.descripcion}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Duración
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.duracion}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Precio
                    </p>
                    <p
                      className="text-xl font-bold"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      {cita.precio}
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
                      {new Date(cita.fecha).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Hora
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.hora}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Especialista
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.especialista}</p>
                </div>
                {cita.notas && (
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Notas
                    </p>
                    <p style={{ color: 'var(--encabezados-alterno)' }}>{cita.notas}</p>
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
                Información de Contacto
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Nombre
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.contacto.nombre}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Teléfono
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.contacto.telefono}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Email
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.contacto.email}</p>
                </div>
              </div>
            </Card>

            <Card className="mt-6">
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













