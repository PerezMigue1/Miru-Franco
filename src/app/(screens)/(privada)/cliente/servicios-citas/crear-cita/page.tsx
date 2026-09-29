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
import Link from 'next/link';
import { CalendarDays, CalendarCheck2, Clock3, UserRound } from 'lucide-react';
import PasosFlujo, { PASOS_RESERVA } from '../../../../../components/cliente/PasosFlujo';
import { formatearPrecioMXN } from '../../../../../utils/formatoPrecio';

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
      <div className="max-w-5xl mx-auto">
        <PasosFlujo pasos={PASOS_RESERVA} actual={datosIncompletos ? 0 : 2} etiqueta="Pasos para reservar" />
        <PageHeader
          title="Crear Cita"
          subtitle={datosIncompletos ? 'Primero elige el servicio y el horario' : 'Revisa los detalles y confirma tu cita'}
        />

        {datosIncompletos ? (
          /* Sin servicio/especialista/horario la cita no se puede crear: en vez de un formulario con
             "No seleccionado" en rojo y el botón apagado, se explica qué falta y cómo seguir. */
          <Card className="mf-entrada max-w-xl text-center py-12 px-6">
            <CalendarDays size={36} strokeWidth={1.5} className="mx-auto mb-4" style={{ color: 'var(--logo-branding)' }} aria-hidden />
            <p className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
              Aún no has elegido un servicio y horario
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Elige el servicio que quieres, luego el especialista, el día y la hora. Después vuelves aquí para confirmar.
            </p>
            <Link
              href="/cliente/servicios-citas"
              className="mf-btn mt-6 inline-flex items-center justify-center px-6 min-h-11 rounded-[10px] font-semibold bg-[var(--botones-principales)] hover:bg-[var(--hover)]"
              style={{ color: 'var(--texto-fondo-oscuro)' }}
            >
              Elegir servicio
            </Link>
          </Card>
        ) : (
        <form onSubmit={manejarEnviar}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="mf-entrada" padding="lg">
                <h2
                  className="text-2xl font-bold mb-6"
                  style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
                >
                  Detalles de la Cita
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Especialista
                    </p>
                    <p className="flex items-center gap-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                      <UserRound size={16} aria-hidden style={{ color: 'var(--logo-branding)' }} />
                      {loadingEspecialista ? <span className="mf-skeleton inline-block h-4 w-32" /> : especialista?.nombre ?? 'No seleccionado'}
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

            <div className="lg:sticky lg:top-[calc(var(--mf-header-offset,136px)+1rem)] lg:self-start">
              <Card className="mf-entrada" style={{ ['--i' as string]: 1 }} padding="lg">
                <h3
                  className="text-xl font-bold mb-5"
                  style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
                >
                  Resumen de la Cita
                </h3>
                {loadingServicio ? (
                  <div className="space-y-3" aria-busy="true" aria-label="Cargando servicio">
                    <div className="mf-skeleton h-4 w-2/3" />
                    <div className="mf-skeleton h-4 w-1/2" />
                    <div className="mf-skeleton h-4 w-1/3" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Servicio
                      </p>
                      <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{servicio?.nombre ?? 'No seleccionado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Fecha
                      </p>
                      <p className="flex items-center gap-2 first-letter:uppercase" style={{ color: 'var(--menu-texto-principal)' }}>
                        <CalendarCheck2 size={16} aria-hidden className="shrink-0" style={{ color: 'var(--logo-branding)' }} />
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
                      <p className="mf-cifras flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                        <Clock3 size={16} aria-hidden className="shrink-0" style={{ color: 'var(--logo-branding)' }} />
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
                    <div className="pt-4 border-t" style={{ borderColor: 'var(--mf-linea)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Total
                      </p>
                      <p
                        className="mf-cifras text-3xl font-bold"
                        style={{ color: 'var(--menu-texto-principal)' }}
                      >
                        {servicio?.precio ? formatearPrecioMXN(servicio.precio) : '—'}
                      </p>
                    </div>
                    {error && (
                      <p className="text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>{error}</p>
                    )}
                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      className="mt-4"
                      disabled={enviando || datosIncompletos}
                    >
                      <span className="mf-feedback-contenido w-full" data-cambiando={enviando ? 'true' : 'false'}>
                        {enviando ? 'Confirmando…' : 'Confirmar Cita'}
                      </span>
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </form>
        )}
      </div>
    </ModuleLayout>
  );
}

export default function CrearCitaPage() {
  return (
    <Suspense fallback={
      <ModuleLayout>
        <div className="max-w-4xl mx-auto space-y-4 py-4" aria-busy="true" aria-label="Cargando">
          <div className="mf-skeleton h-9 w-2/5" />
          <div className="mf-skeleton h-4 w-3/5" />
          <div className="mf-skeleton h-56 w-full" style={{ borderRadius: 'var(--mf-radio)' }} />
        </div>
      </ModuleLayout>
    }>
      <CrearCitaContent />
    </Suspense>
  );
}
