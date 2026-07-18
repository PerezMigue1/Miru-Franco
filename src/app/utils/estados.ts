/** Variantes de color soportadas por el componente `Badge`. */
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

/**
 * Etiquetas en español para `EstadoCita` (backend, prisma/schema.prisma):
 * pendiente | confirmada | en_curso | completada | cancelada | reprogramada | no_asistio
 */
const ETIQUETAS_ESTADO_CITA: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_curso: 'En curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada',
  no_asistio: 'No asistió',
};
                                                                                                                    
const VARIANTE_ESTADO_CITA: Record<string, BadgeVariant> = {
  pendiente: 'warning',
  confirmada: 'success',
  en_curso: 'info',
  completada: 'info',
  reprogramada: 'warning',
  cancelada: 'danger',
  no_asistio: 'danger',
};

/**
 * Etiquetas en español para `EstadoVentaLocal` (backend, prisma/schema.prisma):
 * pendiente | pagada | cancelada.
 */
const ETIQUETAS_ESTADO_VENTA: Record<string, string> = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
};

const VARIANTE_ESTADO_VENTA: Record<string, BadgeVariant> = {
  pendiente: 'warning',
  pagada: 'success',
  cancelada: 'danger',
};

/** Fallback para valores de enum no contemplados (p. ej. si el enum se amplía a futuro): 'no_asistio' → 'No asistio'. Nunca snake_case crudo. */
function fallbackLegible(valor: string): string {
  return valor
    .split('_')
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

export function etiquetaEstadoCita(estado: string | undefined | null): string {
  if (!estado) return '—';
  return ETIQUETAS_ESTADO_CITA[estado] ?? fallbackLegible(estado);
}

export function varianteEstadoCita(estado: string | undefined | null): BadgeVariant {
  if (!estado) return 'default';
  return VARIANTE_ESTADO_CITA[estado] ?? 'default';
}

export function etiquetaEstadoVenta(estado: string | undefined | null): string {
  if (!estado) return '—';
  return ETIQUETAS_ESTADO_VENTA[estado] ?? fallbackLegible(estado);
}

export function varianteEstadoVenta(estado: string | undefined | null): BadgeVariant {
  if (!estado) return 'default';
  return VARIANTE_ESTADO_VENTA[estado] ?? 'default';
}
