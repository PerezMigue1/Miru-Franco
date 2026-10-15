import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Los 409 de ARCO llegan a la pantalla con el texto del backend (cliente real, fetch simulado): la cancelación
 * repetida (POST /arco/solicitudes) y la anonimización de una cuenta con pedidos, citas o devoluciones en curso
 * (POST /arco/solicitudes/:id/ejecutar-cancelacion). Las pantallas muestran ese texto con mensajeDeError.
 */
vi.stubGlobal('window', { location: { pathname: '/perfil', search: '', origin: 'http://localhost:3000', replace: vi.fn() } });
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
vi.mock('./config', () => ({
  getApiBaseUrl: () => 'http://api.test/api/auth',
  getBackendBaseUrl: () => 'http://api.test',
}));

let arco: typeof import('./arco');
let mensajeDeError: typeof import('../utils/errorRed').mensajeDeError;
beforeAll(async () => {
  arco = await import('./arco');
  ({ mensajeDeError } = await import('../utils/errorRed'));
});

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => fetchMock.mockReset());

const conflicto = (message: string) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, statusCode: 409, message }), { status: 409 }));

async function errorDe(promesa: Promise<unknown>): Promise<unknown> {
  try {
    await promesa;
  } catch (e) {
    return e;
  }
  throw new Error('La petición no falló');
}

describe('ARCO: los 409 del backend se muestran tal cual', () => {
  it('una segunda cancelación abierta: la titular ve el mensaje del backend', async () => {
    const texto = 'Ya tienes una solicitud de cancelación abierta (ARCO-2026-000007).';
    conflicto(texto);
    const e = await errorDe(arco.crearSolicitudArco({ tipo: 'cancelacion' }));
    expect(mensajeDeError(e, 'No pudimos enviar tu solicitud. Intenta de nuevo.')).toBe(texto);
  });

  it('anonimizar una cuenta con pedidos, citas o devoluciones en curso: la bandeja ve el detalle del backend', async () => {
    const texto = 'No se puede anonimizar: tiene 1 pedido y 2 citas en curso.';
    conflicto(texto);
    const e = await errorDe(arco.ejecutarCancelacionArco(7));
    expect(mensajeDeError(e, 'No se pudo ejecutar la cancelación. Intenta de nuevo.')).toBe(texto);
  });
});
