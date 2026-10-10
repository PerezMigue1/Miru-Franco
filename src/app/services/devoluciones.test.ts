import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(async () => ({ data: [] })),
  post: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async (_ruta, body) => ({ data: { id: 1, ...(body as object) } })),
}));
vi.mock('./client', () => ({ apiClient: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import * as ecommerce from './ecommerce';
import {
  aprobarDevolucion,
  cancelarDevolucion,
  crearDevolucion,
  listarDevolucionesDelCliente,
  listarDevolucionesPaginado,
  rechazarDevolucion,
} from './ecommerce';

afterEach(() => { get.mockClear(); post.mockClear(); });

/**
 * Devoluciones: la clienta pide cambio o reembolso con tipo y causa (el estado y el monto los decide el
 * backend); el personal con devoluciones:gestionar aprueba o rechaza.
 */
describe('Solicitud de cambio o reembolso', () => {
  it('manda tipo, causa y sellado, sin estado ni monto', async () => {
    await crearDevolucion({ pedidoId: 9, pedidoItemId: 3, tipo: 'cambio', causa: 'sellado_sin_abrir', sellado: true, motivo: 'Otro tono' });
    const cuerpo = post.mock.calls[0][1] as Record<string, unknown>;
    expect(cuerpo).toMatchObject({ tipo: 'cambio', causa: 'sellado_sin_abrir', sellado: true });
    expect(cuerpo).not.toHaveProperty('estado');
    expect(cuerpo).not.toHaveProperty('monto');
  });

  it('aunque alguien cuele estado o monto, no se envían', async () => {
    await crearDevolucion({ pedidoId: 9, tipo: 'reembolso', causa: 'sin_existencias', estado: 'aprobada', monto: 999 } as never);
    const cuerpo = post.mock.calls[0][1] as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty('estado');
    expect(cuerpo).not.toHaveProperty('monto');
  });

  it('desde el portal pide propios=true', async () => {
    await crearDevolucion({ pedidoId: 9, tipo: 'cambio', causa: 'sellado_sin_abrir', sellado: true }, { propios: true });
    expect(post.mock.calls[0][0]).toBe('/api/devoluciones?propios=true');
  });
});

describe('Rutas de resolución', () => {
  it('cancelar, aprobar y rechazar usan sus POST', async () => {
    await cancelarDevolucion(5);
    expect(post.mock.calls[0][0]).toBe('/api/devoluciones/5/cancelar');
    await aprobarDevolucion(5, { metodoReembolso: 'efectivo', nota: 'Defecto confirmado' });
    expect(post.mock.calls[1][0]).toBe('/api/devoluciones/5/aprobar');
    expect(post.mock.calls[1][1]).toEqual({ metodoReembolso: 'efectivo', nota: 'Defecto confirmado' });
    await rechazarDevolucion(5, { nota: 'Producto abierto' });
    expect(post.mock.calls[2][0]).toBe('/api/devoluciones/5/rechazar');
    expect(post.mock.calls[2][1]).toEqual({ nota: 'Producto abierto' });
  });

  it('ya no hay edición libre ni borrado desde la web', () => {
    expect((ecommerce as Record<string, unknown>).actualizarDevolucion).toBeUndefined();
    expect((ecommerce as Record<string, unknown>).eliminarDevolucion).toBeUndefined();
  });
});

describe('Listas', () => {
  it('el panel pide una página con page, limit y estado, y conserva la paginación', async () => {
    get.mockResolvedValueOnce({
      success: true,
      count: 45,
      page: 2,
      limit: 20,
      totalPages: 3,
      data: [{ id: 7, pedidoId: 9, estado: 'pendiente', tipo: 'reembolso', causa: 'defecto_fabrica', monto: '120.00', pedido: { usuario: { nombre: 'Ana', email: 'ana@x.mx' } }, pedidoItem: { nombreProducto: 'Shampoo', producto: { nombre: 'Shampoo' } }, resueltoPor: null }],
    });
    const r = await listarDevolucionesPaginado({ page: 2, limit: 20, estado: 'pendiente' });
    expect(get.mock.calls[0][0]).toBe('/api/devoluciones?page=2&limit=20&estado=pendiente');
    expect(r).toMatchObject({ count: 45, page: 2, limit: 20, totalPages: 3 });
    expect(r.data[0]).toMatchObject({ id: 7, tipo: 'reembolso', causa: 'defecto_fabrica', monto: 120, clienteNombre: 'Ana', clienteEmail: 'ana@x.mx', producto: 'Shampoo' });
  });

  it('Mis solicitudes hace una sola llamada con propios=true', async () => {
    await listarDevolucionesDelCliente();
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe('/api/devoluciones?propios=true&limit=100');
  });
});
