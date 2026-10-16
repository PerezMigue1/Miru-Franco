'use client';

import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import { SeccionEquipo } from '../../../../components/contenido/SeccionesContenido';

/** Permiso de Operaciones > Equipo en el sitio (o configuracion:editar del admin). */
export const PERMISOS_EQUIPO_SITIO = ['equipo:publico', 'configuracion:editar'] as const;

/**
 * Operaciones > Equipo en el sitio: quién aparece en la página pública, con su foto, su presentación y su orden. Es la
 * misma sección de Admin > Contenido del sitio; lo que se guarda se ve en el sitio al momento.
 */
export default function EquipoSitioOperacionPage() {
  return (
    <OperacionLayout permisoRequerido={PERMISOS_EQUIPO_SITIO}>
      <div className="w-full max-w-none space-y-6">
        <div>
          <h1 className="text-elegant-title text-menu-texto-principal">Equipo en el sitio</h1>
          <p className="mt-1 max-w-[65ch] text-sm text-encabezados-alterno">
            Quién aparece en la página del equipo, con su foto y su presentación. Lo que guardes aquí se ve en el sitio al momento.
          </p>
        </div>
        <SeccionEquipo />
      </div>
    </OperacionLayout>
  );
}
