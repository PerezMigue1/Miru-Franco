import { describe, expect, it } from 'vitest';
import { textoErrorRespuesta, textoErrorRed } from './database';

describe('textos de error del gestor de base de datos', () => {
  it('un 500 muestra el mensaje genérico del backend con su referencia, no texto técnico', () => {
    const cuerpo = {
      error: 'Error interno del servidor',
      message: 'Ocurrió un error interno. Intenta de nuevo en unos segundos.',
      referencia: 'A1B2C3D4',
    };
    expect(textoErrorRespuesta(500, cuerpo)).toBe(
      'Ocurrió un error interno. Intenta de nuevo en unos segundos. (ref. A1B2C3D4)',
    );
  });

  it('un 503 muestra el mensaje de servicio no disponible', () => {
    const cuerpo = {
      message: 'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.',
      referencia: 'FFEE0011',
    };
    expect(textoErrorRespuesta(503, cuerpo)).toBe(
      'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos. (ref. FFEE0011)',
    );
  });

  it('un 5xx sin cuerpo útil (p. ej. HTML de un proxy) cae al mensaje genérico', () => {
    expect(textoErrorRespuesta(502, {})).toBe('Ocurrió un error interno. Intenta de nuevo en unos segundos.');
  });

  it('un 4xx conserva el texto pensado para el usuario, como antes', () => {
    expect(textoErrorRespuesta(400, { error: 'Nombre de tabla no válido' })).toBe('Nombre de tabla no válido');
    expect(textoErrorRespuesta(404, {})).toBe('Error 404');
  });

  it('un fallo de red no muestra "Failed to fetch"', () => {
    expect(textoErrorRed(new TypeError('Failed to fetch'))).toBe(
      'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.',
    );
    expect(textoErrorRed(new DOMException('The operation was aborted.', 'AbortError'))).toBe('Solicitud cancelada.');
  });
});
