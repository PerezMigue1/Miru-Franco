/**
 * Teléfono para registro: solo México, 10 dígitos nacionales.
 * El prefijo +52 es implícito; si se escribe o se pega, se quita (12 dígitos con 52 o 13 con 521).
 * Nunca se recortan dígitos: si no quedan 10 válidos, la validación lo marca.
 */

const LARGO_TELEFONO_CON_52 = 12;
const LARGO_TELEFONO_CON_521 = 13;

/**
 * Caracteres que acepta el campo: el navegador corta lo pegado a maxLength antes del onChange, así
 * que cabe un "+52 1 (771) 123-4567" con formato; los dígitos los limita telefonoEscrito.
 */
export const MAX_CARACTERES_CAMPO_TELEFONO = 25;

/** Solo dígitos */
export function soloDigitosTelefono(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Teléfono sin la lada de México: si quedan 12 dígitos que empiezan con 52 o 13 que empiezan con
 * 521, se quita esa lada. No corta: si sobran dígitos, la validación lo marca.
 */
export function telefonoSinLada(value: string): string {
  const digitos = soloDigitosTelefono(value);
  if (digitos.length === LARGO_TELEFONO_CON_52 && digitos.startsWith('52')) {
    return digitos.slice(2);
  }
  if (digitos.length === LARGO_TELEFONO_CON_521 && digitos.startsWith('521')) {
    return digitos.slice(3);
  }
  return digitos;
}

/** Teléfono pegado o autocompletado: solo dígitos y sin lada. Nunca se recorta. */
export function telefonoPegado(value: string): string {
  return telefonoSinLada(value);
}

/**
 * Teléfono escrito tecla por tecla: solo dígitos, hasta 13 (10 más la lada 521) para que un "52"
 * escrito a mano no se corte a un número equivocado; la lada se quita al salir del campo.
 */
export function telefonoEscrito(value: string): string {
  return soloDigitosTelefono(value).slice(0, LARGO_TELEFONO_CON_521);
}

/** Valor del campo tras un cambio: varios dígitos de golpe es pegar o autocompletar. */
export function telefonoEnCampo(anterior: string, nuevo: string): string {
  const pegado = soloDigitosTelefono(nuevo).length - soloDigitosTelefono(anterior).length > 1;
  return pegado ? telefonoPegado(nuevo) : telefonoEscrito(nuevo);
}

/**
 * true si, sin la lada, quedan exactamente 10 dígitos y el primero es de 2 a 9.
 */
export function esTelefonoMexicoValido(value: string): boolean {
  return /^[2-9]\d{9}$/.test(telefonoSinLada(value));
}

/** Texto de ayuda bajo el campo */
export const MENSAJE_FORMATO_TELEFONO =
  '10 dígitos de tu número en México. No incluyas +52, espacios ni guiones.';

/** Mensaje de error de validación */
export function mensajeTelefonoInvalido(): string {
  return 'Ingresa exactamente 10 dígitos (número mexicano, sin +52).';
}

/** Valor a enviar al backend: los dígitos sin la lada */
export function normalizarTelefonoRegistro(value: string): string {
  return telefonoSinLada(value);
}
