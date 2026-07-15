'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OperacionLayout from '../../../components/layouts/OperacionLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { listarCitasDelDia, type CitaApi } from '../../../services/citas';
import { resumenVentas } from '../../../services/pos';
import { listarSeguimientos } from '../../../services/seguimientos';
import { etiquetaEstadoCita, varianteEstadoCita } from '../../../utils/estados';
import {
  CalendarDays,
  Scissors,
  BadgeDollarSign,
  AlertTriangle,
  Clock3,
} from 'lucide-react';

/** Lee el id del usuario logueado desde localStorage (solo para personalizar "Mis citas de hoy"). */
function miUsuarioId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}') as Record<string, unknown>;
    return typeof u.id === 'string' ? u.id : undefined;
  } catch {
    return undefined;
  }
}

function hora(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OperacionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [citasHoy, setCitasHoy] = useState<CitaApi[]>([]);
  const [ventasHoyMonto, setVentasHoyMonto] = useState<number | null>(null);
  const [seguimientosPendientes, setSeguimientosPendientes] = useState(0);
  const [misCitas, setMisCitas] = useState<CitaApi[]>([]);

  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const miId = miUsuarioId();

    setLoading(true);
    setError(null);

    // Cada fuente se carga por separado: algunos roles (estilista/becario) no tienen
    // permiso sobre /api/pos/* y no deben tumbar el resto del dashboard si falla.
    Promise.allSettled([
      listarCitasDelDia(hoy),
      resumenVentas(hoy, hoy),
      listarSeguimientos({ requiereAccion: true, limit: 100 }),
      miId ? listarCitasDelDia(hoy, miId) : Promise.resolve<CitaApi[]>([]),
    ])
      .then(([citasRes, ventasRes, seguimientosRes, miasRes]) => {
        if (citasRes.status === 'fulfilled') {
          setCitasHoy(citasRes.value);
        } else {
          setError((prev) => prev ?? 'No se pudieron cargar las citas de hoy');
        }

        setVentasHoyMonto(ventasRes.status === 'fulfilled' ? ventasRes.value.totalMonto : null);

        if (seguimientosRes.status === 'fulfilled') {
          setSeguimientosPendientes(seguimientosRes.value.data.length);
        }

        if (miasRes.status === 'fulfilled') {
          setMisCitas(
            [...miasRes.value]
              .sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio))
              .slice(0, 5)
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const enCurso = citasHoy.filter((c) => c.estado === 'en_curso').length;

  return (
    <OperacionLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Panel de operación
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Resumen operativo del día — {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>

        {error && (
          <Card variant="elevated" padding="md" className="border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CalendarDays size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Citas de hoy</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : citasHoy.length}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg" style={enCurso > 0 ? { boxShadow: '0 0 0 2px var(--warning)' } : undefined}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Scissors size={20} style={{ color: 'var(--warning-texto)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>En curso ahora</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: enCurso > 0 ? 'var(--warning-texto)' : 'var(--menu-texto-principal)' }}>{loading ? '…' : enCurso}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Ventas de hoy</p>
                {loading ? (
                  <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--oro-texto)' }}>…</p>
                ) : ventasHoyMonto === null ? (
                  <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>No disponible para tu rol</p>
                ) : (
                  <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--oro-texto)' }}>{fmtMoneda(ventasHoyMonto)}</p>
                )}
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg" style={seguimientosPendientes > 0 ? { boxShadow: '0 0 0 2px var(--danger)' } : undefined}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <AlertTriangle size={20} style={{ color: 'var(--danger-texto)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Seguimientos pendientes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: seguimientosPendientes > 0 ? 'var(--danger-texto)' : 'var(--menu-texto-principal)' }}>{loading ? '…' : seguimientosPendientes}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Mis citas de hoy */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Mis citas de hoy
          </h2>
          {loading ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          ) : misCitas.length === 0 ? (
            <div className="text-center py-8">
              <Clock3 size={24} className="mx-auto mb-2" style={{ color: 'var(--encabezados-alterno)' }} />
              <p style={{ color: 'var(--encabezados-alterno)' }}>No tienes citas asignadas para hoy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {misCitas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-4 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--fondos-suaves)' }}
                >
                  <div className="text-center min-w-[70px]">
                    <p className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{hora(c.fechaHoraInicio)}</p>
                    <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>{hora(c.fechaHoraFin)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--menu-texto-principal)' }}>{c.clienteNombre ?? c.clienteId}</p>
                    <p className="text-sm truncate" style={{ color: 'var(--encabezados-alterno)' }}>{c.servicioNombre ?? 'Servicio'}</p>
                  </div>
                  <Badge variant={varianteEstadoCita(c.estado)}>{etiquetaEstadoCita(c.estado)}</Badge>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/operacion/gestion-citas')}>
              Ver todas las citas
            </Button>
          </div>
        </Card>
      </div>
    </OperacionLayout>
  );
}
