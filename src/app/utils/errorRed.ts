import { esErrorServidor, textoErrorServidor } from './errorServidor';

/** Lo que ve el usuario cuando un fetch no llega al servidor (sin red, servidor caído, CORS). */
export const MENSAJE_SIN_CONEXION = 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';

/**
 * true si el error es un fallo de red de fetch: el navegador lanza TypeError con un texto propio
 * ("Failed to fetch" en Chrome, "Load failed" en Safari, "NetworkError…" en Firefox), o el
 * apiClient ya lo marcó con `isNetworkError`.
 */
export function esErrorDeRed(e: unknown): boolean {
  if (e && typeof e === 'object' && (e as { isNetworkError?: unknown }).isNetworkError === true) return true;
  return (
    e instanceof TypeError &&
    /failed to fetch|load failed|networkerror|network request failed/i.test(e.message)
  );
}

/**
 * Texto para mostrar de un error atrapado: sin el texto técnico del navegador cuando falla la red
 * ni el cuerpo crudo del servidor en un 5xx.
 */
export function mensajeDeError(e: unknown, porDefecto: string): string {
  if (e instanceof DOMException && e.name === 'AbortError') return 'Solicitud cancelada.';
  if (esErrorDeRed(e)) return MENSAJE_SIN_CONEXION;
  const conStatus = e as { status?: unknown; data?: unknown } | null;
  if (conStatus && esErrorServidor(conStatus.status)) {
    return textoErrorServidor(conStatus.status as number, conStatus.data);
  }
  return e instanceof Error && e.message ? e.message : porDefecto;
}
