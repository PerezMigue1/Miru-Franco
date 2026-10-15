import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(),
  post: vi.fn<(ruta: string, cuerpo: unknown, base?: unknown) => Promise<unknown>>(async () => ({ pagoId: 3027, estado: 'reembolsado' })),
}));
vi.mock('../../../services/client', () => ({ apiClient: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { listarReembolsosPendientes, marcarReembolsoManual, reintentarReembolso } from '../../../services/reembolsosPendientes';
import { ETIQUETA_ACCION_HISTORIAL, origenDelPago, validarReembolsoManual } from './reembolsosPendientes';

afterEach(() => {
  get.mockReset();
  post.mockClear();
});

/** Admin > Reembolsos pendientes: pagos en revisión ("reembolsar a mano") con reintento y reembolso manual. */
describe('Servicio', () => {
  it('lista los pagos en revisión del backend', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 3027, pedidoId: 3089, citaId: null, monto: 335, motivo: 'reembolsar a mano', puedeReintentar: true, historial: [] }] });
    const lista = await listarReembolsosPendientes();
    expect(get.mock.calls[0][0]).toBe('/api/reembolsos-pendientes');
    expect(lista).toEqual([expect.objectContaining({ id: 3027, pedidoId: 3089, monto: 335, puedeReintentar: true })]);
  });

  it('reintentar: POST /api/reembolsos-pendientes/:id/reintentar', async () => {
    await reintentarReembolso(3027);
    expect(post.mock.calls[0][0]).toBe('/api/reembolsos-pendientes/3027/reintentar');
  });

  it('marcar a mano: POST con la referencia y la nota recortadas; sin nota no la manda', async () => {
    await marcarReembolsoManual(3027, '  SPEI 4455 ', '  Transferencia ');
    expect(post.mock.calls[0]).toEqual(['/api/reembolsos-pendientes/3027/marcar-manual', { referencia: 'SPEI 4455', nota: 'Transferencia' }, expect.anything()]);
    await marcarReembolsoManual(3027, 'SPEI 1', '   ');
    expect(post.mock.calls[1][1]).toEqual({ referencia: 'SPEI 1' });
  });
});

describe('Lógica de la pantalla', () => {
  it('la referencia es obligatoria y tiene máximo 120 caracteres; la nota, 500', () => {
    expect(validarReembolsoManual('', '')).toEqual({ referencia: 'Escribe la referencia del reembolso (folio de la transferencia o del reembolso).' });
    expect(validarReembolsoManual('x'.repeat(121), '')).toEqual({ referencia: 'La referencia tiene como máximo 120 caracteres.' });
    expect(validarReembolsoManual('SPEI 1', 'n'.repeat(501))).toEqual({ nota: 'La nota tiene como máximo 500 caracteres.' });
    expect(validarReembolsoManual('SPEI 1', 'ok')).toEqual({});
  });

  it('de qué es cada pago: pedido o anticipo de cita, con enlace a su pantalla', () => {
    expect(origenDelPago({ pedidoId: 3089, citaId: null })).toEqual({ texto: 'Pedido #3089', href: '/admin/venta-online' });
    expect(origenDelPago({ pedidoId: null, citaId: 25 })).toEqual({ texto: 'Anticipo de la cita #25', href: '/operacion/gestion-citas' });
  });

  it('el historial se lee en español', () => {
    expect(ETIQUETA_ACCION_HISTORIAL).toEqual({ reintento: 'Reembolsado con Mercado Pago', reintento_fallido: 'Reintento fallido', manual: 'Reembolsado manualmente' });
  });

  it('la pantalla confirma antes de reembolsar y no tiene guiones largos', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(pagina).toContain('showConfirm');
    expect(pagina).toContain('Reintentar reembolso');
    expect(pagina).toContain('Marcar como reembolsado manualmente');
    expect(pagina).not.toContain('\u2014');
  });
});
