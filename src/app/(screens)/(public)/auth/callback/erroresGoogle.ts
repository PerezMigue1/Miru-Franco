/** A dónde vuelve un acceso con Google que falló: Login muestra el aviso con ?error=google. */
export const RUTA_ERROR_GOOGLE = '/login?error=google';

const MENSAJE_GENERICO = 'Error en la autenticación. Por favor intenta de nuevo.';

const MENSAJES: Record<string, string> = {
  authentication_failed: 'No se pudo completar la autenticación',
  access_denied: 'Autorización cancelada',
  callback_config_error:
    'Error de configuración: La URL de callback no está correctamente configurada. Por favor, contacta al administrador.',
};

/** Mensaje para el ?error= del callback. Un valor desconocido no se muestra: cualquiera puede escribir la URL. */
export function mensajeErrorGoogle(error: string): string {
  return Object.hasOwn(MENSAJES, error) ? MENSAJES[error] : MENSAJE_GENERICO;
}
