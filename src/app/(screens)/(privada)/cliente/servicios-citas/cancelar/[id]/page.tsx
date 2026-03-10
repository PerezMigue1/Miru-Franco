'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../../components/ui/PageHeader';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Textarea from '../../../../../../components/ui/Textarea';
export default function CancelarCitaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const cita = {
    id: id,
    servicio: 'Corte de Cabello',
    fecha: '2024-02-15',
    hora: '10:00',
    especialista: 'Mildred',
    precio: '$350',
  };

  const motivos = [
    'Cambio de planes',
    'Emergencia personal',
    'Problemas de salud',
    'Conflicto de horario',
    'Otro',
  ];

  const manejarCancelar = (e: React.FormEvent) => {
    e.preventDefault();
    setMostrarConfirmacion(true);
  };

  const confirmarCancelacion = () => {
    // Aquí iría la lógica para cancelar la cita
    router.push('/cliente/servicios-citas/mis-citas');
  };

  if (mostrarConfirmacion) {
    return (
      <ModuleLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <div className="mb-6">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--danger)' }}
              >
                <span className="text-4xl" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                  ⚠
                </span>
              </div>
              <h1
                className="text-hero mb-2"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                ¿Confirmar Cancelación?
              </h1>
              <p
                className="text-lead"
                style={{ color: 'var(--encabezados-alterno)' }}
              >
                Esta acción no se puede deshacer
              </p>
            </div>

            <div
              className="bg-white rounded-lg p-6 mb-6 text-left"
              style={{ backgroundColor: 'var(--fondos-suaves)' }}
            >
              <div className="space-y-2">
                <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  Cita a cancelar:
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Servicio:</strong> {cita.servicio}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Fecha:</strong>{' '}
                  {new Date(cita.fecha).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Hora:</strong> {cita.hora}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Especialista:</strong> {cita.especialista}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setMostrarConfirmacion(false)}
              >
                Volver
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={confirmarCancelacion}
              >
                Sí, Cancelar Cita
              </Button>
            </div>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Cancelar Cita"
          subtitle="Por favor, indícanos el motivo de la cancelación"
        />

        <form onSubmit={manejarCancelar}>
          <Card>
            <div className="mb-6">
              <h2
                className="text-page-title mb-4"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Información de la Cita
              </h2>
              <div className="space-y-2">
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Servicio:</strong> {cita.servicio}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Fecha:</strong>{' '}
                  {new Date(cita.fecha).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Hora:</strong> {cita.hora}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Especialista:</strong> {cita.especialista}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block mb-2 font-medium"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Motivo de Cancelación
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--texto-fondo-oscuro)',
                    borderColor: 'var(--fondos-suaves)',
                    color: 'var(--menu-texto-principal)',
                  }}
                >
                  <option value="">Selecciona un motivo</option>
                  {motivos.map((m) => (
                    <option key={m} value={m} style={{ color: 'var(--menu-texto-principal)', backgroundColor: 'var(--texto-fondo-oscuro)' }}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <Textarea
                label="Comentarios Adicionales (Opcional)"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                rows={4}
                fullWidth
                placeholder="Si seleccionaste 'Otro', por favor proporciona más detalles..."
              />

              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--fondos-suaves)' }}
              >
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Importante:</strong> Si cancelas con menos de 24 horas de anticipación, 
                  puede aplicarse una política de cancelación. Te recomendamos reprogramar tu cita 
                  en lugar de cancelarla.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => router.push(`/cliente/servicios-citas/mis-citas/${id}`)}
            >
              No Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              fullWidth
            >
              Continuar con Cancelación
            </Button>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}

