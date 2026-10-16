/**
 * Lógica pura de las pantallas del panel de operación (/operacion), separada para probarla sin DOM.
 */
import { fmtMoneda, montoValido } from '../../../../utils/cobroPos';

type TienePermiso = (clave: string | readonly string[] | undefined | null) => boolean;

const centavos = (n: number) => Math.round(n * 100);

/** Primera letra en mayúscula y guiones bajos como espacios: 'vale_regalo' → 'Vale regalo'. */
function legible(clave: string): string {
  const texto = clave.replace(/_/g, ' ').trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '';
}

/**
 * "Ventas de hoy" y "Total del día": solo ventas pagadas. Las canceladas (y las pendientes, que aún
 * no se cobran) no son dinero en caja; el corte del backend también suma solo estado 'pagada'.
 */
export function resumenVentasCobradas(ventas: { estado: string; total?: number | null }[]): { cantidad: number; total: number } {
  const pagadas = ventas.filter((v) => v.estado === 'pagada');
  const total = pagadas.reduce((s, v) => s + centavos(Number(v.total) || 0), 0) / 100;
  return { cantidad: pagadas.length, total };
}

/** Cerrar un seguimiento que pide acción: PUT /seguimientos/:id exige seguimientos:escritura. */
export function puedeMarcarAtendido(tienePermiso: TienePermiso, s: { requiereAccion: boolean }): boolean {
  return s.requiereAccion && tienePermiso('seguimientos:escritura');
}

/** Gestión de citas exige citas:escritura; sin él (becaria) la agenda muestra las citas sin mandar a /403. */
export function rutaVerTodasLasCitas(tienePermiso: TienePermiso): string {
  return tienePermiso('citas:escritura') ? '/operacion/gestion-citas' : '/operacion/agenda-calendario';
}

export function validarMotivoCancelacionCita(motivo: string): string | null {
  return motivo.trim() ? null : 'Escribe el motivo de la cancelación';
}

export type EstadoListado = 'cargando' | 'error' | 'vacio' | 'lista';

/** Qué pintar en un listado: con error se muestra el error (con Reintentar), nunca el vacío a la vez. */
export function estadoListado({ cargando, error, cantidad }: { cargando: boolean; error: string | null; cantidad: number }): EstadoListado {
  if (cargando) return 'cargando';
  if (error) return 'error';
  return cantidad === 0 ? 'vacio' : 'lista';
}

/** Ejecución de servicios: si falla alguna de las dos consultas se avisa en vez de mostrar una lista incompleta sin explicación. */
export function resultadoCargaEjecucion<A, B>(
  enCursoRes: PromiseSettledResult<{ data: A[] }>,
  hoyRes: PromiseSettledResult<{ data: B[] }>,
): { enCurso: A[]; hoy: B[]; error: string | null } {
  const fallo = enCursoRes.status === 'rejected' || hoyRes.status === 'rejected';
  return {
    enCurso: enCursoRes.status === 'fulfilled' ? enCursoRes.value.data : [],
    hoy: hoyRes.status === 'fulfilled' ? hoyRes.value.data : [],
    error: fallo ? 'No se pudieron cargar todos los servicios de hoy. La lista puede estar incompleta.' : null,
  };
}

/** Gestión de citas: 25 por página (con 100 la página medía más de 11.000 px de alto). */
export const TAMANO_PAGINA_CITAS = 25;

/**
 * Columnas de la tabla de gestión de citas: fecha, inicio y fin van juntos en "Horario" y la especialista
 * bajo el servicio. Con 9 columnas la tabla medía 1458 px en un marco de 1062 (Riesgo IA y Acciones fuera).
 */
export const COLUMNAS_TABLA_CITAS = ['Cliente', 'Horario', 'Servicio', 'Estado', 'Riesgo IA', 'Acciones'] as const;

const ESTADOS_FINALES_CITA = ['cancelada', 'completada', 'no_asistio'];

/**
 * Acciones de una fila de gestión de citas: la principal (check-in o check-out) a la vista y el resto
 * (reprogramar, cancelar y las del anticipo) en el menú "Más", para que la fila no crezca a 240 px.
 */
export function accionesCita(
  estado: string,
  hayAccionesAnticipo: boolean,
): { principal: 'checkin' | 'checkout' | null; secundarias: ('reprogramar' | 'cancelar')[]; conMenu: boolean } {
  const principal = estado === 'pendiente' || estado === 'confirmada' ? 'checkin' : estado === 'en_curso' ? 'checkout' : null;
  const secundarias: ('reprogramar' | 'cancelar')[] = ESTADOS_FINALES_CITA.includes(estado) ? [] : ['reprogramar', 'cancelar'];
  return { principal, secundarias, conMenu: secundarias.length > 0 || hayAccionesAnticipo };
}

/**
 * Dónde abrir un menú flotante (position: fixed) junto a su botón: debajo y alineado a su borde
 * derecho; arriba si abajo no cabe la altura estimada y arriba hay más espacio. Nunca pegado al borde.
 */
export function posicionMenu(
  disparador: { top: number; bottom: number; right: number },
  ventana: { ancho: number; alto: number },
  altoEstimado = 240,
): { right: number; top?: number; bottom?: number; maxHeight: number } {
  const MARGEN = 8;
  const SEPARACION = 4;
  const right = Math.max(MARGEN, ventana.ancho - disparador.right);
  const espacioAbajo = ventana.alto - disparador.bottom - SEPARACION - MARGEN;
  const espacioArriba = disparador.top - SEPARACION - MARGEN;
  if (espacioAbajo >= altoEstimado || espacioAbajo >= espacioArriba) {
    return { right, top: disparador.bottom + SEPARACION, maxHeight: Math.max(0, espacioAbajo) };
  }
  return { right, bottom: ventana.alto - disparador.top + SEPARACION, maxHeight: Math.max(0, espacioArriba) };
}

/**
 * De dónde sale "Ventas de hoy" en /operacion: el resumen de caja (caja:lectura), las ventas del día
 * sumadas como en el punto de venta (ventas:escritura) o ninguna (sin permiso de ventas la tarjeta no va).
 */
export function fuenteVentasHoy(tienePermiso: TienePermiso): 'resumen' | 'ventas' | null {
  if (tienePermiso('caja:lectura')) return 'resumen';
  if (tienePermiso('ventas:escritura')) return 'ventas';
  return null;
}

/** Tono de un KPI que solo alerta cuando hay algo que atender (en cero se queda normal). */
export function tonoSiHay<T extends string>(cantidad: number, tono: T): T | 'normal' {
  return cantidad > 0 ? tono : 'normal';
}

/** Contadores de gestión de citas: cuentan solo la página visible, y así lo dicen. */
export function resumenCitasPagina(citas: { estado: string }[]) {
  return {
    pendientes: { etiqueta: 'Pendientes / confirmadas en esta página', valor: citas.filter((c) => c.estado === 'pendiente' || c.estado === 'confirmada').length },
    enCurso: { etiqueta: 'En curso en esta página', valor: citas.filter((c) => c.estado === 'en_curso').length },
    canceladas: { etiqueta: 'Canceladas en esta página', valor: citas.filter((c) => c.estado === 'cancelada').length },
  };
}

export const MAX_MOTIVO_SOLICITUD = 500;

export function validarSolicitudPermiso({ fechaInicio, fechaFin, motivo }: { fechaInicio: string; fechaFin: string; motivo: string }): string | null {
  if (!fechaInicio || !fechaFin) return 'Selecciona el rango de fechas';
  if (fechaFin < fechaInicio) return 'La fecha de fin no puede ser anterior a la de inicio';
  if (!motivo.trim()) return 'Ingresa el motivo';
  if (motivo.trim().length > MAX_MOTIVO_SOLICITUD) return `El motivo admite hasta ${MAX_MOTIVO_SOLICITUD} caracteres`;
  return null;
}

/** Tipos de notificación que crea el backend (Notificacion.tipo), en palabras para el personal. */
const TIPOS_NOTIFICACION: Record<string, string> = {
  cita_creada: 'Cita agendada',
  cita_confirmada: 'Cita confirmada',
  cita_asignada: 'Cita asignada',
  cita_reprogramada: 'Cita reprogramada',
  cita_cancelada: 'Cita cancelada',
  cita_recordatorio: 'Recordatorio de cita',
  pedido_creado: 'Pedido recibido',
  pedido_confirmado: 'Pedido confirmado',
  pedido_listo_recoger: 'Pedido listo para recoger',
  pedido_recordatorio_recoger: 'Recordatorio para recoger pedido',
  pedido_entregado: 'Pedido entregado',
  pedido_cancelado: 'Pedido cancelado',
  pedido_cancelado_pagado: 'Pedido pagado cancelado',
  pago_revision: 'Pago en revisión',
  venta: 'Venta',
  reembolso: 'Reembolso',
  cambio: 'Cambio de producto',
  cfdi: 'Factura',
  // Avisos del personal y de privacidad que antes se veían con el nombre interno ("Cita nueva" salía de cita_nueva).
  cita_nueva: 'Cita nueva',
  anticipo_pagado: 'Anticipo pagado',
  anticipo_por_devolver: 'Anticipo por devolver',
  pedido_nuevo: 'Pedido nuevo',
  revocacion_por_recibir: 'Revocación por recibir',
  arco_solicitud: 'Solicitud ARCO',
  arco_respuesta: 'Respuesta a solicitud ARCO',
};

export function etiquetaTipoNotificacion(tipo: string | null | undefined): string {
  const clave = (tipo ?? '').trim().toLowerCase();
  if (!clave) return 'Aviso';
  return TIPOS_NOTIFICACION[clave] ?? legible(clave);
}

const METODOS_PAGO_VENTA: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  mixto: 'Mixto',
};

/** Método de pago de una venta del punto de venta (el backend guarda la clave). */
export function etiquetaMetodoPagoVenta(metodo: string | null | undefined): string {
  const clave = (metodo ?? '').trim().toLowerCase();
  if (!clave) return '-';
  return METODOS_PAGO_VENTA[clave] ?? legible(clave);
}

export function folioVenta(v: { id: number; folio?: string }): string {
  return v.folio || `#${v.id}`;
}

/** Comisiones_servicio.monto es Decimal(10, 2). */
export const MONTO_MAXIMO_COMISION = 99999999.99;

export function validarMontoComision(texto: string): string | null {
  if (!montoValido(texto)) return 'Monto inválido: cero o más, con hasta 2 decimales';
  if (Number(texto) > MONTO_MAXIMO_COMISION) return `El monto máximo es ${fmtMoneda(MONTO_MAXIMO_COMISION)}`;
  return null;
}

/** Copia texto; false si el navegador no da acceso al portapapeles (sin HTTPS, permiso denegado). */
export async function copiarAlPortapapeles(
  texto: string,
  portapapeles: { writeText: (t: string) => Promise<void> } | undefined,
): Promise<boolean> {
  if (!portapapeles) return false;
  try {
    await portapapeles.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fecha (YYYY-MM-DD) y hora (HH:mm) capturadas en hora del salón a ISO: con el desfase fijo de México
 * (-06:00, sin horario de verano desde 2022) y no con la zona del navegador, igual que la precarga.
 */
export function isoDesdeFechaHoraMexico(fecha: string, hora: string): string {
  return new Date(`${fecha}T${hora}:00-06:00`).toISOString();
}
