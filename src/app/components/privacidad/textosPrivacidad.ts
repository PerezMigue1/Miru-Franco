import { fechaCortaEnMexico, fechaYHora24EnMexico } from '../../utils/fechaSoloDia';
import { DOCUMENTOS_LEGALES } from '../../utils/documentosLegales';
import type { ConsentimientoRegistrado, TipoConsentimiento } from '../../services/consentimientos';
import type { EstadoArco, TipoArco } from '../../services/arco';

/** Textos y reglas compartidos por "Mis datos y privacidad" y las pantallas de privacidad del panel. */

/** 'dd/mm/aaaa HH:mm' en hora del centro de México (24 h, sin ambigüedad de a.m. y p.m.). */
export function fechaHoraMexico(instante: string | Date | null | undefined): string {
  const partes = fechaYHora24EnMexico(instante);
  const dia = fechaCortaEnMexico(instante);
  return partes && dia ? `${dia} ${partes.hora}` : 'Sin fecha';
}

const ETIQUETA_CONSENTIMIENTO: Record<TipoConsentimiento, string> = {
  terminos: 'Términos y condiciones',
  aviso_privacidad: 'Aviso de privacidad',
  promociones: 'Promociones',
  datos_salud: 'Datos de salud (alergias)',
  terminos_venta: 'Términos de venta',
  reembolsos: 'Política de reembolsos',
  anticipos: 'Política de anticipos',
  fotos_resultado: 'Fotos del resultado',
  cookies: 'Cookies',
};

export function etiquetaConsentimiento(tipo: string): string {
  return ETIQUETA_CONSENTIMIENTO[tipo as TipoConsentimiento] ?? tipo;
}

export function etiquetaAccion(accion: string): string {
  return accion === 'revocado' ? 'Revocado' : accion === 'aceptado' ? 'Aceptado' : accion;
}

/** "Aviso de Privacidad, versión 2.0" con el título del registro de documentos legales. */
export function documentoYVersion(fila: { documentoSlug: string | null; documentoVersion: string | null }): string {
  if (!fila.documentoSlug) return 'Sin documento';
  const titulo = DOCUMENTOS_LEGALES.find((d) => d.slug === fila.documentoSlug)?.titulo ?? fila.documentoSlug;
  return fila.documentoVersion ? `${titulo}, versión ${fila.documentoVersion}` : titulo;
}

export const ETIQUETA_TIPO_ARCO: Record<TipoArco, string> = {
  acceso: 'Acceso',
  rectificacion: 'Rectificación',
  cancelacion: 'Cancelación',
  oposicion: 'Oposición',
  revocacion: 'Revocación',
};

export const ETIQUETA_ESTADO_ARCO: Record<EstadoArco, string> = {
  recibida: 'Recibida',
  en_proceso: 'En proceso',
  respondida: 'Respondida',
  atendida: 'Atendida',
  rechazada: 'Rechazada',
};

export function varianteEstadoArco(estado: EstadoArco): 'info' | 'warning' | 'success' | 'danger' | 'default' {
  switch (estado) {
    case 'recibida':
      return 'info';
    case 'en_proceso':
      return 'warning';
    case 'respondida':
      return 'default';
    case 'atendida':
      return 'success';
    case 'rechazada':
      return 'danger';
    default:
      return 'default';
  }
}

/** La fila más reciente de cada tipo: el estado vigente de ese consentimiento. */
export function ultimoPorTipo(filas: ConsentimientoRegistrado[]): Partial<Record<TipoConsentimiento, ConsentimientoRegistrado>> {
  const ultimos: Partial<Record<TipoConsentimiento, ConsentimientoRegistrado>> = {};
  for (const fila of filas) {
    const actual = ultimos[fila.tipo];
    if (!actual || new Date(fila.creadoEn).getTime() > new Date(actual.creadoEn).getTime()) ultimos[fila.tipo] = fila;
  }
  return ultimos;
}

/** Sin registro también se puede revocar (cuentas anteriores al registro de consentimientos). */
export function puedeRevocar(ultimo: ConsentimientoRegistrado | undefined): boolean {
  return ultimo?.accion !== 'revocado';
}

/**
 * Las fotos del resultado solo existen si se autorizaron en una cita, así que sin registro no hay nada que
 * revocar. Los datos de salud sí pueden venir de antes del registro de consentimientos.
 */
export function estadoRevocable(
  tipo: TipoConsentimiento,
  ultimo: ConsentimientoRegistrado | undefined,
): 'revocable' | 'revocado' | 'sin_autorizacion' {
  if (!ultimo && tipo === 'fotos_resultado') return 'sin_autorizacion';
  return puedeRevocar(ultimo) ? 'revocable' : 'revocado';
}

export function textoSinRegistro(tipo: TipoConsentimiento): string {
  return tipo === 'fotos_resultado'
    ? 'No has dado esta autorización.'
    : 'Sin registro en tu historial. Si nos diste estos datos antes de este registro, puedes retirarlos.';
}
