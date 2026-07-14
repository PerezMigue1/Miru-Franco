'use client';

import { useState, useEffect, useCallback } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { listarCitasDelDia, CitaApi } from '../../../../services/citas';
import { listarEmpleados, EmpleadoApi } from '../../../../services/empleados';
import { CalendarDays } from 'lucide-react';

const estadoVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  confirmada: 'success',
  pendiente: 'warning',
  en_curso: 'info',
  completada: 'info',
  reprogramada: 'warning',
  cancelada: 'danger',
  no_asistio: 'danger',
};

function hora(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function AgendaCalendarioPage() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [citas, setCitas] = useState<CitaApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [especialistas, setEspecialistas] = useState<EmpleadoApi[]>([]);
  const [filtroEspecialistaId, setFiltroEspecialistaId] = useState('');

  const cargar = useCallback((f: string, especialistaId: string) => {
    setLoading(true);
    setError(null);
    listarCitasDelDia(f, especialistaId || undefined)
      .then((data) => {
        setCitas([...data].sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar la agenda'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(fecha, filtroEspecialistaId); }, [fecha, filtroEspecialistaId, cargar]);
  useEffect(() => {
    listarEmpleados({ limit: 200 }).then(({ data }) => setEspecialistas(data)).catch(() => {});
  }, []);

  return (
    <OperacionLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Agenda / Calendario
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Visualiza la disponibilidad del salón y las citas programadas
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select
              value={filtroEspecialistaId}
              onChange={(e) => setFiltroEspecialistaId(e.target.value)}
              options={[
                { value: '', label: 'Todos los especialistas' },
                ...especialistas.map((esp) => ({ value: esp.usuarioId, label: esp.nombre ?? esp.puesto ?? esp.usuarioId })),
              ]}
              className="sm:w-56"
            />
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CalendarDays size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Citas del día</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : citas.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando agenda…</p>
        ) : error ? (
          <div className="text-center py-8">
            <p className="mb-3" style={{ color: 'var(--danger-texto)' }}>{error}</p>
            <Button variant="outline" onClick={() => cargar(fecha, filtroEspecialistaId)}>Reintentar</Button>
          </div>
        ) : citas.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
            No hay citas para el {new Date(fecha).toLocaleDateString('es-MX')}.
          </p>
        ) : (
          <div className="space-y-3">
            {citas.map((c) => (
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
                  <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{c.clienteNombre ?? c.clienteId}</p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {(c.servicioNombre ?? 'Servicio')} · {(c.especialistaNombre ?? c.especialistaId)}
                  </p>
                </div>
                <Badge variant={estadoVariant[c.estado] || 'default'}>{c.estado}</Badge>
              </div>
            ))}
          </div>
        )}
        </Card>
      </div>
    </OperacionLayout>
  );
}
