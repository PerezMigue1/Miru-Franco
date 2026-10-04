import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post, put, patch } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(async () => ({ data: [] })),
  post: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async () => ({ data: { id: 1 } })),
  put: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async () => ({ data: { id: 1 } })),
  patch: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async () => ({ data: { id: 1, clienteId: 'yo', especialistaId: 'e', servicioId: 5, fechaHoraInicio: '2026-10-10T16:00:00Z', fechaHoraFin: '2026-10-10T17:00:00Z', estado: 'cancelada' } })),
}));
vi.mock('./client', () => ({ apiClient: { get, post, put, patch, delete: vi.fn() } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { actualizarPedido, crearPedido, listarPedidos, listarPedidosQueIncluyenProducto, obtenerPedido } from './ecommerce';
import { cancelarCita, crearCita, listarCitas, obtenerCita, reprogramarCita } from './citas';

afterEach(() => { get.mockClear(); post.mockClear(); put.mockClear(); patch.mockClear(); });

/**
 * El portal de clienta lo usan todos los roles: cada llamada del portal pide `propios=true` para que el
 * backend devuelva y cambie solo lo de quien está en sesión, aunque sea personal con permisos.
 */
describe('Pedidos del portal (propios)', () => {
  it('Mis pedidos, detalle, cancelar y crear piden propios=true', async () => {
    await listarPedidos({ propios: true });
    expect(get.mock.calls[0][0]).toBe('/api/pedidos?propios=true');
    get.mockResolvedValueOnce({ data: { id: 5 } });
    await obtenerPedido(5, { propios: true });
    expect(get.mock.calls[1][0]).toBe('/api/pedidos/5?propios=true');
    await actualizarPedido(5, { estado: 'cancelado' }, { propios: true });
    expect(put.mock.calls[0][0]).toBe('/api/pedidos/5?propios=true');
    await crearPedido({ items: [] } as never, { propios: true });
    expect(post.mock.calls[0][0]).toBe('/api/pedidos?propios=true');
  });

  it('los paneles siguen llamando sin propios', async () => {
    await listarPedidos();
    expect(get.mock.calls[0][0]).toBe('/api/pedidos');
  });

  it('la reseña de un producto revisa solo los pedidos propios', async () => {
    await listarPedidosQueIncluyenProducto(9);
    expect(get.mock.calls[0][0]).toBe('/api/pedidos?propios=true');
  });
});

describe('Citas del portal (propios)', () => {
  it('Mis citas, detalle, agendar, reprogramar y cancelar piden propios=true', async () => {
    await listarCitas({ orden: 'fechaHoraInicio', limit: 100, propios: true });
    expect(get.mock.calls[0][0]).toContain('propios=true');
    get.mockResolvedValueOnce({ data: { id: 3, clienteId: 'yo', especialistaId: 'e', servicioId: 5, fechaHoraInicio: '2026-10-10T16:00:00Z', fechaHoraFin: '2026-10-10T17:00:00Z', estado: 'pendiente' } });
    await obtenerCita(3, { propios: true });
    expect(get.mock.calls[1][0]).toBe('/api/citas/3?propios=true');
    post.mockResolvedValueOnce({ data: { id: 4, clienteId: 'yo', especialistaId: 'e', servicioId: 5, fechaHoraInicio: '2026-10-10T16:00:00Z', fechaHoraFin: '2026-10-10T17:00:00Z', estado: 'pendiente' } });
    await crearCita({ clienteId: 'yo', especialistaId: 'e', servicioId: 5, fechaHoraInicio: 'a', fechaHoraFin: 'b' } as never, { propios: true });
    expect(post.mock.calls[0][0]).toBe('/api/citas?propios=true');
    await reprogramarCita(3, { fechaHoraInicio: 'a', fechaHoraFin: 'b' }, { propios: true });
    expect(patch.mock.calls[0][0]).toBe('/api/citas/3/reprogramar?propios=true');
    await cancelarCita(3, { motivoCancelacion: 'x' }, { propios: true });
    expect(patch.mock.calls[1][0]).toBe('/api/citas/3/cancelar?propios=true');
  });

  it('los paneles siguen llamando sin propios', async () => {
    await cancelarCita(3, { motivoCancelacion: 'x' });
    expect(patch.mock.calls[0][0]).toBe('/api/citas/3/cancelar');
  });
});
