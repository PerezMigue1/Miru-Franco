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

/**
 * Etiquetas en español para `EstadoCotizacion` (backend, prisma/schema.prisma):
 * pendiente | confirmada | cancelada.
 */
const ETIQUETAS_ESTADO_COTIZACION: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

const VARIANTE_ESTADO_COTIZACION: Record<string, BadgeVariant> = {
  pendiente: 'warning',
  confirmada: 'success',
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

export function etiquetaEstadoCotizacion(estado: string | undefined | null): string {
  if (!estado) return '—';
  return ETIQUETAS_ESTADO_COTIZACION[estado] ?? fallbackLegible(estado);
}

export function varianteEstadoCotizacion(estado: string | undefined | null): BadgeVariant {
  if (!estado) return 'default';
  return VARIANTE_ESTADO_COTIZACION[estado] ?? 'default';
}

/**
 * Tipo de una notificación en palabras para el portal (las claves salen del backend:
 * pedido_creado, cita_recordatorio, venta, pago_revision...). Nunca la clave interna.
 */
export function etiquetaTipoNotificacion(tipo: string | undefined | null): string {
  const clave = (tipo ?? '').trim().toLowerCase();
  if (clave.startsWith('pedido')) return 'Pedido';
  if (clave.startsWith('cita')) return 'Cita';
  if (clave === 'venta') return 'Compra en salón';
  if (clave.startsWith('pago')) return 'Pago';
  return 'Aviso';
}

/** Estado de una factura (texto libre en el backend: solicitada | timbrada | emitida | cancelada). */
const ETIQUETAS_ESTADO_FACTURA: Record<string, string> = {
  solicitada: 'Solicitada',
  timbrada: 'Timbrada',
  emitida: 'Emitida',
  cancelada: 'Cancelada',
};

export function etiquetaEstadoFactura(estado: string | undefined | null): string {
  if (!estado) return '—';
  return ETIQUETAS_ESTADO_FACTURA[estado] ?? fallbackLegible(estado);
}

/** `EstadoEnvio` del backend (prisma/schema.prisma): preparando | en_transito | entregado | fallido. */
const ETIQUETAS_ESTADO_ENVIO: Record<string, string> = {
  preparando: 'En preparación',
  en_transito: 'En tránsito',
  entregado: 'Entregado',
  fallido: 'No se pudo entregar',
};

export function etiquetaEstadoEnvio(estado: string | undefined | null): string {
  if (!estado) return '—';
  return ETIQUETAS_ESTADO_ENVIO[estado] ?? fallbackLegible(estado);
}
