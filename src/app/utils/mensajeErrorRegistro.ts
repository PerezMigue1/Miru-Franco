/** Mensaje para el usuario cuando falla POST /api/usuarios/registro. */

const INDICACION_CORREO_DUPLICADO = 'Inicia sesión o recupera tu contraseña.';

/**
 * El correo duplicado llega como 409 al enviar el registro (la verificación previa ya no revela si
 * un correo tiene cuenta): se usa el mensaje del backend y se agrega qué hacer.
 */
export function mensajeErrorRegistro(error: unknown): string {
  const msg = error instanceof Error && error.message ? error.message : 'Error al crear la cuenta';
  const lower = msg.toLowerCase();
  if (lower.includes('faltan campos') || lower.includes('campos obligatorios')) {
    return 'Por favor, verifica que todos los campos obligatorios estén completos.';
  }
  if (/ya est[aá] registrad/.test(lower) && !msg.includes(INDICACION_CORREO_DUPLICADO)) {
    return `${msg.trim().replace(/\.?$/, '.')} ${INDICACION_CORREO_DUPLICADO}`;
  }
  return msg;
}
