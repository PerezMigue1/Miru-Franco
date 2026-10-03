import { describe, expect, it } from 'vitest';
import { MENSAJE_SIN_CONEXION, esErrorDeRed, mensajeDeError } from './errorRed';

describe('errores de red', () => {
  it.each(['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.'])(
    'el TypeError de fetch "%s" (Chrome, Safari, Firefox) muestra el mensaje sin conexión',
    (texto) => {
      expect(esErrorDeRed(new TypeError(texto))).toBe(true);
      expect(mensajeDeError(new TypeError(texto), 'otro')).toBe(MENSAJE_SIN_CONEXION);
    },
  );

  it('un error ya marcado por el apiClient cuenta como de red', () => {
    expect(esErrorDeRed(Object.assign(new Error('x'), { isNetworkError: true }))).toBe(true);
  });

  it('los demás errores conservan su mensaje (o el texto por defecto)', () => {
    expect(mensajeDeError(new Error('Tabla no válida'), 'otro')).toBe('Tabla no válida');
    expect(mensajeDeError(new TypeError("Cannot read properties of undefined (reading 'x')"), 'otro')).not.toBe(
      MENSAJE_SIN_CONEXION,
    );
    expect(mensajeDeError('cadena suelta', 'Error al exportar')).toBe('Error al exportar');
    expect(mensajeDeError(new DOMException('aborted', 'AbortError'), 'otro')).toBe('Solicitud cancelada.');
  });
});
