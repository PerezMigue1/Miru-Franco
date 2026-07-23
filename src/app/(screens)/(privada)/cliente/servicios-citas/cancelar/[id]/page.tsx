'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../../components/ui/PageHeader';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Textarea from '../../../../../../components/ui/Textarea';
import { obtenerCita, cancelarCita, type CitaApi } from '../../../../../../services/citas';

const TZ_MEXICO = 'America/Mexico_City';

export default function CancelarCitaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState<string | null>(null);

  const [cita, setCita] = useState<CitaApi | null>(null);
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
      })
      .catch(() => setError('No se pudo cargar la cita.'))
      .finally(() => setCargando(false));
  }, [id]);

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

  const confirmarCancelacion = async () => {
    setCancelando(true);
    setErrorCancelar(null);
    try {
      const motivoCancelacion = [motivo, comentarios].filter(Boolean).join(' — ') || 'Sin motivo especificado';
      await cancelarCita(Number(id), { motivoCancelacion });
      router.push('/cliente/servicios-citas/mis-citas');
    } catch (err) {
      setErrorCancelar(err instanceof Error ? err.message : 'No se pudo cancelar la cita.');
      setCancelando(false);
    }
  };

  if (cargando) {
    return (
      <ModuleLayout>
        <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[200px]">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !cita) {
    return (
      <ModuleLayout>
        <div className="max-w-3xl mx-auto">
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

  const fecha = new Date(cita.fechaHoraInicio).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: TZ_MEXICO,
  });
  const hora = new Date(cita.fechaHoraInicio).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ_MEXICO,
  });

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
                  <strong>Servicio:</strong> {cita.servicioNombre ?? '—'}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Fecha:</strong> {fecha}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Hora:</strong> {hora}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Especialista:</strong> {cita.especialistaNombre ?? '—'}
                </p>
              </div>
            </div>

            {errorCancelar && (
              <p className="text-sm mb-4" style={{ color: 'var(--danger-texto)' }}>{errorCancelar}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setMostrarConfirmacion(false)}
                disabled={cancelando}
              >
                Volver
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={confirmarCancelacion}
                disabled={cancelando}
              >
                {cancelando ? 'Cancelando...' : 'Sí, Cancelar Cita'}
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
                  <strong>Servicio:</strong> {cita.servicioNombre ?? '—'}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Fecha:</strong> {fecha}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Hora:</strong> {hora}
                </p>
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  <strong>Especialista:</strong> {cita.especialistaNombre ?? '—'}
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
