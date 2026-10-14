/**
 * Contrato de POST /api/oauth/code (Account Linking de Alexa):
 * - cuerpo: { redirect_uri, state, client_id? } con lo que llegó en la URL de /oauth/alexa;
 * - el backend valida redirect_uri (y client_id) contra su lista y responde
 *   { success, code, redirectUri } con el destino ya validado, o 400 si no está autorizado.
 * La página solo redirige a esa redirectUri, nunca a la redirect_uri de su propia URL.
 */
export interface RespuestaCodigoOauth {
  success?: boolean;
  code?: string;
  redirectUri?: string;
}

export interface CuerpoSolicitudCodigo {
  redirect_uri: string;
  state: string;
  client_id?: string;
}

export const MENSAJE_ENLACE_NO_VALIDO =
  'Este enlace de vinculación no es válido. Vuelve a iniciar la vinculación desde la app de Alexa.';

export function cuerpoSolicitudCodigo(redirectUri: string, state: string, clientId?: string | null): CuerpoSolicitudCodigo {
  return clientId ? { redirect_uri: redirectUri, state, client_id: clientId } : { redirect_uri: redirectUri, state };
}

/** URL final (redirectUri del backend + code + state) o null si la respuesta no la trae o no es http(s). */
export function destinoVinculacion(respuesta: RespuestaCodigoOauth, state: string): string | null {
  if (!respuesta.success || !respuesta.code || !respuesta.redirectUri) return null;
  let url: URL;
  try {
    url = new URL(respuesta.redirectUri);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  url.searchParams.set('code', respuesta.code);
  url.searchParams.set('state', state);
  return url.toString();
}

export function mensajeErrorVinculacion(err: unknown): string {
  if ((err as { status?: number } | null)?.status === 400) return MENSAJE_ENLACE_NO_VALIDO;
  return err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
}
