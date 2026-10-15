import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(async () => ({ data: null })),
  post: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async () => ({})),
}));
vi.mock('../../../../../../services/client', () => ({ apiClient: { get, post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { listarDevolucionesPaginado, obtenerPedido, recibirRevocacion, revocarCompraPropia } from '../../../../../../services/ecommerce';
import { puedeVerBotonRevocar, resultadoRevocacion, textoModalRevocacion } from './revocacion';

afterEach(() => { get.mockClear(); post.mockClear(); });

/**
 * Revocación de compra (art. 56 de la Ley Federal de Protección al Consumidor) en "Mis pedidos": el botón se ve
 * mientras el backend diga que se puede (puedeRevocar) y no haya pasado la fecha límite que calculó.
 */
const VENCE = '2026-11-20T05:59:59.999Z'; // jueves 19 de noviembre de 2026, 23:59:59.999 en México

describe('Botón "Revocar compra": visible mientras se pueda revocar', () => {
  it('con puedeRevocar y antes de la fecha límite: se ve, hasta el último milisegundo', () => {
    expect(puedeVerBotonRevocar({ puedeRevocar: true, revocableHasta: VENCE }, new Date('2026-11-19T12:00:00-06:00'))).toBe(true);
    expect(puedeVerBotonRevocar({ puedeRevocar: true, revocableHasta: VENCE }, new Date(VENCE))).toBe(true);
  });

  it('pasada la fecha límite no se ve, aunque la página se haya cargado antes', () => {
    expect(puedeVerBotonRevocar({ puedeRevocar: true, revocableHasta: VENCE }, new Date('2026-11-20T00:00:00-06:00'))).toBe(false);
  });

  it('sin puedeRevocar (ya revocado, cancelado o sin pagar) o sin fecha: no se ve', () => {
    expect(puedeVerBotonRevocar({ puedeRevocar: false, revocableHasta: VENCE }, new Date('2026-11-18T12:00:00-06:00'))).toBe(false);
    expect(puedeVerBotonRevocar({ puedeRevocar: true, revocableHasta: null }, new Date('2026-11-18T12:00:00-06:00'))).toBe(false);
    expect(puedeVerBotonRevocar({}, new Date('2026-11-18T12:00:00-06:00'))).toBe(false);
  });
});

describe('Texto del modal: explica el derecho y la fecha límite', () => {
  it('ya recogido: 5 días hábiles, sin dar razones, reintegro total, entregar el producto en el salón y la fecha límite', () => {
    const texto = textoModalRevocacion({ estado: 'entregado', total: 1250, revocableHasta: VENCE }).join(' ');
    expect(texto).toContain('5 días hábiles');
    expect(texto).toContain('sin dar razones');
    expect(texto).toContain('no cuentan los domingos ni los días festivos oficiales');
    expect(texto).toContain('Te reintegramos todo lo que pagaste: $1,250.');
    expect(texto).toContain('Como ya recogiste tu pedido, entrégalo en el salón');
    expect(texto).toContain('Puedes revocarla hasta el jueves, 19 de noviembre de 2026');
  });

  it('si ya se le devolvió una parte, promete solo el saldo que calculó el backend, no el total', () => {
    const texto = textoModalRevocacion({ estado: 'entregado', total: 350, montoRevocable: 200, revocableHasta: VENCE }).join(' ');
    expect(texto).toContain('Te reintegramos lo que pagaste y todavía no te habíamos devuelto: $200.');
    expect(texto).not.toContain('todo lo que pagaste');
    expect(texto).not.toContain('$350');
  });

  it('con el saldo igual al total, sigue diciendo que reintegra todo lo pagado', () => {
    const texto = textoModalRevocacion({ estado: 'entregado', total: 350, montoRevocable: 350, revocableHasta: VENCE }).join(' ');
    expect(texto).toContain('Te reintegramos todo lo que pagaste: $350.');
  });

  it('sin recoger: se cancela el pedido y se reembolsa por el mismo medio de pago', () => {
    const texto = textoModalRevocacion({ estado: 'preparando', total: 350, revocableHasta: VENCE }).join(' ');
    expect(texto).toContain('Como todavía no lo recoges, cancelamos tu pedido y te reembolsamos por el mismo medio con el que pagaste.');
    expect(texto).not.toContain('entrégalo en el salón');
  });
});

describe('Resultado visible después de revocar', () => {
  it.each([
    ['reembolsado', 'success', 'Revocaste tu compra: cancelamos tu pedido y te devolvimos $350.'],
    ['en_revision', 'info', 'Revocaste tu compra y cancelamos tu pedido. El salón te reintegra $350'],
    ['pendiente_entrega', 'success', 'Revocaste tu compra. Entrega tu pedido en el salón: al recibirlo te reembolsamos $350'],
  ] as const)('%s', (estado, tipo, inicio) => {
    const r = resultadoRevocacion({ estado, monto: 350, devolucionId: 1 });
    expect(r.tipo).toBe(tipo);
    expect(r.mensaje.startsWith(inicio)).toBe(true);
  });
});

describe('Servicios', () => {
  it('el detalle del pedido trae revocableHasta y puedeRevocar del backend', async () => {
    get.mockResolvedValueOnce({ success: true, data: { id: 7, estado: 'entregado', total: '350.00', revocableHasta: VENCE, puedeRevocar: true, montoRevocable: 200 } });
    const p = await obtenerPedido(7, { propios: true });
    expect(p).toMatchObject({ id: 7, revocableHasta: VENCE, puedeRevocar: true, montoRevocable: 200 });
  });

  it('un pedido sin esos campos (panel) no los inventa', async () => {
    get.mockResolvedValueOnce({ success: true, data: { id: 7, estado: 'entregado', total: '350.00' } });
    const p = await obtenerPedido(7);
    expect(p).not.toHaveProperty('puedeRevocar');
    expect(p).not.toHaveProperty('revocableHasta');
    expect(p).not.toHaveProperty('montoRevocable');
  });

  it('revocar: POST con propios=true, motivo solo si lo escribió, y devuelve el resultado', async () => {
    post.mockResolvedValueOnce({ success: true, data: { id: 7, estado: 'cancelado', total: '350.00', puedeRevocar: false }, revocacion: { estado: 'reembolsado', monto: 350, devolucionId: 100 } });
    const r = await revocarCompraPropia(7, '  Ya no lo necesito ');
    expect(post.mock.calls[0][0]).toBe('/api/pedidos/7/revocar?propios=true');
    expect(post.mock.calls[0][1]).toEqual({ motivo: 'Ya no lo necesito' });
    expect(r).toMatchObject({ pedido: { id: 7, estado: 'cancelado' }, revocacion: { estado: 'reembolsado', monto: 350, devolucionId: 100 } });
    post.mockResolvedValueOnce({ success: true, data: { id: 7 }, revocacion: { estado: 'pendiente_entrega', monto: 350, devolucionId: 101 } });
    await revocarCompraPropia(7, '   ');
    expect(post.mock.calls[1][1]).toEqual({});
  });

  it('la lista del panel trae el origen y el estado del pedido: de ahí salen la insignia y "Recibir producto y reembolsar"', async () => {
    get.mockResolvedValueOnce({
      success: true,
      count: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
      data: [
        { id: 100, estado: 'pendiente', tipo: 'reembolso', origen: 'revocacion_art56', monto: '350.00', pedidoId: 7, pedido: { id: 7, estado: 'cancelado', usuario: { nombre: 'Ana' } } },
        { id: 101, estado: 'pendiente', tipo: 'cambio', origen: 'solicitud', pedidoId: 8, pedido: { id: 8, estado: 'entregado' } },
      ],
    });
    const { data } = await listarDevolucionesPaginado();
    expect(data[0]).toMatchObject({ id: 100, origen: 'revocacion_art56', pedidoEstado: 'cancelado' });
    expect(data[1]).toMatchObject({ id: 101, origen: 'solicitud', pedidoEstado: 'entregado' });
  });

  it('recibir producto y reembolsar: POST de la devolución con la nota', async () => {
    post.mockResolvedValueOnce({ success: true, data: { id: 100 }, reembolso: 'mercado_pago' });
    const r = await recibirRevocacion(100, { nota: 'Sellado' });
    expect(post.mock.calls[0][0]).toBe('/api/devoluciones/100/recibir-revocacion');
    expect(post.mock.calls[0][1]).toEqual({ nota: 'Sellado' });
    expect(r.reembolso).toBe('mercado_pago');
  });
});

describe('O2: motivo de una devolución por revocación sin la etiqueta cruda del backend', () => {
  it('quita "[Revocación de compra · art. 56 LFPC]" (ya hay insignia) y deja lo que escribió la clienta', async () => {
    const { motivoVisibleDevolucion } = await import('./revocacion');
    expect(motivoVisibleDevolucion({ origen: 'revocacion_art56', motivo: '[Revocación de compra · art. 56 LFPC]' })).toBeNull();
    expect(motivoVisibleDevolucion({ origen: 'revocacion_art56', motivo: '[Revocación de compra · art. 56 LFPC] Ya no lo necesito' })).toBe('Ya no lo necesito');
    expect(motivoVisibleDevolucion({ origen: 'cliente', motivo: 'Llegó roto' })).toBe('Llegó roto');
    expect(motivoVisibleDevolucion({ origen: 'cliente', motivo: null })).toBe('Sin motivo');
  });

  it('la pantalla usa ese texto, sin guion largo de relleno', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(pagina).toContain('{motivoVisibleDevolucion(d)}');
    expect(pagina).not.toContain("{d.motivo ?? '\u2014'}");
  });
});
