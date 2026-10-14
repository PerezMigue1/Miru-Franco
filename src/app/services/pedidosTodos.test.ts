import { afterEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>() }));
vi.mock('./client', () => ({ apiClient: { get } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { cargarLineasVentasDesdePedidosOnline } from '../utils/inventarioVentasOnline';

/** Simula GET /api/pedidos paginado como el backend (por defecto 20, máximo 100) con `total` pedidos pagados. */
function backendConPedidos(total: number, conItems = false) {
  get.mockImplementation(async (ruta: string) => {
    if (/\/api\/pedidos\/\d+\/items/.test(ruta)) {
      return { data: [{ id: 1, cantidad: 1, productoId: 3, presentacionId: 4, subtotal: 100 }] };
    }
    const url = new URL(`http://x${ruta}`);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
    const page = Number(url.searchParams.get('page') ?? 1);
    const desde = (page - 1) * limit;
    const data = Array.from({ length: Math.max(0, Math.min(limit, total - desde)) }, (_, i) => ({
      id: desde + i + 1,
      estado: 'pagado',
      total: 100,
      creadoEn: '2026-10-01T12:00:00Z',
      // El listado real incluye las líneas (include items en el backend).
      ...(conItems ? { items: [{ id: 9, cantidad: 2, productoId: 3, presentacionId: 4, subtotal: 200 }] } : {}),
    }));
    return { data, count: total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  });
}

afterEach(() => get.mockReset());

describe('Análisis de ventas online: recorre todas las páginas de pedidos', () => {
  it('con 245 pedidos analiza los 245, no solo los 20 de la primera página', async () => {
    backendConPedidos(245);
    const r = await cargarLineasVentasDesdePedidosOnline();
    expect(r.pedidosAnalizados).toBe(245);
    expect(r.lineas).toHaveLength(245);
  });

  it('pide páginas de 100 (el máximo del backend)', async () => {
    backendConPedidos(150);
    await cargarLineasVentasDesdePedidosOnline();
    const rutasPedidos = get.mock.calls.map(([r]) => r).filter((r) => r.startsWith('/api/pedidos?'));
    expect(rutasPedidos).toEqual(['/api/pedidos?page=1&limit=100', '/api/pedidos?page=2&limit=100']);
  });

  it('usa las líneas que ya trae el listado: no pide /items pedido por pedido (N+1)', async () => {
    backendConPedidos(150, true);
    const r = await cargarLineasVentasDesdePedidosOnline();
    expect(r.lineas).toHaveLength(150);
    expect(r.lineas[0]).toMatchObject({ productoId: 3, cantidad: 2, subtotal: 200 });
    expect(get.mock.calls.some(([ruta]) => /\/items/.test(ruta))).toBe(false);
  });
});
