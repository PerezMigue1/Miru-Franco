import {
  aceptacionDeDocumento,
  registrarConsentimientos,
  type ItemConsentimiento,
} from '../../../../../services/consentimientos';
import { documentoLegal } from '../../../../../utils/documentosLegales';
import { mensajeUsuarioDesdeErrorApi } from '../../../../../utils/apiErrorMessage';

/**
 * Casillas legales del checkout: Términos de venta y Política de reembolsos. Las dos son obligatorias, empiezan
 * sin marcar y se registran (POST /api/consentimientos) antes de crear el pedido.
 */
export type IdCasillaCompra = 'terminosVenta' | 'reembolsos';
export type EstadoCasillasCompra = Record<IdCasillaCompra, boolean>;

export const RUTA_CHECKOUT = '/cliente/tienda-online/checkout';

export const CASILLAS_COMPRA_INICIALES: EstadoCasillasCompra = { terminosVenta: false, reembolsos: false };

/** Texto de cada casilla: `antes` + enlace al documento + `despues`. */
export const CASILLAS_COMPRA: readonly {
  id: IdCasillaCompra;
  antes: string;
  textoEnlace: string;
  enlace: string;
  despues: string;
  error: string;
}[] = [
  {
    id: 'terminosVenta',
    antes: 'Acepto los ',
    textoEnlace: 'Términos de venta',
    enlace: `${documentoLegal('terminos').ruta}#compras-en-linea`,
    despues: '',
    error: 'Para confirmar tu pedido acepta los Términos de venta.',
  },
  {
    id: 'reembolsos',
    antes: 'Leí la ',
    textoEnlace: 'Política de reembolsos, cambios y cancelaciones',
    enlace: documentoLegal('reembolsos').ruta,
    despues: ', incluido mi derecho a revocar la compra en 5 días hábiles',
    error: 'Para confirmar tu pedido marca que leíste la Política de reembolsos, cambios y cancelaciones.',
  },
];

/** Mensaje de cada casilla obligatoria sin marcar (vacío: se puede confirmar). */
export function erroresCasillasCompra(estado: EstadoCasillasCompra): Partial<Record<IdCasillaCompra, string>> {
  const errores: Partial<Record<IdCasillaCompra, string>> = {};
  for (const casilla of CASILLAS_COMPRA) {
    if (!estado[casilla.id]) errores[casilla.id] = casilla.error;
  }
  return errores;
}

/** terminos_venta no tiene documento propio en el registro: se liga a los Términos (sección de compras). */
export function itemsConsentimientoCompra(): ItemConsentimiento[] {
  const terminos = aceptacionDeDocumento('terminos');
  return [{ ...terminos, tipo: 'terminos_venta' }, aceptacionDeDocumento('reembolsos')];
}

/**
 * Candado contra el doble envío: si ya hay una compra en curso (`candado.current`), no hace nada; si no,
 * lo cierra, corre `compra` y lo abre al terminar, salga bien o mal. Va con un useRef porque el estado de
 * React no se actualiza a tiempo entre dos clics seguidos.
 */
export async function conCandado(candado: { current: boolean }, compra: () => Promise<void>): Promise<void> {
  if (candado.current) return;
  candado.current = true;
  try {
    await compra();
  } finally {
    candado.current = false;
  }
}

/** Registra las dos aceptaciones y solo entonces crea el pedido: si el registro falla, el pedido no se crea. */
export async function crearPedidoConConsentimientos<T>(crear: () => Promise<T>): Promise<T> {
  try {
    await registrarConsentimientos({ items: itemsConsentimientoCompra(), formulario: 'checkout', rutaOrigen: RUTA_CHECKOUT });
  } catch (e) {
    throw new Error(
      `No pudimos guardar tu aceptación de los Términos de venta y la Política de reembolsos, así que tu pedido no se creó. ${mensajeUsuarioDesdeErrorApi(e)}`,
    );
  }
  return crear();
}
