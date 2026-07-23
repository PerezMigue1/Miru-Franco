'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Textarea from '../../../../../components/ui/Textarea';
import { getServicioPorId } from '../../../../../services/servicios';
import type { Servicio } from '../../../../../services/servicios';
import { getMiPerfil } from '../../../../../services/auth';
import { crearCita, obtenerEspecialistas, type EspecialistaApi } from '../../../../../services/citas';

const TZ_MEXICO = 'America/Mexico_City';

function CrearCitaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicioId = searchParams.get('servicioId');
  const especialistaId = searchParams.get('especialistaId');
  const inicio = searchParams.get('inicio');
  const fin = searchParams.get('fin');

  const [notas, setNotas] = useState('');
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [loadingServicio, setLoadingServicio] = useState(!!servicioId);
  const [especialista, setEspecialista] = useState<EspecialistaApi | null>(null);
  const [loadingEspecialista, setLoadingEspecialista] = useState(!!especialistaId);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const datosIncompletos = !servicioId || !especialistaId || !inicio || !fin;

  useEffect(() => {
    if (!servicioId) {
      queueMicrotask(() => setLoadingServicio(false));
      return;
    }
    getServicioPorId(servicioId).then((s) => {
      setServicio(s);
      setLoadingServicio(false);
    });
  }, [servicioId]);

  useEffect(() => {
    if (!especialistaId) {
      queueMicrotask(() => setLoadingEspecialista(false));
      return;
    }
    obtenerEspecialistas()
      .then((lista) => setEspecialista(lista.find((e) => e.id === especialistaId) ?? null))
      .finally(() => setLoadingEspecialista(false));
  }, [especialistaId]);

  const manejarEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (datosIncompletos) {
      setError('Faltan datos de la cita. Vuelve a seleccionar especialista, fecha y hora.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const perfil = await getMiPerfil();
      const cita = await crearCita({
        clienteId: perfil.id,
        especialistaId: especialistaId!,
        servicioId: Number(servicioId),
        fechaHoraInicio: inicio!,
        fechaHoraFin: fin!,
        notas: notas || undefined,
      });
      router.push(`/cliente/servicios-citas/confirmacion?citaId=${cita.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cita. Intenta con otro horario.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModuleLayout>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Crear Cita"
          subtitle="Completa la información para confirmar tu cita"
        />

        <form onSubmit={manejarEnviar}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card style={{ animation: 'fadeUp 350ms ease-out both' }}>
                <h2
                  className="text-page-title mb-6"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Detalles de la Cita
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Especialista
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>
                      {loadingEspecialista ? 'Cargando...' : especialista?.nombre ?? 'No seleccionado'}
                    </p>
                  </div>
                  <Textarea
                    label="Notas Adicionales (Opcional)"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={4}
                    fullWidth
                    placeholder="Indica cualquier preferencia, alergia o información relevante..."
                  />
                </div>
              </Card>
            </div>

            <div>
              <Card style={{ animation: 'fadeUp 350ms ease-out 160ms both' }}>
                <h3
                  className="text-subtitle mb-4"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Resumen de la Cita
                </h3>
                {loadingServicio ? (
                  <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando servicio...</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Servicio
                      </p>
                      <p style={{ color: 'var(--menu-texto-principal)' }}>{servicio?.nombre ?? 'No seleccionado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Fecha
                      </p>
                      <p style={{ color: 'var(--menu-texto-principal)' }}>
                        {inicio ? new Date(inicio).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: TZ_MEXICO,
                        }) : 'No seleccionada'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Hora
                      </p>
                      <p style={{ color: 'var(--menu-texto-principal)' }}>
                        {inicio ? new Date(inicio).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: TZ_MEXICO,
                        }) : 'No seleccionada'}
                      </p>
                    </div>
                    {servicio?.duracion && (
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                          Duración
                        </p>
                        <p style={{ color: 'var(--menu-texto-principal)' }}>{servicio.duracion}</p>
                      </div>
                    )}
                    <div className="pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Total
                      </p>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: 'var(--menu-texto-principal)' }}
                      >
                        {servicio?.precio ?? '—'}
                      </p>
                    </div>
                    {error && (
                      <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{error}</p>
                    )}
                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      className="mt-4"
                      disabled={enviando || datosIncompletos}
                    >
                      {enviando ? 'Confirmando...' : 'Confirmar Cita'}
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}

export default function CrearCitaPage() {
  return (
    <Suspense fallback={
      <ModuleLayout>
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando...</p>
        </div>
      </ModuleLayout>
    }>
      <CrearCitaContent />
    </Suspense>
  );
}
