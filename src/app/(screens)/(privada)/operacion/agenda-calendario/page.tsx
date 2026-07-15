'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Select from '../../../../components/ui/Select';
import { listarCalendario, CitaApi } from '../../../../services/citas';
import { listarEmpleados, EmpleadoApi } from '../../../../services/empleados';
import { etiquetaEstadoCita, varianteEstadoCita } from '../../../../utils/estados';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';

const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Construye un string 'YYYY-MM-DD' a partir de componentes locales (mes 0-indexado). Nunca UTC. */
function fechaAISO(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

/** Formatea un string 'YYYY-MM-DD' como fecha local, sin pasar por UTC (evita el desfase de un día). */
function formatearFechaLocal(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number);
  if (!y || !m || !d) return fechaISO;
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' });
}

/** Día calendario local (YYYY-MM-DD) de un datetime ISO — usa getters locales, nunca slice del string UTC. */
function diaLocalDeISO(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return fechaAISO(d.getFullYear(), d.getMonth(), d.getDate());
}

function diasEnMes(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function hora(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

interface CeldaMes {
  year: number;
  month: number;
  day: number;
  fueraDelMes: boolean;
  iso: string;
}

function construirCeldas(year: number, month: number): CeldaMes[] {
  const total = diasEnMes(year, month);
  const primerDiaSemana = new Date(year, month, 1).getDay();
  const celdas: CeldaMes[] = [];

  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    celdas.push({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), fueraDelMes: true, iso: fechaAISO(d.getFullYear(), d.getMonth(), d.getDate()) });
  }
  for (let day = 1; day <= total; day++) {
    celdas.push({ year, month, day, fueraDelMes: false, iso: fechaAISO(year, month, day) });
  }
  while (celdas.length < 42) {
    const ultima = celdas[celdas.length - 1];
    const d = new Date(ultima.year, ultima.month, ultima.day + 1);
    celdas.push({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), fueraDelMes: true, iso: fechaAISO(d.getFullYear(), d.getMonth(), d.getDate()) });
  }
  return celdas;
}

export default function AgendaCalendarioPage() {
  const hoy = new Date();
  const isoHoy = fechaAISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const [mesActual, setMesActual] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() });
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [citasMes, setCitasMes] = useState<CitaApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [especialistas, setEspecialistas] = useState<EmpleadoApi[]>([]);
  const [filtroEspecialistaId, setFiltroEspecialistaId] = useState('');

  const celdas = useMemo(() => construirCeldas(mesActual.year, mesActual.month), [mesActual]);

  const cargar = useCallback((year: number, month: number, especialistaId: string) => {
    setLoading(true);
    setError(null);
    const desde = fechaAISO(year, month, 1);
    const hasta = fechaAISO(year, month, diasEnMes(year, month));
    listarCalendario(desde, hasta, especialistaId || undefined)
      .then((data) => setCitasMes(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar la agenda'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar(mesActual.year, mesActual.month, filtroEspecialistaId);
    setDiaSeleccionado(null);
  }, [mesActual, filtroEspecialistaId, cargar]);

  useEffect(() => {
    listarEmpleados({ limit: 200 }).then(({ data }) => setEspecialistas(data)).catch(() => {});
  }, []);

  const diasConCitas = useMemo(() => {
    const set = new Set<string>();
    for (const c of citasMes) {
      const iso = diaLocalDeISO(c.fechaHoraInicio);
      if (iso) set.add(iso);
    }
    return set;
  }, [citasMes]);

  const citasDelDiaSeleccionado = useMemo(() => {
    if (!diaSeleccionado) return [];
    return citasMes
      .filter((c) => diaLocalDeISO(c.fechaHoraInicio) === diaSeleccionado)
      .sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio));
  }, [citasMes, diaSeleccionado]);

  const irMesAnterior = () => {
    setMesActual(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  };
  const irMesSiguiente = () => {
    setMesActual(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));
  };

  return (
    <OperacionLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Agenda / Calendario
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Visualiza la disponibilidad del salón y las citas programadas
          </p>
        </div>

        {/* Calendario mensual */}
        <Card variant="elevated" padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={irMesAnterior}
                aria-label="Mes anterior"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--menu-texto-principal)' }}
              >
                <ChevronLeft size={16} />
              </button>
              <p className="text-lg font-semibold capitalize min-w-[160px] text-center" style={{ color: 'var(--menu-texto-principal)' }}>
                {NOMBRES_MES[mesActual.month]} {mesActual.year}
              </p>
              <button
                type="button"
                onClick={irMesSiguiente}
                aria-label="Mes siguiente"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--menu-texto-principal)' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <Select
              value={filtroEspecialistaId}
              onChange={(e) => setFiltroEspecialistaId(e.target.value)}
              options={[
                { value: '', label: 'Todos los especialistas' },
                ...especialistas.map((esp) => ({ value: esp.usuarioId, label: esp.nombre ?? esp.puesto ?? 'Especialista sin nombre' })),
              ]}
              className="sm:w-56"
            />
          </div>

          {error ? (
            <div className="text-center py-8">
              <p className="mb-3" style={{ color: 'var(--danger-texto)' }}>{error}</p>
              <Button variant="outline" onClick={() => cargar(mesActual.year, mesActual.month, filtroEspecialistaId)}>Reintentar</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {NOMBRES_DIA.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {celdas.map((celda) => {
                  const esHoy = celda.iso === isoHoy;
                  const esSeleccionado = celda.iso === diaSeleccionado;
                  const tieneCitas = diasConCitas.has(celda.iso);
                  return (
                    <button
                      key={celda.iso}
                      type="button"
                      onClick={() => setDiaSeleccionado(celda.iso)}
                      disabled={loading}
                      className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-colors relative"
                      style={{
                        backgroundColor: esSeleccionado ? 'var(--botones-principales)' : 'var(--fondos-suaves)',
                        border: esHoy && !esSeleccionado ? '2px solid var(--logo-branding)' : '2px solid transparent',
                        opacity: celda.fueraDelMes ? 0.4 : 1,
                        cursor: loading ? 'default' : 'pointer',
                      }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: esSeleccionado ? '#ffffff' : 'var(--menu-texto-principal)' }}
                      >
                        {celda.day}
                      </span>
                      {tieneCitas && (
                        <span
                          aria-hidden
                          className={`w-1.5 h-1.5 rounded-full ${
                            esSeleccionado ? 'bg-white' : 'bg-[var(--botones-principales)] dark:bg-[var(--logo-branding)]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Panel de citas del día seleccionado */}
        {diaSeleccionado ? (
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CalendarDays size={18} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Citas del día seleccionado</p>
                <p className="text-lg font-semibold capitalize" style={{ color: 'var(--menu-texto-principal)' }}>
                  {formatearFechaLocal(diaSeleccionado)} · {loading ? '…' : citasDelDiaSeleccionado.length}
                </p>
              </div>
            </div>

            {loading ? (
              <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
            ) : citasDelDiaSeleccionado.length === 0 ? (
              <div className="text-center py-8">
                <Clock3 size={24} className="mx-auto mb-2" style={{ color: 'var(--encabezados-alterno)' }} />
                <p style={{ color: 'var(--encabezados-alterno)' }}>No hay citas para este día.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {citasDelDiaSeleccionado.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--fondos-suaves)' }}
                  >
                    <div className="text-center min-w-[70px]">
                      <p className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{hora(c.fechaHoraInicio)}</p>
                      <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>{hora(c.fechaHoraFin)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{c.clienteNombre ?? 'Cliente sin nombre'}</p>
                      <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                        {(c.servicioNombre ?? 'Servicio')} · {(c.especialistaNombre ?? 'Especialista sin nombre')}
                      </p>
                    </div>
                    <Badge variant={varianteEstadoCita(c.estado)}>{etiquetaEstadoCita(c.estado)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          !error && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Selecciona un día en el calendario para ver sus citas.
            </p>
          )
        )}
      </div>
    </OperacionLayout>
  );
}
