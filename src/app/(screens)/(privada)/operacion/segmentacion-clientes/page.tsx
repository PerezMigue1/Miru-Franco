'use client';

import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PanelSegmentacionClientes from '../../../../components/clientes/PanelSegmentacionClientes';

export default function SegmentacionClientesOperacionPage() {
  return (
    <OperacionLayout permisoRequerido="clientes:lectura">
      <PanelSegmentacionClientes rutaBasePerfil="/operacion/clientes-crm" />
    </OperacionLayout>
  );
}
