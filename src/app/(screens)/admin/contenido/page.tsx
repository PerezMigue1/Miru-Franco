'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Images, MessageCircleQuestion, Tag, Users, type LucideIcon } from 'lucide-react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PanelGaleria from '../../../components/galeria/PanelGaleria';
import { SeccionEquipo, SeccionPreguntas, SeccionPromociones } from '../../../components/contenido/SeccionesContenido';
import { usePermisos } from '../../../utils/permisos';

type Pestana = 'promociones' | 'preguntas' | 'equipo' | 'galeria';

const PESTANAS: { id: Pestana; etiqueta: string; icono: LucideIcon }[] = [
  { id: 'promociones', etiqueta: 'Promociones', icono: Tag },
  { id: 'preguntas', etiqueta: 'Preguntas frecuentes', icono: MessageCircleQuestion },
  { id: 'equipo', etiqueta: 'Equipo', icono: Users },
  { id: 'galeria', etiqueta: 'Galería', icono: Images },
];

/**
 * Admin > Contenido del sitio (configuracion:editar, solo admin): promociones, preguntas frecuentes, equipo y la
 * galería (la misma de Operaciones > Galería; el admin no entra al panel de operación). Lo que se publica aquí se ve
 * en el sitio en un minuto, sin deploy.
 */
export default function ContenidoAdminPage() {
  const [activa, setActiva] = useState<Pestana>('promociones');
  const botones = useRef<Record<string, HTMLButtonElement | null>>({});
  const { tienePermiso } = usePermisos();
  const puedeEditar = tienePermiso('configuracion:editar');

  /** Flechas, Inicio y Fin mueven entre pestañas (patrón de pestañas de WAI-ARIA). */
  const alTeclear = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = PESTANAS.findIndex((p) => p.id === activa);
    const destino =
      e.key === 'ArrowRight' ? (i + 1) % PESTANAS.length : e.key === 'ArrowLeft' ? (i - 1 + PESTANAS.length) % PESTANAS.length : e.key === 'Home' ? 0 : e.key === 'End' ? PESTANAS.length - 1 : -1;
    if (destino < 0) return;
    e.preventDefault();
    setActiva(PESTANAS[destino].id);
    botones.current[PESTANAS[destino].id]?.focus();
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Contenido del sitio
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Lo que ve el público: promociones, preguntas frecuentes, el equipo y la galería. Los cambios aparecen en el sitio en
            cerca de un minuto.
          </p>
        </div>

        {!puedeEditar ? (
          <p role="alert" className="text-sm text-[var(--danger-texto)]">
            Tu rol no puede editar el contenido del sitio.
          </p>
        ) : (
          <>
            <div role="tablist" aria-label="Secciones del contenido" className="flex flex-wrap gap-1 border-b pb-px" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
              {PESTANAS.map(({ id, etiqueta, icono: Icono }) => {
                const seleccionada = id === activa;
                return (
                  <button
                    key={id}
                    ref={(el) => {
                      botones.current[id] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`pestana-${id}`}
                    aria-selected={seleccionada}
                    aria-controls={`panel-${id}`}
                    tabIndex={seleccionada ? 0 : -1}
                    onClick={() => setActiva(id)}
                    onKeyDown={alTeclear}
                    className="mf-btn inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-[10px] px-4 text-sm font-semibold"
                    style={{
                      color: seleccionada ? 'var(--nav-activo-texto, var(--botones-principales))' : 'var(--encabezados-alterno)',
                      backgroundColor: seleccionada ? 'var(--nav-activo-bg, transparent)' : 'transparent',
                      boxShadow: seleccionada ? 'inset 0 -2px 0 currentColor' : 'none',
                    }}
                  >
                    <Icono size={16} aria-hidden />
                    {etiqueta}
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" id={`panel-${activa}`} aria-labelledby={`pestana-${activa}`} tabIndex={0}>
              {activa === 'promociones' && <SeccionPromociones />}
              {activa === 'preguntas' && <SeccionPreguntas />}
              {activa === 'equipo' && <SeccionEquipo />}
              {activa === 'galeria' && <PanelGaleria incrustado />}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
