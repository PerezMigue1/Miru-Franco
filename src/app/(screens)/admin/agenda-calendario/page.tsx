'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { colors } from '../../../utils/colors';

export default function AgendaCalendarioPage() {
  const citasHoy = [
    { hora: '09:00', cliente: 'María González', servicio: 'Corte', especialista: 'Mildred', estado: 'confirmada' },
    { hora: '10:30', cliente: 'Ana López', servicio: 'Alaciado', especialista: 'Auxiliar', estado: 'confirmada' },
    { hora: '14:00', cliente: 'Carmen Ruiz', servicio: 'Nanoplastía', especialista: 'Mildred', estado: 'pendiente' },
  ];

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
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Calendario - Enero 2024
          </h2>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia) => (
              <div
                key={dia}
                className="text-center font-semibold py-2"
                style={{ color: colors.menuTextoPrincipal }}
              >
                {dia}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
              <div
                key={dia}
                className="aspect-square p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: dia === 15 ? colors.fondosSuaves : colors.fondoGeneral,
                  borderColor: colors.fondosSuaves,
                }}
              >
                <div className="text-sm font-semibold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                  {dia}
                </div>
                {dia === 15 && (
                  <div className="text-xs" style={{ color: colors.encabezadosAlterno }}>
                    3 citas
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Citas de Hoy
          </h2>
          <div className="space-y-3">
            {citasHoy.map((cita, index) => (
              <div
                key={index}
                className="p-3 rounded-lg"
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: colors.menuTextoPrincipal }}>
                      {cita.hora}
                    </p>
                    <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                      {cita.cliente}
                    </p>
                  </div>
                  <Badge variant={cita.estado === 'confirmada' ? 'success' : 'warning'}>
                    {cita.estado}
                  </Badge>
                </div>
                <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>
                  {cita.servicio}
                </p>
                <p className="text-xs" style={{ color: colors.encabezadosAlterno }}>
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

