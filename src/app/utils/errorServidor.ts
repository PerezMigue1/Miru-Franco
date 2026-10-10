/**
 * Errores 5xx: el usuario ve un texto genérico, nunca el cuerpo crudo del servidor (puede ser
 * HTML de un proxy, una traza o SQL). El detalle va solo a console.error.
 * Los textos son los mismos que manda el filtro global del backend
 * (backend-miru src/common/filters/http-exception.filter.ts).
 */
export const MENSAJE_ERROR_INTERNO = 'Ocurrió un error interno. Intenta de nuevo en unos segundos.';
export const MENSAJE_SERVICIO_NO_DISPONIBLE =
  'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.';

/** true si el status es de error del servidor (500-599). */
export function esErrorServidor(status: unknown): boolean {
  return typeof status === 'number' && status >= 500 && status <= 599;
}

/** Referencia corta del backend (id hexadecimal); cualquier otra cosa se descarta. */
export function referenciaDe(cuerpo: unknown): string | undefined {
  if (!cuerpo || typeof cuerpo !== 'object') return undefined;
  const ref = (cuerpo as { referencia?: unknown }).referencia;
  return typeof ref === 'string' && /^[A-Za-z0-9-]{1,32}$/.test(ref) ? ref : undefined;
}

/** Texto para el usuario ante un 5xx; añade "(ref. X)" si el backend mandó una referencia. */
export function textoErrorServidor(status: number, cuerpo?: unknown): string {
  const mensaje = status === 503 ? MENSAJE_SERVICIO_NO_DISPONIBLE : MENSAJE_ERROR_INTERNO;
  const referencia = referenciaDe(cuerpo);
  return referencia ? `${mensaje} (ref. ${referencia})` : mensaje;
}

/**
 * Texto para el usuario de una respuesta fallida leída con fetch directo (sin apiClient).
 * 5xx: texto genérico y el cuerpo solo en la consola. 4xx: el mensaje del backend, como antes.
 */
export function textoRespuestaFallida(status: number, texto: string, url?: string): string {
  let cuerpo: unknown = undefined;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    // No es JSON (HTML de un proxy, texto plano)
  }
  if (esErrorServidor(status)) {
    console.error('[API 5xx]', url, status, texto);
    return textoErrorServidor(status, cuerpo);
  }
  if (cuerpo && typeof cuerpo === 'object') {
    const j = cuerpo as { message?: unknown; error?: unknown };
    const m = j.message ?? j.error;
    if (typeof m === 'string' && m.trim()) return m;
    return `Error ${status}`;
  }
  return texto ? texto.slice(0, 120) : `Error ${status}`;
}
