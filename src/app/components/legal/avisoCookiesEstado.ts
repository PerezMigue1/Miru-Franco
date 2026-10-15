import { documentoLegal } from '../../utils/documentosLegales';

/**
 * Aviso de cookies INFORMATIVO: según el inventario real del sitio solo hay cookies y almacenamiento
 * necesarios (sesión, carrito, tema), así que no hay nada que aceptar ni rechazar. Si algún día se agrega
 * analítica o publicidad, el aviso pasa a Aceptar, Rechazar y Configurar y la decisión va a consentimientos.
 */
export const TEXTO_AVISO_COOKIES =
  'Usamos solo cookies y almacenamiento necesarios para tu sesión, tu carrito y tus preferencias. No usamos cookies de publicidad ni analítica.';

/** Guarda la versión de la Política de cookies que se informó: si la política cambia, se vuelve a mostrar. */
export const CLAVE_AVISO_COOKIES = 'mf-aviso-cookies';

/** Sin localStorage (modo privado, bloqueado): "Entendido" lo oculta al menos durante esta carga. */
let ocultoEnEstaCarga = false;

export function avisoCookiesVisto(): boolean {
  if (ocultoEnEstaCarga) return true;
  try {
    return localStorage.getItem(CLAVE_AVISO_COOKIES) === documentoLegal('cookies').version;
  } catch {
    return false;
  }
}

export function marcarAvisoCookiesVisto(): void {
  ocultoEnEstaCarga = true;
  try {
    localStorage.setItem(CLAVE_AVISO_COOKIES, documentoLegal('cookies').version);
  } catch {
    /* sin almacenamiento: queda oculto solo en esta carga */
  }
}

/** Solo para pruebas: vuelve al estado de una carga nueva. */
export function reiniciarAvisoCookiesEnMemoria(): void {
  ocultoEnEstaCarga = false;
}
