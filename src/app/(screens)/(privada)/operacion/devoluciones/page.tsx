'use client';

import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import GestionDevoluciones from '../../../../components/devoluciones/GestionDevoluciones';

/** Aprobar y rechazar cambios y reembolsos desde operación (devoluciones:gestionar: estilista y admin). */
export default function DevolucionesOperacionPage() {
  return (
    <OperacionLayout permisoRequerido="devoluciones:gestionar">
      <GestionDevoluciones conNuevaSolicitud={false} />
    </OperacionLayout>
  );
}
