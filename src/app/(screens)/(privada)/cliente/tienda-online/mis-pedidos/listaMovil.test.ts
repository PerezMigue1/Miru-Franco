import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PedidoApi } from '../../../../../services/ecommerce';

vi.mock('../../../../../services/client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

const { default: TarjetaPedidoMovil } = await import('./TarjetaPedidoMovil');

const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const pedido = { id: 77, estado: 'pagado', total: 450, moneda: 'MXN', metodoPago: 'mercadopago', creadoEn: '2026-10-10T18:00:00.000Z' } as PedidoApi;

/** En móvil la tabla dejaba el estado y "Ver detalle" fuera de vista: por debajo de 640 px cada pedido es una tarjeta. */
describe('Mis pedidos en móvil: tarjetas con el estado bajo el número', () => {
  it('número, estado debajo, fecha y total', () => {
    const html = renderToStaticMarkup(createElement(TarjetaPedidoMovil, { pedido, fecha: '10 oct 2026' }));
    const numero = html.indexOf('#77');
    const estado = html.indexOf('mf-badge');
    expect(numero).toBeGreaterThan(-1);
    expect(estado).toBeGreaterThan(numero);
    expect(html).toContain('10 oct 2026');
    expect(html).toContain('$450');
  });

  it('"Ver detalle" lleva al pedido y mide 44 px', () => {
    const html = renderToStaticMarkup(createElement(TarjetaPedidoMovil, { pedido, fecha: '10 oct 2026' }));
    const ver = html.match(/<a[^>]*href="\/cliente\/tienda-online\/mis-pedidos\/77"[^>]*>/)?.[0] ?? '';
    expect(ver).toMatch(/\bmin-h-11\b/);
  });

  it('la página usa las tarjetas por debajo de 640 px y la tabla desde ahí', () => {
    expect(pagina).toMatch(/<ul className="space-y-3 sm:hidden"[^>]*>[\s\S]*?<TarjetaPedidoMovil/);
    expect(pagina).toMatch(/<div className="hidden sm:block">\s*<Table/);
  });
});
