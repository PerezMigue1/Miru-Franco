'use client';

import { useState, useEffect } from 'react';
import { listarCalendario, listarCitasDelDia, CitaApi } from '../../../services/citas';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

interface CitaDia {
  hora: string;
  cliente: string;
  servicio: string;
  especialista: string;
  estado: string;
}

function mapearCitaDia(c: CitaApi): CitaDia {
  const fechaHora = c.fechaHoraInicio ? new Date(c.fechaHoraInicio) : null;
  return {
    hora: fechaHora ? fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-',
    cliente: c.clienteNombre ?? '-',
    servicio: c.servicioNombre ?? '-',
    especialista: c.especialistaNombre ?? '-',
    estado: c.estado,
  };
}

export default function AgendaCalendarioPage() {
  const [citasHoy, setCitasHoy] = useState<CitaDia[]>([]);
  const [citasPorDia, setCitasPorDia] = useState<Record<number, number>>({});
  const [mesActual] = useState(() => new Date());

  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    listarCitasDelDia(hoy)
      .then((data) => setCitasHoy(data.map(mapearCitaDia)))
      .catch(() => {});

    const inicioMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1).toISOString().slice(0, 10);
    const finMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).toISOString().slice(0, 10);
    listarCalendario(inicioMes, finMes)
      .then((data) => {
        const conteo: Record<number, number> = {};
        data.forEach((c) => {
          if (c.fechaHoraInicio) {
            const dia = new Date(c.fechaHoraInicio).getDate();
            conteo[dia] = (conteo[dia] ?? 0) + 1;
          }
        });
        setCitasPorDia(conteo);
      })
      .catch(() => {});
  }, [mesActual]);

  const diasEnMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).getDate();
  const nombreMes = mesActual.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <AdminLayout>
      <PageHeader
        title="Agenda / Calendario"
        subtitle="Visualiza y gestiona la disponibilidad del salón y las citas programadas"
        actions={
          <div className="flex gap-2">
            <Button variant="outline">Vista Semanal</Button>
            <Button variant="outline">Vista Mensual</Button>
            <Button>+ Nueva Cita</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Calendario - {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
          </h2>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia) => (
              <div
                key={dia}
                className="text-center font-semibold py-2"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                {dia}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => (
              <div
                key={dia}
                className="aspect-square p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: dia === new Date().getDate() ? 'var(--fondos-suaves)' : 'var(--fondo-general)',
                  borderColor: 'var(--fondos-suaves)',
                }}
              >
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                  {dia}
                </div>
                {citasPorDia[dia] ? (
                  <div className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                    {citasPorDia[dia]} cita{citasPorDia[dia] !== 1 ? 's' : ''}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Citas de Hoy
          </h2>
          <div className="space-y-3">
            {citasHoy.map((cita, index) => (
              <div
                key={index}
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--fondos-suaves)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      {cita.hora}
                    </p>
                    <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {cita.cliente}
                    </p>
                  </div>
                  <Badge variant={cita.estado === 'confirmada' ? 'success' : 'warning'}>
                    {cita.estado}
                  </Badge>
                </div>
                <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                  {cita.servicio}
                </p>
                <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                  {cita.especialista}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
