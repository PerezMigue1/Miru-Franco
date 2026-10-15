import { aceptacionDeDocumento, registrarConsentimientos } from '../../services/consentimientos';
import { documentoLegal } from '../../utils/documentosLegales';
import { mensajeUsuarioDesdeErrorApi } from '../../utils/apiErrorMessage';

/**
 * Casilla de la Política de anticipos y cancelación: obligatoria antes de pagar el anticipo en línea o de
 * apartar para pagarlo en el salón (crear cita y detalle de la cita). El texto resume la sección 7 de
 * /politica-de-reembolsos y cuenta los días hábiles desde el pago del anticipo, igual que el backend
 * (politicaCancelacionAnticipo en anticipos.util.ts usa la fecha de pago).
 */
export const ENLACE_POLITICA_ANTICIPOS = documentoLegal('anticipos').ruta;

export const TEXTO_POLITICA_ANTICIPOS =
  'Si al pagar tu anticipo faltan más de 10 días hábiles para tu cita, puedes cancelarla dentro de los 5 días hábiles siguientes a tu pago y te devolvemos el anticipo completo. Si faltan 10 días hábiles o menos, al cancelar el anticipo no se devuelve, pero puedes reagendar con aviso; si el salón cancela, te lo devolvemos.';

export const MENSAJE_FALTA_ANTICIPOS = 'Para continuar marca que leíste la Política de anticipos y cancelación.';

/** Registra la aceptación (tipo anticipos, formulario anticipo-cita) y solo entonces ejecuta la acción. */
export async function conAceptacionDeAnticipos<T>(rutaOrigen: string, accion: () => Promise<T>): Promise<T> {
  try {
    await registrarConsentimientos({ items: [aceptacionDeDocumento('anticipos')], formulario: 'anticipo-cita', rutaOrigen });
  } catch (e) {
    throw new Error(
      `No pudimos guardar tu aceptación de la Política de anticipos y cancelación, así que no continuamos. ${mensajeUsuarioDesdeErrorApi(e)}`,
    );
  }
  return accion();
}
