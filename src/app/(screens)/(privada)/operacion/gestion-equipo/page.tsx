'use client';

import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PanelSolicitudes from '../../../../components/personal/PanelSolicitudes';
import PanelAsistencia from '../../../../components/personal/PanelAsistencia';
import PanelHorasExtra from '../../../../components/personal/PanelHorasExtra';

/**
 * Gestión de equipo para la jefa (estilista): aprobar solicitudes de permiso, ver/corregir
 * asistencia y ver horas extra del equipo — los mismos componentes que admin/gestion-personal,
 * sin duplicar lógica. El admin técnico sigue usando esas secciones desde /admin.
 */
export default function GestionEquipoPage() {
  return (
    <OperacionLayout permisoRequerido="asistencia:gestionar">
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Gestión de equipo
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Solicitudes de permiso, asistencia y horas extra del personal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PanelSolicitudes />
          <PanelHorasExtra />
        </div>

        <PanelAsistencia />
      </div>
    </OperacionLayout>
  );
}
