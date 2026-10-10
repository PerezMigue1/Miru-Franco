import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post, put } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<{ data: unknown }>>(async () => ({ data: [] })),
  post: vi.fn(async (_ruta: string, body: Record<string, unknown>) => ({ data: { id: 1, ...body } })),
  put: vi.fn(async (_ruta: string, body: Record<string, unknown>) => ({ data: { ...body } })),
}));
vi.mock('./client', () => ({ apiClient: { get, post, put, patch: vi.fn(), delete: vi.fn() } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { citasPorCobrar, citasPorCobrarPaginado, crearCitaSinCita, especialistasLibres, listarCitas, personalQueAtiende } from './citas';
import { crearVenta } from './pos';
import { guardarComisionServicio, obtenerReporteComisiones } from './comisiones';
import { crearDevolucion } from './ecommerce';

afterEach(() => {
  get.mockClear();
  post.mockClear();
  put.mockClear();
});

describe('Citas sin cita', () => {
  it('una cita de una persona sin cuenta muestra su nombre de invitada', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 3, clienteId: null, nombreInvitado: 'Ana López', telefonoInvitado: '7711234567', origen: 'sin_cita', especialistaId: 'e', servicioId: 5, fechaHoraInicio: '2026-10-04T17:00:00Z', fechaHoraFin: '2026-10-04T18:30:00Z', estado: 'pendiente', horaCheckOut: null }] });
    const { data } = await listarCitas();
    expect(data[0]).toMatchObject({ clienteId: null, clienteNombre: 'Ana López', telefonoInvitado: '7711234567', origen: 'sin_cita' });
  });

  it('registra el turno con POST /api/citas/sin-cita', async () => {
    await crearCitaSinCita({ nombre: 'Ana', telefono: '7711234567', servicioId: 5, especialistaId: 'e', iniciarAhora: true });
    expect(post.mock.calls[0][0]).toBe('/api/citas/sin-cita');
    expect(post.mock.calls[0][1]).toEqual({ nombre: 'Ana', telefono: '7711234567', servicioId: 5, especialistaId: 'e', iniciarAhora: true });
  });

  it('especialistas libres, personal y citas por cobrar usan sus endpoints', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 'e', nombre: 'Mildred' }] });
    expect(await especialistasLibres(5)).toEqual([{ id: 'e', nombre: 'Mildred', foto: null }]);
    expect(get.mock.calls[0][0]).toBe('/api/citas/especialistas-libres?servicioId=5');
    await personalQueAtiende();
    expect(get.mock.calls[1][0]).toBe('/api/citas/personal');
    await citasPorCobrar();
    expect(get.mock.calls[2][0]).toBe('/api/citas/por-cobrar');
  });

  it('citas por cobrar paginadas: sin parámetros la ruta no cambia y conserva el total', async () => {
    get.mockResolvedValueOnce({ success: true, count: 45, page: 1, limit: 20, totalPages: 3, data: [{ id: 4, estado: 'completada', horaCheckOut: '2026-10-04T18:00:00Z' }] } as never);
    const r = await citasPorCobrarPaginado();
    expect(get.mock.calls[0][0]).toBe('/api/citas/por-cobrar');
    expect(r).toMatchObject({ count: 45, page: 1, limit: 20, totalPages: 3 });
    expect(r.data.map((c) => c.id)).toEqual([4]);
  });

  it('citas por cobrar paginadas: manda page, limit y citaId', async () => {
    await citasPorCobrarPaginado({ page: 2, limit: 10 });
    expect(get.mock.calls[0][0]).toBe('/api/citas/por-cobrar?page=2&limit=10');
    await citasPorCobrarPaginado({ citaId: 40 });
    expect(get.mock.calls[1][0]).toBe('/api/citas/por-cobrar?citaId=40');
  });

  it('citas por cobrar paginadas: con respuesta vieja (arreglo) no truena', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });
    const r = await citasPorCobrarPaginado({ page: 1 });
    expect(r).toMatchObject({ count: 2, page: 1, totalPages: 1 });
  });
});

describe('Cobro en el punto de venta', () => {
  it('manda citaId, participantes, motivo del descuento y el desglose mixto; no manda precio', async () => {
    await crearVenta({
      items: [{ servicioId: 5, cantidad: 1, citaId: 40, participantes: ['aux-1'] }],
      metodoPago: 'mixto',
      pagos: { efectivo: 400, tarjeta: 500 },
      descuento: 0,
      motivoDescuento: undefined,
    });
    const cuerpo = post.mock.calls[0][1] as { items: Record<string, unknown>[]; pagos: unknown };
    expect(cuerpo.items[0]).toEqual({ servicioId: 5, cantidad: 1, citaId: 40, participantes: ['aux-1'] });
    expect(cuerpo.items[0].precioUnitario).toBeUndefined();
    expect(cuerpo.pagos).toEqual({ efectivo: 400, tarjeta: 500 });
  });
});

describe('Comisiones', () => {
  it('guarda el monto por servicio con PUT', async () => {
    await guardarComisionServicio(5, { monto: 100, activo: true });
    expect(put.mock.calls[0][0]).toBe('/api/comisiones/servicios/5');
    expect(put.mock.calls[0][1]).toEqual({ monto: 100, activo: true });
  });

  it('normaliza el reporte por persona', async () => {
    get.mockResolvedValueOnce({ data: { total: '200', personas: [{ usuarioId: 'aux-1', nombre: 'Auxiliar', totalComision: '200', servicios: 2, detalle: [{ folio: 'VL-1', servicio: 'Nanoplastia', comision: '100', fecha: '2026-10-04T18:00:00Z' }] }] } });
    const r = await obtenerReporteComisiones('2026-10-01', '2026-10-31');
    expect(get.mock.calls[0][0]).toBe('/api/reportes/comisiones?desde=2026-10-01&hasta=2026-10-31');
    expect(r.total).toBe(200);
    expect(r.personas[0]).toMatchObject({ usuarioId: 'aux-1', totalComision: 200, servicios: 2 });
    expect(r.personas[0].detalle[0].comision).toBe(100);
  });
});

describe('Solicitud de cambio o reembolso', () => {
  it('manda tipo, causa y sellado para aplicar la política', async () => {
    // El estado ya no se manda (B1): el backend siempre crea la solicitud como pendiente.
    await crearDevolucion({ pedidoId: 9, pedidoItemId: 3, tipo: 'cambio', causa: 'sellado_sin_abrir', sellado: true, motivo: 'Otro tono' });
    expect(post.mock.calls[0][1]).toMatchObject({ tipo: 'cambio', causa: 'sellado_sin_abrir', sellado: true });
    expect(post.mock.calls[0][1]).not.toHaveProperty('estado');
  });
});
