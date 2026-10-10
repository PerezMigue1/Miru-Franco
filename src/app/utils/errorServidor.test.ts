import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MENSAJE_ERROR_INTERNO,
  MENSAJE_SERVICIO_NO_DISPONIBLE,
  esErrorServidor,
  textoErrorServidor,
  textoRespuestaFallida,
} from './errorServidor';

describe('esErrorServidor', () => {
  it('cuenta todo el rango 500-599 y nada más', () => {
    expect([500, 501, 502, 503, 504, 599].every(esErrorServidor)).toBe(true);
    expect([undefined, 0, 400, 404, 409, 499, 600].some((s) => esErrorServidor(s))).toBe(false);
  });
});

describe('textoErrorServidor', () => {
  it('un 500 muestra el texto genérico del backend aunque el cuerpo traiga detalle técnico', () => {
    const cuerpo = { message: 'PrismaClientKnownRequestError: Invalid `prisma.usuario.findMany()`' };
    expect(textoErrorServidor(500, cuerpo)).toBe(MENSAJE_ERROR_INTERNO);
  });

  it('un 503 muestra el texto de servicio no disponible', () => {
    expect(textoErrorServidor(503, { message: 'Verificador caído: ECONNREFUSED 10.0.0.3' })).toBe(
      MENSAJE_SERVICIO_NO_DISPONIBLE,
    );
  });

  it('añade la referencia del backend para poder buscar el error en el log', () => {
    expect(textoErrorServidor(502, { referencia: 'A1B2C3D4' })).toBe(`${MENSAJE_ERROR_INTERNO} (ref. A1B2C3D4)`);
  });

  it('ignora una referencia que no parece un id (texto arbitrario)', () => {
    expect(textoErrorServidor(500, { referencia: '<html>error</html>' })).toBe(MENSAJE_ERROR_INTERNO);
    expect(textoErrorServidor(500, '<html>Bad Gateway</html>')).toBe(MENSAJE_ERROR_INTERNO);
  });
});

describe('textoRespuestaFallida (fetch directos)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('un 502 con HTML de proxy da el texto genérico y deja el cuerpo solo en la consola', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = '<html><body><h1>502 Bad Gateway</h1>nginx/1.25</body></html>';
    expect(textoRespuestaFallida(502, html, 'http://api.test/api/productos')).toBe(MENSAJE_ERROR_INTERNO);
    expect(consola).toHaveBeenCalledWith('[API 5xx]', 'http://api.test/api/productos', 502, html);
  });

  it('un 4xx conserva el texto del backend, o el cuerpo recortado si no es JSON', () => {
    expect(textoRespuestaFallida(400, JSON.stringify({ message: 'Marca no válida' }))).toBe('Marca no válida');
    expect(textoRespuestaFallida(404, JSON.stringify({ error: 'No encontrado' }))).toBe('No encontrado');
    expect(textoRespuestaFallida(404, '')).toBe('Error 404');
    expect(textoRespuestaFallida(400, 'x'.repeat(300))).toBe('x'.repeat(120));
  });
});
