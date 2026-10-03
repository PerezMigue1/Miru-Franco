'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OperacionLayout from '../../../components/layouts/OperacionLayout';
import Card from '../../../components/ui/Card';
import TarjetaKpi from '../../../components/ui/TarjetaKpi';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { listarCitasDelDia, type CitaApi } from '../../../services/citas';
import { resumenVentas } from '../../../services/pos';
import { listarSeguimientos } from '../../../services/seguimientos';
import { usePermisos, evaluarPermiso } from '../../../utils/permisos';
import { etiquetaEstadoCita, varianteEstadoCita } from '../../../utils/estados';
import {
  CalendarDays,
  Scissors,
  BadgeDollarSign,
  AlertTriangle,
  Clock3,
} from 'lucide-react';
import { hoyEnMexico } from '../../../utils/fechaSoloDia';

/** Cualquiera de estas claves permite leer citas (mismas que exige GET /api/citas/dia en el backend). */
const PERMISOS_CITAS = ['citas:propias', 'citas:asignadas', 'citas:escritura', 'citas:propia'];

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

  // Permisos del rol (de /auth/me, que OperacionLayout repuebla en localStorage). Como clave
  // estable para no recargar el dashboard cada vez que se reescribe el usuario guardado.
  const { permisos } = usePermisos();
  const permisosClave = permisos.join(',');

  useEffect(() => {
    // Sin permisos todavía no se sabe qué puede ver el rol: esperar a que lleguen en vez de
    // disparar peticiones que el backend va a rechazar con 403.
    if (!permisosClave) return;
    const lista = permisosClave.split(',');
    const puedeVerCitas = PERMISOS_CITAS.some((p) => evaluarPermiso(lista, p));
    const puedeVerCaja = evaluarPermiso(lista, 'caja:lectura');
    const puedeVerSeguimientos = evaluarPermiso(lista, 'seguimientos:lectura');

    const hoy = hoyEnMexico();
    const miId = miUsuarioId();

    setLoading(true);
    setError(null);

    // Cada fuente se carga por separado y solo si el rol tiene el permiso que exige el
    // backend (p. ej. empleado no tiene caja:lectura ni seguimientos:lectura).
    Promise.allSettled([
      puedeVerCitas ? listarCitasDelDia(hoy) : Promise.resolve<CitaApi[]>([]),
      puedeVerCaja ? resumenVentas(hoy, hoy) : Promise.reject(new Error('Sin permiso caja:lectura')),
      puedeVerSeguimientos
        ? listarSeguimientos({ requiereAccion: true, limit: 100 })
        : Promise.resolve({ data: [], total: 0 }),
      miId && puedeVerCitas ? listarCitasDelDia(hoy, miId) : Promise.resolve<CitaApi[]>([]),
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
  }, [permisosClave]);

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
          <Card variant="elevated" padding="md" role="alert" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--badge-base))', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--danger-texto) 35%, transparent)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {/* KPIs: dos columnas desde 360px, cuatro en escritorio */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <TarjetaKpi icono={CalendarDays} etiqueta="Citas de hoy" cargando={loading} valor={citasHoy.length} />
          <TarjetaKpi
            icono={Scissors}
            etiqueta="En curso ahora"
            cargando={loading}
            valor={enCurso}
            tono={enCurso > 0 ? 'aviso' : 'normal'}
            alerta={enCurso > 0}
          />
          <TarjetaKpi
            icono={BadgeDollarSign}
            etiqueta="Ventas de hoy"
            cargando={loading}
            tono="oro"
            valor={ventasHoyMonto === null ? '—' : fmtMoneda(ventasHoyMonto)}
            detalle={ventasHoyMonto === null ? 'No disponible para tu rol' : undefined}
          />
          <TarjetaKpi
            icono={AlertTriangle}
            etiqueta="Seguimientos pendientes"
            cargando={loading}
            valor={seguimientosPendientes}
            tono={seguimientosPendientes > 0 ? 'peligro' : 'normal'}
            alerta={seguimientosPendientes > 0}
          />
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
