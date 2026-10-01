'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Card from './Card';

type Tono = 'normal' | 'oro' | 'aviso' | 'peligro' | 'exito';

interface TarjetaKpiProps {
  icono: LucideIcon;
  etiqueta: string;
  valor: ReactNode;
  cargando?: boolean;
  /** true o texto: el dato no se pudo obtener (se muestra un aviso breve, no un número inventado). */
  error?: boolean | string;
  /** Color del valor (variantes "texto" de la paleta: AA sobre terracota en claro y en oscuro). */
  tono?: Tono;
  /** Resalta la tarjeta con un anillo del color del tono (p. ej. "Sin stock" > 0). */
  alerta?: boolean;
  /** Línea secundaria bajo el valor (p. ej. "No disponible para tu rol"). */
  detalle?: ReactNode;
}

const COLOR: Record<Tono, string> = {
  normal: 'var(--menu-texto-principal)',
  oro: 'var(--oro-texto)',
  aviso: 'var(--warning-texto)',
  peligro: 'var(--danger-texto)',
  exito: 'var(--success-texto)',
};

/**
 * KPI de los paneles (DESIGN.md). La etiqueta salta de línea en vez de cortarse ("Total pr…") y
 * el valor escala con el ancho, así cabe en dos columnas desde 360px; mientras carga, skeleton
 * del sistema del mismo alto que el valor (sin saltos al llegar el dato).
 */
export default function TarjetaKpi({
  icono: Icono,
  etiqueta,
  valor,
  cargando = false,
  error = false,
  tono = 'normal',
  alerta = false,
  detalle,
}: TarjetaKpiProps) {
  const color = COLOR[tono];
  return (
    <Card
      padding="sm"
      className="mf-kpi sm:p-5"
      style={alerta ? { boxShadow: `0 0 0 1.5px ${color}, var(--mf-sombra-1)` } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="mf-kpi__etiqueta">{etiqueta}</p>
        <span className="mf-kpi__icono" style={alerta ? { color } : undefined}>
          <Icono size={16} aria-hidden />
        </span>
      </div>
      {cargando ? (
        <div className="mf-skeleton mt-2 h-8 w-2/3" aria-label={`Cargando ${etiqueta.toLowerCase()}`} />
      ) : error ? (
        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>
          {typeof error === 'string' ? error : 'Sin datos'}
        </p>
      ) : (
        <p className="mf-kpi__valor mf-cifras" style={{ color }}>
          {valor}
        </p>
      )}
      {detalle && !cargando && (
        <p className="mt-1 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
          {detalle}
        </p>
      )}
    </Card>
  );
}
