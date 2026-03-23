/**
 * Teléfono para registro: solo México, 10 dígitos nacionales.
 * El prefijo +52 es implícito; el usuario no lo escribe en el campo.
 */

/** Solo dígitos */
export function soloDigitosTelefono(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Entrada del campo: solo dígitos, máximo 10 (evita +52, letras, etc.).
 */
export function sanitizarEntradaTelefono10(value: string): string {
  return soloDigitosTelefono(value).slice(0, 10);
}

/**
 * true si son exactamente 10 dígitos y el primero no es 0.
 */
export function esTelefonoMexicoValido(value: string): boolean {
  const d = soloDigitosTelefono(value);
  return d.length === 10 && /^[1-9]\d{9}$/.test(d);
}

/** Texto de ayuda bajo el campo */
export const MENSAJE_FORMATO_TELEFONO =
  '10 dígitos de tu número en México. No incluyas +52, espacios ni guiones.';

/** Mensaje de error de validación */
export function mensajeTelefonoInvalido(): string {
  return 'Ingresa exactamente 10 dígitos (número mexicano, sin +52).';
}

/** Valor a enviar al backend: solo los 10 dígitos */
export function normalizarTelefonoRegistro(value: string): string {
  return sanitizarEntradaTelefono10(value);
}
