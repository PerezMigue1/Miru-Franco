import { describe, expect, it } from 'vitest';
import { mensajeUsuarioDesdeErrorApi } from './apiErrorMessage';
import { MENSAJE_ERROR_INTERNO, MENSAJE_SERVICIO_NO_DISPONIBLE } from './errorServidor';

const errorApi = (status: number, data: unknown, mensaje = 'x') =>
  Object.assign(new Error(mensaje), { status, data });

describe('mensajeUsuarioDesdeErrorApi', () => {
  it('un 5xx no filtra el texto técnico de data.message', () => {
    const err = errorApi(500, { message: 'relation "usuarios" does not exist', referencia: 'A1B2C3D4' });
    expect(mensajeUsuarioDesdeErrorApi(err)).toBe(`${MENSAJE_ERROR_INTERNO} (ref. A1B2C3D4)`);
  });

  it('un 503 muestra el texto de servicio no disponible', () => {
    const err = errorApi(503, { message: 'connect ECONNREFUSED 127.0.0.1:5432' });
    expect(mensajeUsuarioDesdeErrorApi(err)).toBe(MENSAJE_SERVICIO_NO_DISPONIBLE);
  });

  it('un 4xx conserva el mensaje del backend, como antes', () => {
    expect(mensajeUsuarioDesdeErrorApi(errorApi(409, { message: 'El correo ya está registrado' }))).toBe(
      'El correo ya está registrado',
    );
    expect(
      mensajeUsuarioDesdeErrorApi(errorApi(400, { message: 'Revisa los campos', errors: { nombre: 'requerido' } })),
    ).toBe('nombre: requerido');
  });
});
