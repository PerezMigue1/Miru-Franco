'use client';

import type { ReactNode, SyntheticEvent } from 'react';

interface CatalogoCardProps {
  imagenUrl?: string | null;
  imagenFallback: string;
  imagenAlt?: string;
  titulo: string;
  /** Badge de estado, se muestra a la derecha del título (ej. Activo/Inactivo, Disponible/No disponible). */
  estadoBadge?: ReactNode;
  /** Contenido intermedio: badges de categoría, filas de info (precio/duración, stock/caducidad, etc.). */
  children?: ReactNode;
  /** Botones de acción anclados al pie de la card. */
  acciones?: ReactNode;
}

/**
 * Card de catálogo compartida entre Servicios e Inventario: imagen 4:3, título + badge de estado,
 * contenido intermedio flexible, acciones ancladas al pie con separador.
 */
export default function CatalogoCard({
  imagenUrl,
  imagenFallback,
  imagenAlt = '',
  titulo,
  estadoBadge,
  children,
  acciones,
}: CatalogoCardProps) {
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--fondo-general)', border: '1px solid var(--fondos-suaves)' }}
    >
      <div className="w-full aspect-[4/3] overflow-hidden" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
        <img
          src={imagenUrl?.trim() ? imagenUrl : imagenFallback}
          alt={imagenAlt}
          className="w-full h-full object-cover"
          onError={(e: SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = imagenFallback;
          }}
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold leading-snug" style={{ color: 'var(--menu-texto-principal)' }}>{titulo}</h3>
          {estadoBadge}
        </div>
        <div className="flex-1 flex flex-col gap-3">{children}</div>
        {acciones && (
          <div className="flex gap-2 pt-3 mt-3 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
            {acciones}
          </div>
        )}
      </div>
    </div>
  );
}
