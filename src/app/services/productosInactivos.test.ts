import { afterEach, describe, expect, it, vi } from 'vitest';

type Put = (endpoint: string, cuerpo: unknown, base?: string) => Promise<unknown>;
type Fetch = (url: string, init?: RequestInit & { next?: unknown }) => Promise<Response>;

const put = vi.fn<Put>(async () => ({ success: true, data: { id: 9, nombre: 'Shampoo', activo: true, presentaciones: [] } }));
vi.mock('./client', () => ({ apiClient: { put: (...args: Parameters<Put>) => put(...args) } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { getProductosSinRedirigir, reactivarProducto } from './productos';

/**
 * Borrado lógico de productos: el backend solo lista activos; el inventario admin pide también los
 * inactivos con ?incluirInactivos=1 (la sesión viaja en la cookie) y puede reactivarlos.
 */
const catalogo = (filas: unknown[]) => new Response(JSON.stringify({ success: true, data: filas }), { status: 200 });

describe('services/productos: productos inactivos', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    put.mockClear();
  });

  it('con incluirInactivos pide ?incluirInactivos=1 con la cookie de sesión y sin caché', async () => {
    const fetchMock = vi.fn<Fetch>(async () => catalogo([]));
    vi.stubGlobal('fetch', fetchMock);
    await getProductosSinRedirigir({ incluirInactivos: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/productos?incluirInactivos=1');
    expect(init?.credentials).toBe('include');
    expect(init?.next).toBeUndefined();
  });

  it('sin la opción (tienda, POS, venta local) no pide inactivos', async () => {
    const fetchMock = vi.fn<Fetch>(async () => catalogo([]));
    vi.stubGlobal('fetch', fetchMock);
    await getProductosSinRedirigir();
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/productos');
  });

  it('cada producto trae su estado: activo false si el backend lo manda así, true si no viene', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => catalogo([
      { id: 1, nombre: 'Activo', activo: true, presentaciones: [] },
      { id: 2, nombre: 'Desactivado', activo: false, presentaciones: [] },
      { id: 3, nombre: 'Sin campo', presentaciones: [] },
    ])));
    const { data } = await getProductosSinRedirigir({ incluirInactivos: true });
    expect(data.map((p) => [p.id, p.activo])).toEqual([[1, true], [2, false], [3, true]]);
  });

  it('reactivarProducto manda PUT /api/productos/:id con activo true', async () => {
    const producto = await reactivarProducto(9);
    expect(put).toHaveBeenCalledWith('/api/productos/9', { activo: true }, 'http://api.test');
    expect(producto.activo).toBe(true);
  });
});
