'use client';

import { useState, useEffect, useCallback } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import { listarCitasDelDia, CitaApi } from '../../../../services/citas';

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

  const cargar = useCallback((f: string) => {
    setLoading(true);
    setError(null);
    listarCitasDelDia(f)
      .then((data) => setCitas([...data].sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio))))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar la agenda'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(fecha); }, [fecha, cargar]);

  return (
    <OperacionLayout>
      <PageHeader
        title="Agenda / Calendario"
        subtitle="Visualiza y gestiona la disponibilidad del salón y las citas programadas"
        actions={
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        }
      />

      <Card>
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando agenda…</p>
        ) : error ? (
          <div className="text-center py-8">
            <p className="mb-3" style={{ color: 'var(--danger)' }}>{error}</p>
            <Button variant="outline" onClick={() => cargar(fecha)}>Reintentar</Button>
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
                style={{ border: '1px solid var(--bordes)' }}
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
    </OperacionLayout>
  );
}
