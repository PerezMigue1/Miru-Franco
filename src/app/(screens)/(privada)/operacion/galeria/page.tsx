'use client';

import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PanelGaleria from '../../../../components/galeria/PanelGaleria';
import { PERMISOS_GALERIA } from '../../../../components/galeria/logicaGaleria';

/** Operaciones > Galería: galeria:gestionar (estilista, empleado) administra; galeria:lectura (becaria) solo ve. */
export default function GaleriaOperacionPage() {
  return (
    <OperacionLayout permisoRequerido={PERMISOS_GALERIA}>
      <PanelGaleria />
    </OperacionLayout>
  );
}
