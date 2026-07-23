'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../../components/ui/PageHeader';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Select from '../../../../../../components/ui/Select';
import {
  obtenerCita,
  obtenerDisponibilidad,
  reprogramarCita,
  type CitaApi,
  type SlotDisponible,
} from '../../../../../../services/citas';

const TZ_MEXICO = 'America/Mexico_City';

export default function ReprogramarCitaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [cita, setCita] = useState<CitaApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nuevaFecha, setNuevaFecha] = useState('');
  const [slotSeleccionado, setSlotSeleccionado] = useState<SlotDisponible | null>(null);
  const [disponibilidad, setDisponibilidad] = useState<{ abierto: boolean; motivo: string | null; slots: SlotDisponible[] } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [errorEnviar, setErrorEnviar] = useState<string | null>(null);

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

  useEffect(() => {
    if (!cita || !nuevaFecha) {
      queueMicrotask(() => {
        setSlotSeleccionado(null);
        setDisponibilidad(null);
      });
      return;
    }
    queueMicrotask(() => {
      setSlotSeleccionado(null);
      setLoadingSlots(true);
      setErrorSlots(null);
    });
    obtenerDisponibilidad({
      especialistaId: cita.especialistaId,
      fecha: nuevaFecha,
      servicioId: cita.servicioId,
    })
      .then((d) => setDisponibilidad({ abierto: d.abierto, motivo: d.motivo, slots: d.slots }))
      .catch((e) => setErrorSlots(e instanceof Error ? e.message : 'No se pudo cargar la disponibilidad'))
      .finally(() => setLoadingSlots(false));
  }, [cita, nuevaFecha]);

  const manejarReprogramar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotSeleccionado) return;
    setEnviando(true);
    setErrorEnviar(null);
    try {
      await reprogramarCita(Number(id), {
        fechaHoraInicio: slotSeleccionado.inicio,
        fechaHoraFin: slotSeleccionado.fin,
      });
      router.push(`/cliente/servicios-citas/mis-citas/${id}`);
    } catch (err) {
      setErrorEnviar(err instanceof Error ? err.message : 'No se pudo reprogramar la cita.');
      setEnviando(false);
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

  const opcionesHora = disponibilidad?.slots.map((s) => ({ value: s.inicio, label: s.horaLocal })) ?? [];

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
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.servicioNombre ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Fecha Actual
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
                      Hora Actual
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>
                      {new Date(cita.fechaHoraInicio).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: TZ_MEXICO,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Especialista
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{cita.especialistaNombre ?? '—'}</p>
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

                  {nuevaFecha && loadingSlots && (
                    <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Buscando horarios…</p>
                  )}
                  {nuevaFecha && errorSlots && (
                    <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{errorSlots}</p>
                  )}
                  {nuevaFecha && !loadingSlots && !errorSlots && disponibilidad && !disponibilidad.abierto && (
                    <p className="text-sm" style={{ color: 'var(--warning-texto)' }}>
                      {disponibilidad.motivo || 'El salón no abre ese día.'}
                    </p>
                  )}
                  {nuevaFecha && !loadingSlots && !errorSlots && disponibilidad?.abierto && disponibilidad.slots.length === 0 && (
                    <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                      No hay horarios disponibles ese día para este especialista.
                    </p>
                  )}
                  {nuevaFecha && !loadingSlots && !errorSlots && disponibilidad?.abierto && disponibilidad.slots.length > 0 && (
                    <Select
                      label="Nueva Hora"
                      options={[{ value: '', label: 'Selecciona una hora…' }, ...opcionesHora]}
                      value={slotSeleccionado?.inicio ?? ''}
                      onChange={(e) => {
                        const slot = disponibilidad.slots.find((s) => s.inicio === e.target.value) ?? null;
                        setSlotSeleccionado(slot);
                      }}
                      fullWidth
                    />
                  )}

                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--fondos-suaves)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                      <strong>Nota:</strong> Al reprogramar tu cita, recibirás una confirmación por correo electrónico con los nuevos detalles.
                    </p>
                  </div>

                  {errorEnviar && (
                    <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{errorEnviar}</p>
                  )}
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
              disabled={!slotSeleccionado || enviando}
            >
              {enviando ? 'Reprogramando...' : 'Confirmar Reprogramación'}
            </Button>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}
