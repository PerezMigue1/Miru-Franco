import { afterEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn(async (_ruta: string, body: Record<string, unknown>) => ({
    data: { id: 1, folio: 'C-1', ...body, totalVentas: 0, efectivoEsperado: 0, diferencia: 0 },
  })),
}));
vi.mock('./client', () => ({ apiClient: { post } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { abrirCorte, resumenCorteTexto } from './pos';

describe('Corte de caja: la petición lleva lo que exige el backend', () => {
  afterEach(() => {
    vi.useRealTimers();
    post.mockClear();
  });

  it('manda la fecha de hoy en México (YYYY-MM-DD), el efectivo inicial y el final', async () => {
    // 3 oct, 23:30 en México = 4 oct 05:30 UTC: el día del corte es el 3, no el 4.
    vi.useFakeTimers({ now: new Date('2026-10-04T05:30:00.000Z') });

    await abrirCorte({ efectivoInicial: 500, efectivoFinal: 1250.5, notas: 'Turno tarde' });

    expect(post).toHaveBeenCalledTimes(1);
    const [ruta, cuerpo] = post.mock.calls[0];
    expect(ruta).toBe('/api/pos/cortes');
    expect(cuerpo).toEqual({ fecha: '2026-10-03', efectivoInicial: 500, efectivoFinal: 1250.5, notas: 'Turno tarde' });
  });

  it('devuelve los totales por método y la diferencia (Decimal llega como texto), con un resumen legible', async () => {
    post.mockResolvedValueOnce({
      data: { id: 9, efectivoInicial: '500', efectivoFinal: '790', totalVentas: '650', totalEfectivo: '300', totalTarjeta: '300', totalTransferencia: '50', diferencia: '-10' },
    } as never);
    const corte = await abrirCorte({ efectivoInicial: 500, efectivoFinal: 790 });
    expect(corte).toMatchObject({ totalEfectivo: 300, totalTarjeta: 300, totalTransferencia: 50, diferencia: -10 });
    expect(resumenCorteTexto(corte)).toBe('Corte registrado · Efectivo $300.00 · Tarjeta $300.00 · Transferencia $50.00 · Diferencia -$10.00');
  });
});
