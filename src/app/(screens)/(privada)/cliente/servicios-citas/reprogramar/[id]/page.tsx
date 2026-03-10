'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../../components/ui/PageHeader';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Select from '../../../../../../components/ui/Select';
export default function ReprogramarCitaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');

  const cita = {
    id: id,
    servicio: 'Corte de Cabello',
    fechaActual: '2024-02-15',
    horaActual: '10:00',
    especialista: 'Mildred',
  };

  const horasDisponibles = [
    { value: '09:00', label: '09:00' },
    { value: '09:30', label: '09:30' },
    { value: '10:00', label: '10:00' },
    { value: '10:30', label: '10:30' },
    { value: '11:00', label: '11:00' },
    { value: '11:30', label: '11:30' },
    { value: '12:00', label: '12:00' },
    { value: '12:30', label: '12:30' },
    { value: '13:00', label: '13:00' },
    { value: '13:30', label: '13:30' },
    { value: '14:00', label: '14:00' },
    { value: '14:30', label: '14:30' },
    { value: '15:00', label: '15:00' },
    { value: '15:30', label: '15:30' },
    { value: '16:00', label: '16:00' },
    { value: '16:30', label: '16:30' },
    { value: '17:00', label: '17:00' },
    { value: '17:30', label: '17:30' },
    { value: '18:00', label: '18:00' },
    { value: '18:30', label: '18:30' },
    { value: '19:00', label: '19:00' },
  ];

  const manejarReprogramar = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para reprogramar la cita
    router.push(`/cliente/servicios-citas/mis-citas/${id}`);
  };

  return (
    <ModuleLayout>
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Reprogramar Cita"
          subtitle="Selecciona una nueva fecha y hora para tu cita"
        />

        <form onSubmit={manejarReprogramar}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <h2
                  className="text-page-title mb-6"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Cita Actual
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Servicio
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.servicio}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Fecha Actual
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>
                      {new Date(cita.fechaActual).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Hora Actual
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.horaActual}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Especialista
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.especialista}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <h2
                  className="text-page-title mb-6"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Nueva Fecha y Hora
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      className="block mb-2 font-medium"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      Nueva Fecha
                    </label>
                    <input
                      type="date"
                      value={nuevaFecha}
                      onChange={(e) => setNuevaFecha(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{
                        backgroundColor: 'var(--texto-fondo-oscuro)',
                        borderColor: 'var(--fondos-suaves)',
                        color: 'var(--menu-texto-principal)',
                      }}
                    />
                  </div>
                  <Select
                    label="Nueva Hora"
                    options={horasDisponibles}
                    value={nuevaHora}
                    onChange={(e) => setNuevaHora(e.target.value)}
                    fullWidth
                  />
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--fondos-suaves)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                      <strong>Nota:</strong> Al reprogramar tu cita, recibirás una confirmación por correo electrónico con los nuevos detalles.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => router.push(`/cliente/servicios-citas/mis-citas/${id}`)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              fullWidth
            >
              Confirmar Reprogramación
            </Button>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}

