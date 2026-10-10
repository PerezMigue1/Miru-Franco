import { afterEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn(async (_ruta: string, body: Record<string, unknown>) => ({
    data: { id: 1, folio: 'C-1', ...body, totalVentas: 0, efectivoEsperado: 0, diferencia: 0 },
  })),
}));
vi.mock('./client', () => ({ apiClient: { post } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { abrirCorte, crearVenta, desgloseEfectivoCorte, resumenCorteTexto } from './pos';

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

describe('Estados de venta local: solo pendiente, pagada y cancelada', () => {
  it('el corte no inventa un estado: la tabla cortes_caja no tiene esa columna', async () => {
    post.mockResolvedValueOnce({ data: { id: 3, efectivoInicial: '0', totalVentas: '0' } } as never);
    const corte = await abrirCorte({ efectivoInicial: 0, efectivoFinal: 0 });
    expect(corte).not.toHaveProperty('estado');
  });

  it.each(['pendiente', 'pagada', 'cancelada'])('una venta en %s conserva su estado', async (estado) => {
    post.mockResolvedValueOnce({ data: { id: 5, estado, items: [] } } as never);
    expect((await crearVenta({ items: [], metodoPago: 'efectivo' } as never)).estado).toBe(estado);
  });

  it("un estado que no existe en el enum ('abierta') nunca se muestra: cae en 'pendiente'", async () => {
    post.mockResolvedValueOnce({ data: { id: 6, estado: 'abierta', items: [] } } as never);
    expect((await crearVenta({ items: [], metodoPago: 'efectivo' } as never)).estado).toBe('pendiente');
  });
});

describe('Corte de caja con salidas de efectivo (reembolsos)', () => {
  const conSalida = {
    data: {
      id: 12, efectivoInicial: '700', efectivoFinal: '500', totalVentas: '0', totalEfectivo: '0', totalTarjeta: '0',
      totalTransferencia: '0', totalSalidas: '200', diferencia: '0',
      movimientos: [
        { id: 1, concepto: 'reembolso_anticipo', monto: '200', motivo: 'Reembolso del anticipo de la cita 7', pagoId: 3, devolucionId: null, pago: { citaId: 7, pedidoId: null }, creadoEn: '2026-10-04T18:00:00.000Z' },
        { id: 2, concepto: 'reembolso_devolucion', monto: '50', motivo: null, pagoId: null, devolucionId: 4, devolucion: { pedidoId: 30 } },
      ],
    },
  };

  it('normaliza el total de salidas y la lista con su concepto y referencia', async () => {
    post.mockResolvedValueOnce(conSalida as never);
    const corte = await abrirCorte({ efectivoInicial: 700, efectivoFinal: 500 });
    expect(corte.totalSalidas).toBe(200);
    expect(corte.salidas).toEqual([
      { id: 1, concepto: 'Reembolso de anticipo', monto: 200, motivo: 'Reembolso del anticipo de la cita 7', referencia: 'Cita #7', creadoEn: '2026-10-04T18:00:00.000Z' },
      { id: 2, concepto: 'Reembolso de devolución', monto: 50, motivo: null, referencia: 'Devolución #4 (pedido #30)', creadoEn: undefined },
    ]);
  });

  it('el resumen menciona las salidas solo cuando las hay', async () => {
    post.mockResolvedValueOnce(conSalida as never);
    const corte = await abrirCorte({ efectivoInicial: 700, efectivoFinal: 500 });
    expect(resumenCorteTexto(corte)).toBe('Corte registrado · Efectivo $0.00 · Tarjeta $0.00 · Transferencia $0.00 · Salidas $200.00 · Diferencia $0.00');
  });

  it('el desglose muestra la fórmula: esperado = inicial + efectivo cobrado − salidas', async () => {
    post.mockResolvedValueOnce({ data: { ...conSalida.data, totalEfectivo: '300', efectivoFinal: '800' } } as never);
    const corte = await abrirCorte({ efectivoInicial: 700, efectivoFinal: 800 });
    expect(desgloseEfectivoCorte(corte)).toEqual([
      { etiqueta: 'Efectivo inicial', valor: '$700.00' },
      { etiqueta: 'Efectivo cobrado', valor: '$300.00' },
      { etiqueta: 'Salidas de efectivo', valor: '-$200.00' },
      { etiqueta: 'Efectivo esperado', valor: '$800.00' },
      { etiqueta: 'Efectivo contado', valor: '$800.00' },
      { etiqueta: 'Diferencia', valor: '$0.00' },
    ]);
  });
});
