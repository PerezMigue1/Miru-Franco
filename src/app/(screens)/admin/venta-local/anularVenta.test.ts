import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Entorno node: window y localStorage mínimos antes de importar el cliente real (fetch simulado).
vi.stubGlobal('window', {
  location: { pathname: '/operacion/punto-de-venta', search: '', origin: 'http://localhost:3000', replace: vi.fn() },
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
vi.mock('../../../services/config', () => ({
  getApiBaseUrl: () => 'http://api.test/api/auth',
  getBackendBaseUrl: () => 'http://api.test',
}));

let pos: typeof import('../../../services/pos');
let ventasDia: typeof import('./ventasDia');
beforeAll(async () => {
  pos = await import('../../../services/pos');
  ventasDia = await import('./ventasDia');
});

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const responder = (status: number, cuerpo: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }));

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  fetchMock.mockReset();
  vi.restoreAllMocks();
});

describe('Anular una venta cortada: lo que llega del backend', () => {
  it('la venta trae la cita que cobraba cada línea (de ahí sale el aviso de "vuelve a quedar por cobrar")', async () => {
    responder(200, {
      success: true,
      count: 1,
      data: [
        {
          id: 5,
          folio: 'VL-2026-000005',
          estado: 'pagada',
          metodoPago: 'efectivo',
          corteId: 3,
          total: '450.00',
          items: [
            { id: 1, servicioId: 2, citaId: 12, cantidad: 1, precioUnitario: '300.00', servicio: { nombre: 'Corte' } },
            { id: 2, presentacionId: 9, citaId: null, cantidad: 1, precioUnitario: '150.00' },
          ],
        },
      ],
    });
    const { data } = await pos.listarVentas();
    expect(data[0].items.map((i) => i.citaId)).toEqual([12, null]);
    expect(ventasDia.textoModalAnular(data[0])[1]).toBe(
      'Esta venta cobraba la cita #12: al anularla, esa cita vuelve a quedar por cobrar.',
    );
  });

  it('un 409 porque quien anula no opera la caja: el modal muestra ese mensaje tal cual', async () => {
    const texto = 'Para anular necesitas operar la caja: pide a quien hace el corte que registre la anulación.';
    responder(409, { success: false, statusCode: 409, error: 'Conflicto', message: texto });

    const error = await pos.anularVentaCortada(5, { motivoCancelacion: 'Cobro duplicado' }).then(
      () => null,
      (e: unknown) => e,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/pos/ventas/5/anular');
    expect(init?.method).toBe('PATCH');
    expect(ventasDia.mensajeErrorAccionVenta(error, 'anular')).toBe(texto);
  });
});
