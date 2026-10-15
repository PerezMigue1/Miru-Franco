import {
  MAX_RESPUESTA_ARCO,
  MENSAJE_FALTA_RESPUESTA,
  exigeRespuesta,
  type ConsentimientoRevocableArco,
  type EstadoArco,
  type EstadoArcoRespuesta,
  type TipoArco,
} from '../../../services/arco';
import { etiquetaConsentimiento } from '../../../components/privacidad/textosPrivacidad';

/**
 * Reglas de la bandeja ARCO del panel. El plazo que corre depende del estado: abierta (recibida o en proceso),
 * el de respuesta (20 días hábiles); respondida, el de efectividad (15 días hábiles desde la respuesta), igual
 * que estaVencida en backend-miru src/arco/arco.service.ts. Atendida y rechazada ya están cerradas.
 */
export type UrgenciaArco = 'vencida' | 'por_vencer' | 'en_plazo' | 'cerrada';

/** Días naturales antes del vencimiento desde los que una solicitud se resalta como "vence pronto". */
export const DIAS_POR_VENCER = 5;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

interface ConPlazos {
  estado: EstadoArco;
  venceRespuesta: string;
  venceEfectividad: string | null;
}

/** La fecha límite que corre hoy (null si ya no corre ninguna). */
export function fechaLimite(s: ConPlazos): string | null {
  if (s.estado === 'recibida' || s.estado === 'en_proceso') return s.venceRespuesta;
  if (s.estado === 'respondida') return s.venceEfectividad;
  return null;
}

export function urgenciaSolicitud(s: ConPlazos, ahora: Date = new Date()): UrgenciaArco {
  if (s.estado === 'atendida' || s.estado === 'rechazada') return 'cerrada';
  const limite = fechaLimite(s);
  const fin = limite ? new Date(limite).getTime() : Number.NaN;
  if (Number.isNaN(fin)) return 'en_plazo';
  const restante = fin - ahora.getTime();
  if (restante < 0) return 'vencida';
  return restante <= DIAS_POR_VENCER * MS_POR_DIA ? 'por_vencer' : 'en_plazo';
}

/** Texto, insignia y fondo de fila de cada urgencia (tokens de peligro y aviso del sistema). */
export const ESTILO_URGENCIA: Record<UrgenciaArco, { etiqueta: string; variante: 'danger' | 'warning' | 'default' | 'success'; fondo?: string }> = {
  vencida: { etiqueta: 'Vencida', variante: 'danger', fondo: 'color-mix(in srgb, var(--danger) 10%, transparent)' },
  por_vencer: { etiqueta: 'Vence pronto', variante: 'warning', fondo: 'color-mix(in srgb, var(--warning) 14%, transparent)' },
  en_plazo: { etiqueta: 'En plazo', variante: 'default' },
  cerrada: { etiqueta: 'Cerrada', variante: 'success' },
};

/** Insignia de texto de la columna "Vence": solo en vencidas y por vencer (el color no es la única señal). */
export function insigniaDeUrgencia(u: UrgenciaArco): { etiqueta: string; variante: 'danger' | 'warning' } | null {
  if (u === 'vencida') return { etiqueta: ESTILO_URGENCIA.vencida.etiqueta, variante: 'danger' };
  if (u === 'por_vencer') return { etiqueta: ESTILO_URGENCIA.por_vencer.etiqueta, variante: 'warning' };
  return null;
}

/** Filtro "Plazo" de la bandeja. */
export type FiltroPlazo = '' | 'vencidas' | 'sin_vencer';

/** Lo que se manda al backend en `vencidas` según el filtro "Plazo" (sin filtro, nada). */
export function vencidasDeFiltro(plazo: FiltroPlazo): boolean | undefined {
  if (plazo === 'vencidas') return true;
  if (plazo === 'sin_vencer') return false;
  return undefined;
}

export function validarRespuesta(estado: EstadoArcoRespuesta, respuesta: string): string | null {
  const t = respuesta.trim();
  if (exigeRespuesta(estado) && !t) return MENSAJE_FALTA_RESPUESTA;
  if (t.length > MAX_RESPUESTA_ARCO) return `La respuesta admite hasta ${MAX_RESPUESTA_ARCO} caracteres.`;
  return null;
}

/** Casillas de la bandeja para atender una revocación (sin premarcar). */
export const OPCIONES_REVOCACION_ARCO: { valor: ConsentimientoRevocableArco; etiqueta: string }[] = (
  ['promociones', 'datos_salud', 'fotos_resultado'] as const
).map((valor) => ({ valor, etiqueta: etiquetaConsentimiento(valor) }));

export const MENSAJE_FALTA_REVOCAR = 'Elige al menos un consentimiento para revocar antes de marcarla atendida.';

/**
 * Atender una revocación exige elegir qué se revoca (el backend lo pide en `revocar`). La oposición atendida
 * no pide nada: el backend aplica la oposición a promociones.
 */
export function exigeElegirRevocacion(tipo: TipoArco, estado: EstadoArcoRespuesta): boolean {
  return tipo === 'revocacion' && estado === 'atendida';
}

export function validarRevocacion(tipo: TipoArco, estado: EstadoArcoRespuesta, revocar: ConsentimientoRevocableArco[]): string | null {
  return exigeElegirRevocacion(tipo, estado) && revocar.length === 0 ? MENSAJE_FALTA_REVOCAR : null;
}

const ORDEN_ESTADOS: EstadoArcoRespuesta[] = ['en_proceso', 'respondida', 'atendida', 'rechazada'];

/** Estados a los que se puede mover. Una cancelación no se marca atendida a mano: se atiende al ejecutarla. */
export function estadosPosibles(s: { tipo: TipoArco; estado: EstadoArco }): EstadoArcoRespuesta[] {
  if (s.estado === 'atendida' || s.estado === 'rechazada') return [];
  return ORDEN_ESTADOS.filter((e) => e !== s.estado && !(s.tipo === 'cancelacion' && e === 'atendida'));
}

interface SolicitudParaAnonimizar {
  id: number;
  folio: string;
  usuario: { nombre: string } | null;
}

/**
 * Qué borra y qué conserva la cancelación, en tercera persona. La titular lee lo mismo en segunda persona
 * (QUE_PASA_AL_CANCELAR en components/privacidad/accionesPrivacidad.ts).
 */
export const QUE_PASA_AL_CANCELAR_PANEL =
  'Al ejecutar la cancelación se borran o anonimizan los datos de identificación y contacto de la titular, sus datos de salud y de su cabello, sus direcciones, sus tarjetas guardadas, las notas sobre la titular en pedidos, cotizaciones, ventas y seguimientos, y sus sesiones y avisos. Se conserva, ya sin su nombre, lo que la ley obliga a guardar (pedidos, pagos, facturas y ventas, por 5 años) y el historial de sus citas, quejas y valoraciones, junto con la constancia de sus consentimientos y de esta solicitud.';

export function MENSAJE_CONFIRMAR_ANONIMIZAR(s: SolicitudParaAnonimizar): string {
  const titular = s.usuario?.nombre || 'la titular';
  return (
    `Vas a anonimizar la cuenta de ${titular} (solicitud ${s.folio}). Esta acción es irreversible y la cuenta ` +
    `queda inactiva sin poder entrar. ${QUE_PASA_AL_CANCELAR_PANEL}`
  );
}

/**
 * Anonimizar solo después de confirmar. `confirmar` es showConfirm en la pantalla; si responde que no, no se
 * llama a `ejecutar` (POST /arco/solicitudes/:id/ejecutar-cancelacion).
 */
export async function confirmarYEjecutarCancelacion<R>(
  s: SolicitudParaAnonimizar,
  acciones: {
    confirmar: (mensaje: string, opciones: { title: string; confirmText: string; cancelText: string }) => Promise<boolean>;
    ejecutar: (id: number) => Promise<R>;
  },
): Promise<{ ejecutada: false } | { ejecutada: true; resultado: R }> {
  const confirmado = await acciones.confirmar(MENSAJE_CONFIRMAR_ANONIMIZAR(s), {
    title: 'Ejecutar cancelación',
    confirmText: 'Sí, anonimizar',
    cancelText: 'No, volver',
  });
  if (!confirmado) return { ejecutada: false };
  return { ejecutada: true, resultado: await acciones.ejecutar(s.id) };
}

export const AVISO_CORREO_RESPUESTA_NO_ENVIADO =
  'La respuesta quedó guardada, pero no pudimos enviar el correo a la titular. Avísale por otro medio.';
export const AVISO_CORREO_CANCELACION_NO_ENVIADO =
  'La cancelación quedó ejecutada, pero no pudimos enviarle la confirmación por correo a la titular. Avísale por otro medio.';

/**
 * Aviso para el panel cuando el backend dice que el correo a la titular no salió (`correoEnviado === false`).
 * true o sin el campo (por ejemplo, al pasar a en proceso no se manda correo) no avisan.
 */
export function avisoCorreoNoEnviado(correoEnviado: boolean | undefined, tipo: 'respuesta' | 'cancelacion'): string | null {
  if (correoEnviado !== false) return null;
  return tipo === 'respuesta' ? AVISO_CORREO_RESPUESTA_NO_ENVIADO : AVISO_CORREO_CANCELACION_NO_ENVIADO;
}
