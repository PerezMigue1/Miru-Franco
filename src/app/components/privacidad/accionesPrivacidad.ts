import { revocacion, type ConsentimientoRegistrado, type ItemConsentimiento, type TipoConsentimiento } from '../../services/consentimientos';
import type { SolicitudArco, TipoArco } from '../../services/arco';
import { fechaCortaEnMexico } from '../../utils/fechaSoloDia';

/** Reglas de las acciones de "Mis datos y privacidad" (perfil de cualquier rol). */

/** `formulario` con el que quedan registradas las revocaciones hechas desde el perfil. */
export const FORMULARIO_PRIVACIDAD = 'perfil_privacidad';
const RUTA_PERFIL = '/perfil';

/** Promociones no va aquí: tiene su propio control ("Recibir promociones", oposición inmediata). */
export const CONSENTIMIENTOS_REVOCABLES: { tipo: TipoConsentimiento; titulo: string; descripcion: string }[] = [
  {
    tipo: 'datos_salud',
    titulo: 'Datos de salud',
    descripcion: 'Tus alergias, para cuidarte en cada servicio. Si lo revocas, borramos las que tengas guardadas.',
  },
  {
    tipo: 'fotos_resultado',
    titulo: 'Fotos del resultado',
    descripcion: 'Publicar fotos de tu resultado en la galería y redes del salón.',
  },
];

export const AVISO_REVOCAR_SALUD =
  'Si revocas este consentimiento, borraremos las alergias que tengas guardadas en tu perfil y ya no podremos tomarlas en cuenta en tus servicios. Puedes volver a registrarlas después desde tu perfil.';

/**
 * Revocar desde el perfil: una fila nueva "revocado" (registrarConsentimientos con revocacion(tipo)). Los datos
 * de salud se confirman antes porque el backend borra las alergias.
 */
export async function revocarConsentimiento(
  tipo: TipoConsentimiento,
  acciones: {
    confirmar: (mensaje: string, opciones: { title: string; confirmText: string; cancelText: string }) => Promise<boolean>;
    registrar: (entrada: { items: ItemConsentimiento[]; formulario: string; rutaOrigen?: string }) => Promise<ConsentimientoRegistrado[]>;
  },
): Promise<'revocado' | 'cancelado'> {
  if (tipo === 'datos_salud') {
    const ok = await acciones.confirmar(AVISO_REVOCAR_SALUD, {
      title: 'Revocar datos de salud',
      confirmText: 'Sí, revocar y borrar',
      cancelText: 'No, conservarlos',
    });
    if (!ok) return 'cancelado';
  }
  await acciones.registrar({ items: [revocacion(tipo)], formulario: FORMULARIO_PRIVACIDAD, rutaOrigen: RUTA_PERFIL });
  return 'revocado';
}

/**
 * Qué borra y qué conserva la cancelación (POST /arco/solicitudes/:id/ejecutar-cancelacion en backend-miru). El
 * panel dice lo mismo en tercera persona (QUE_PASA_AL_CANCELAR_PANEL en admin/solicitudes-arco/solicitudesArco.ts).
 */
export const QUE_PASA_AL_CANCELAR =
  'Al ejecutar la cancelación borramos o anonimizamos tus datos de identificación y contacto, tus datos de salud y de tu cabello, tus direcciones, tus tarjetas guardadas, las notas sobre ti en pedidos, cotizaciones, ventas y seguimientos, y tus sesiones y avisos. Conservamos, ya sin tu nombre, lo que la ley nos obliga a guardar (pedidos, pagos, facturas y ventas, por 5 años) y el historial de tus citas, quejas y valoraciones, junto con la constancia de tus consentimientos y de tu solicitud.';

export const MENSAJE_CASILLA_CANCELACION = 'Marca la casilla para confirmar que entiendes lo que pasa con tu cuenta.';
const MAX_DESCRIPCION = 2000;

export function validarSolicitud(tipo: TipoArco, entrada: { descripcion: string; entendido: boolean }): string | null {
  const descripcion = entrada.descripcion.trim();
  if (descripcion.length > MAX_DESCRIPCION) return `La descripción admite hasta ${MAX_DESCRIPCION} caracteres.`;
  if (tipo === 'cancelacion' && !entrada.entendido) return MENSAJE_CASILLA_CANCELACION;
  if (tipo === 'rectificacion' && !descripcion) return 'Cuéntanos qué dato está mal y cuál es el correcto.';
  return null;
}

/** Cómo queda el modal de rectificación o cancelación al abrirlo: vacío, sin errores y con la casilla sin marcar. */
export function estadoInicialModal(tipo: 'rectificacion' | 'cancelacion') {
  return {
    modal: tipo,
    descripcion: '',
    entendido: false,
    errorDescripcion: null as string | null,
    errorCasilla: null as string | null,
    errorEnvio: null as string | null,
  };
}

/**
 * El plazo que corre en una solicitud de la titular (los calcula el backend en días hábiles): abierta, el de
 * respuesta; respondida, el de efectividad. Cerrada, ninguno.
 */
export function textoPlazoSolicitud(s: Pick<SolicitudArco, 'estado' | 'venceRespuesta' | 'venceEfectividad'>): string | null {
  if (s.estado === 'recibida' || s.estado === 'en_proceso') {
    const fecha = fechaCortaEnMexico(s.venceRespuesta);
    return fecha
      ? `Te responderemos a más tardar el ${fecha} (20 días hábiles desde que la recibimos)`
      : 'Te responderemos dentro de 20 días hábiles desde que la recibimos';
  }
  if (s.estado === 'respondida') {
    const fecha = fechaCortaEnMexico(s.venceEfectividad);
    return fecha ? `La haremos efectiva a más tardar el ${fecha} (15 días hábiles desde nuestra respuesta)` : null;
  }
  return null;
}

/** Una solicitud de ese tipo que todavía no se cierra (para no abrir otra igual). */
export function solicitudAbiertaDe(solicitudes: SolicitudArco[], tipo: TipoArco): SolicitudArco | undefined {
  return solicitudes.find((s) => s.tipo === tipo && s.estado !== 'atendida' && s.estado !== 'rechazada');
}
