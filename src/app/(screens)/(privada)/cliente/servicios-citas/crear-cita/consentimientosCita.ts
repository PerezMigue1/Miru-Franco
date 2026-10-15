import { registrarConsentimientos } from '../../../../../services/consentimientos';
import { conAceptacionDeAnticipos } from '../../../../../components/cliente/consentimientoAnticipo';
import { mensajeUsuarioDesdeErrorApi } from '../../../../../utils/apiErrorMessage';

const RUTA_CREAR_CITA = '/cliente/servicios-citas/crear-cita';

/** Casilla opcional y aparte: solo se registra si la clienta la marca. */
export const TEXTO_FOTOS_RESULTADO =
  'Autorizo que el salón tome fotos del resultado de mi servicio para mostrarlas en sus redes y galería (puedes retirar tu autorización cuando quieras desde tu perfil)';

async function registrarFotosResultado(): Promise<void> {
  try {
    await registrarConsentimientos({
      items: [{ tipo: 'fotos_resultado', accion: 'aceptado' }],
      formulario: 'crear-cita',
      rutaOrigen: RUTA_CREAR_CITA,
    });
  } catch (e) {
    throw new Error(
      `No pudimos guardar tu autorización de fotos, así que tu cita no se agendó. Intenta de nuevo o desmarca esa casilla para continuar. ${mensajeUsuarioDesdeErrorApi(e)}`,
    );
  }
}

/**
 * Anticipo que se anuncia y se pide al crear la cita. Con `anticipoAplica: false` (el backend no pide anticipo
 * hoy) es 0: sin aviso, sin casilla ni Mercado Pago, y la cita se crea sin anticipo. Sin el campo (backend
 * anterior) se usa el monto del servicio, como siempre.
 */
export function anticipoDelServicio(
  servicio: { anticipoMonto?: number | null; anticipoAplica?: boolean } | null | undefined,
): number {
  if (!servicio || servicio.anticipoAplica === false) return 0;
  return servicio.anticipoMonto ?? 0;
}

export const MENSAJE_SERVICIO_NO_CARGADO =
  'No pudimos cargar los datos del servicio, así que todavía no puedes confirmar tu cita. Revisa tu conexión y vuelve a intentarlo.';

/**
 * El servicio no cargó (getServicioPorId devolvió null): no se sabe si pide anticipo, así que no se puede
 * pedir la casilla de la Política de anticipos y el envío se bloquea hasta reintentar.
 */
export function servicioSinCargar({
  servicioId,
  servicio,
  cargando,
}: {
  servicioId: string | null;
  servicio: unknown;
  cargando: boolean;
}): boolean {
  return Boolean(servicioId) && !cargando && servicio == null;
}

/**
 * Qué sigue después de crear la cita. Mercado Pago solo se abre si la clienta paga en línea, la cita pide
 * anticipo y la casilla de anticipos se registró antes de crearla. Si la cita pide un anticipo que la pantalla
 * no conocía (por ejemplo, el admin lo puso después de cargar la página), va a la confirmación, donde
 * EncabezadoAnticipo pide la casilla antes de pagar.
 */
export function destinoTrasCrearCita({
  anticipoRequerido,
  anticiposRegistrados,
  pagarEnSalon,
}: {
  anticipoRequerido: number | null | undefined;
  anticiposRegistrados: boolean;
  pagarEnSalon: boolean;
}): 'mercado_pago' | 'confirmacion' {
  return (anticipoRequerido ?? 0) > 0 && anticiposRegistrados && !pagarEnSalon ? 'mercado_pago' : 'confirmacion';
}

/**
 * Registra las casillas marcadas y solo entonces crea la cita: con anticipo, la Política de anticipos (antes
 * de apartar o de pagar en línea); si la marcó, la autorización de fotos. Si un registro falla, no se crea.
 */
export async function crearCitaConConsentimientos<T>(
  { requiereAnticipo, autorizaFotos }: { requiereAnticipo: boolean; autorizaFotos: boolean },
  crear: () => Promise<T>,
): Promise<T> {
  const continuar = async () => {
    if (autorizaFotos) await registrarFotosResultado();
    return crear();
  };
  return requiereAnticipo ? conAceptacionDeAnticipos(RUTA_CREAR_CITA, continuar) : continuar();
}
