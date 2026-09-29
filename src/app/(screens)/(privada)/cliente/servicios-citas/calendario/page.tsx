'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Select from '../../../../../components/ui/Select';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import PasosFlujo, { PASOS_RESERVA } from '../../../../../components/cliente/PasosFlujo';
import {
  obtenerEspecialistas,
  obtenerDisponibilidad,
  type EspecialistaApi,
  type SlotDisponible,
} from '../../../../../services/citas';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "YYYY-MM-DD" a partir de componentes LOCALES del Date (nunca toISOString — evita el
 *  desfase de un día que da la conversión a UTC cuando el usuario está detrás de UTC). */
function fechaLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function CalendarioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicioId = searchParams.get('servicioId');

  const [especialistas, setEspecialistas] = useState<EspecialistaApi[]>([]);
  const [loadingEspecialistas, setLoadingEspecialistas] = useState(true);
  const [especialistaId, setEspecialistaId] = useState('');

  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [slotSeleccionado, setSlotSeleccionado] = useState<SlotDisponible | null>(null);

  const [disponibilidad, setDisponibilidad] = useState<{ abierto: boolean; motivo: string | null; slots: SlotDisponible[] } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState<string | null>(null);

  useEffect(() => {
    obtenerEspecialistas()
      .then(setEspecialistas)
      .catch(() => setEspecialistas([]))
      .finally(() => setLoadingEspecialistas(false));
  }, []);

  useEffect(() => {
    if (!especialistaId || !diaSeleccionado || !servicioId) {
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
      especialistaId,
      fecha: fechaLocalISO(diaSeleccionado),
      servicioId: Number(servicioId),
    })
      .then((d) => setDisponibilidad({ abierto: d.abierto, motivo: d.motivo, slots: d.slots }))
      .catch((e) => setErrorSlots(e instanceof Error ? e.message : 'No se pudo cargar la disponibilidad'))
      .finally(() => setLoadingSlots(false));
  }, [especialistaId, diaSeleccionado, servicioId]);

  // Generar días del mes
  const obtenerDiasDelMes = () => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaInicioSemana = primerDia.getDay();

    const dias: (Date | null)[] = [];

    // Días vacíos al inicio
    for (let i = 0; i < diaInicioSemana; i++) {
      dias.push(null);
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(new Date(year, month, dia));
    }

    return dias;
  };

  const dias = obtenerDiasDelMes();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const cambiarMes = (direccion: number) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1));
    setDiaSeleccionado(null);
    setSlotSeleccionado(null);
  };

  const manejarContinuar = () => {
    if (!slotSeleccionado || !especialistaId) return;
    const sp = new URLSearchParams({
      servicioId: servicioId || '',
      especialistaId,
      inicio: slotSeleccionado.inicio,
      fin: slotSeleccionado.fin,
    });
    router.push(`/cliente/servicios-citas/crear-cita?${sp.toString()}`);
  };

  return (
    <ModuleLayout>
      <div className="w-full max-w-none">
        <PasosFlujo pasos={PASOS_RESERVA} actual={1} etiqueta="Pasos para reservar" />
        <PageHeader
          title="Calendario de Disponibilidad"
          subtitle="Selecciona especialista, día y hora para tu cita"
        />

        {!servicioId && (
          <Card className="mb-6">
            <p className="flex items-start gap-2 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
              <Info size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} />
              <span>
                Para ver horarios primero elige el servicio que quieres reservar.{' '}
                <Link href="/cliente/servicios-citas" className="font-semibold underline underline-offset-4">
                  Ver servicios
                </Link>
              </span>
            </p>
          </Card>
        )}

        <Card className="mb-6">
          <Select
            label="Especialista"
            value={especialistaId}
            onChange={(e) => { setEspecialistaId(e.target.value); setDiaSeleccionado(null); }}
            options={[
              { value: '', label: loadingEspecialistas ? 'Cargando especialistas…' : 'Selecciona un especialista…' },
              ...especialistas.map((esp) => ({ value: esp.id, label: `${esp.nombre} — ${esp.puesto || 'Especialista'}` })),
            ]}
            fullWidth
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <button
                  type="button"
                  onClick={() => cambiarMes(-1)}
                  aria-label="Mes anterior"
                  className="mf-btn w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-[var(--fondos-suaves)]"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  <ChevronLeft size={20} aria-hidden />
                </button>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
                  aria-live="polite"
                >
                  {nombresMeses[mesActual.getMonth()]} {mesActual.getFullYear()}
                </h2>
                <button
                  type="button"
                  onClick={() => cambiarMes(1)}
                  aria-label="Mes siguiente"
                  className="mf-btn w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-[var(--fondos-suaves)]"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  <ChevronRight size={20} aria-hidden />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {nombresDias.map((dia) => (
                  <div
                    key={dia}
                    className="text-center font-semibold py-2"
                    style={{ color: 'var(--encabezados-alterno)' }}
                  >
                    {dia}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {dias.map((dia, index) => {
                  if (!dia) {
                    return <div key={`empty-${index}`} className="h-12" />;
                  }

                  const seleccionado = diaSeleccionado?.toDateString() === dia.toDateString();
                  const esHoy = dia.toDateString() === new Date().toDateString();
                  // Un día que ya pasó no puede tener horarios: no se ofrece.
                  const esPasado = dia < hoy;

                  return (
                    <button
                      key={dia.toISOString()}
                      type="button"
                      onClick={() => setDiaSeleccionado(dia)}
                      disabled={!especialistaId || esPasado}
                      aria-pressed={seleccionado}
                      aria-label={dia.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                      className={`mf-btn mf-cifras h-12 rounded-full text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed ${
                        seleccionado ? '' : 'enabled:hover:bg-[var(--fondos-suaves)]'
                      }`}
                      style={{
                        backgroundColor: seleccionado ? 'var(--botones-principales)' : 'transparent',
                        color: seleccionado ? 'var(--texto-fondo-oscuro)' : 'var(--menu-texto-principal)',
                        boxShadow: esHoy && !seleccionado ? 'inset 0 0 0 1.5px var(--logo-branding)' : 'none',
                      }}
                    >
                      {dia.getDate()}
                    </button>
                  );
                })}
              </div>
              {!especialistaId && (
                <p className="text-sm mt-4" style={{ color: 'var(--encabezados-alterno)' }}>
                  Elige un especialista para poder seleccionar un día.
                </p>
              )}
            </Card>
          </div>

          <div>
            <Card>
              <h3
                className="text-subtitle mb-4"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Horarios Disponibles
              </h3>
              {!diaSeleccionado ? (
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  Selecciona un día para ver los horarios disponibles
                </p>
              ) : loadingSlots ? (
                <div className="grid grid-cols-2 gap-2" aria-busy="true" aria-label="Buscando horarios">
                  {Array.from({ length: 6 }, (_, i) => <div key={i} className="mf-skeleton h-11" style={{ borderRadius: 999 }} />)}
                </div>
              ) : errorSlots ? (
                <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{errorSlots}</p>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                    {diaSeleccionado.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>

                  {disponibilidad && !disponibilidad.abierto ? (
                    <p className="text-sm" style={{ color: 'var(--warning-texto)' }}>
                      {disponibilidad.motivo || 'El salón no abre ese día.'}
                    </p>
                  ) : disponibilidad && disponibilidad.slots.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                      No hay horarios disponibles ese día para este especialista.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {disponibilidad?.slots.map((slot) => {
                        const seleccionado = slotSeleccionado?.inicio === slot.inicio;
                        return (
                          <button
                            key={slot.inicio}
                            type="button"
                            onClick={() => setSlotSeleccionado(slot)}
                            aria-pressed={seleccionado}
                            className={`mf-btn mf-cifras min-h-11 px-3 rounded-full text-sm font-semibold ${seleccionado ? '' : 'hover:bg-[var(--fondos-suaves)]'}`}
                            style={{
                              backgroundColor: seleccionado ? 'var(--botones-principales)' : 'transparent',
                              color: seleccionado ? 'var(--texto-fondo-oscuro)' : 'var(--menu-texto-principal)',
                              boxShadow: seleccionado ? 'none' : 'inset 0 0 0 1.5px color-mix(in srgb, var(--menu-texto-principal) 35%, transparent)',
                            }}
                          >
                            {slot.horaLocal}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    fullWidth
                    className="mt-5"
                    onClick={manejarContinuar}
                    disabled={!slotSeleccionado}
                  >
                    {slotSeleccionado ? `Continuar con las ${slotSeleccionado.horaLocal}` : 'Elige un horario'}
                  </Button>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

export default function CalendarioDisponibilidadPage() {
  return (
    <Suspense fallback={
      <ModuleLayout>
        <div className="w-full max-w-none flex items-center justify-center min-h-[200px]">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando calendario...</p>
        </div>
      </ModuleLayout>
    }>
      <CalendarioContent />
    </Suspense>
  );
}
