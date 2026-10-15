import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(),
}));
vi.mock('../../../../../services/client', () => ({ apiClient: { get: vi.fn(), post } }));
vi.mock('../../../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  CASILLAS_COMPRA,
  CASILLAS_COMPRA_INICIALES,
  conCandado,
  crearPedidoConConsentimientos,
  erroresCasillasCompra,
  itemsConsentimientoCompra,
} from './compraLegal';
import { documentoLegal } from '../../../../../utils/documentosLegales';

afterEach(() => {
  post.mockReset();
});

const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const casillas = readFileSync(join(__dirname, 'CasillasCompra.tsx'), 'utf8');

/** Cuerpo de una función flecha `const nombre = async (...) => { ... };` del código fuente. */
function cuerpoDe(fuente: string, nombre: string): string {
  const inicio = fuente.indexOf(`const ${nombre} = `);
  expect(inicio, `no se encontró ${nombre}`).toBeGreaterThan(-1);
  return fuente.slice(inicio, fuente.indexOf('\n  };', inicio));
}

describe('Checkout: casillas de Términos de venta y Política de reembolsos', () => {
  it('las dos casillas empiezan sin marcar', () => {
    expect(CASILLAS_COMPRA_INICIALES).toEqual({ terminosVenta: false, reembolsos: false });
    expect(pagina).toMatch(/useState<EstadoCasillasCompra>\(CASILLAS_COMPRA_INICIALES\)/);
    expect(casillas).not.toMatch(/defaultChecked|checked=\{true\}/);
  });

  it('cada casilla enlaza su documento en otra pestaña', () => {
    const porId = Object.fromEntries(CASILLAS_COMPRA.map((c) => [c.id, c]));
    expect(porId.terminosVenta.enlace).toBe('/terminos-y-condiciones#compras-en-linea');
    expect(porId.terminosVenta.textoEnlace).toBe('Términos de venta');
    expect(porId.reembolsos.enlace).toBe('/politica-de-reembolsos');
    expect(porId.reembolsos.despues).toContain('derecho a revocar la compra en 5 días hábiles');
    expect(casillas).toMatch(/type="checkbox"/);
    expect(casillas).toMatch(/htmlFor=\{/);
    expect(casillas).toMatch(/target="_blank" rel="noopener noreferrer"/);
  });

  it('las dos son obligatorias: sin marcar bloquean con un mensaje junto a cada una', () => {
    const sinMarcar = erroresCasillasCompra({ terminosVenta: false, reembolsos: false });
    expect(Object.keys(sinMarcar).sort()).toEqual(['reembolsos', 'terminosVenta']);
    expect(sinMarcar.terminosVenta).toMatch(/Términos de venta/);
    expect(sinMarcar.reembolsos).toMatch(/Política de reembolsos/);
    expect(Object.keys(erroresCasillasCompra({ terminosVenta: true, reembolsos: false }))).toEqual(['reembolsos']);
    expect(erroresCasillasCompra({ terminosVenta: true, reembolsos: true })).toEqual({});
    expect(casillas).toMatch(/role="alert"/);
    expect(casillas).toMatch(/aria-invalid=/);
  });

  it('confirmar revisa las casillas antes de crear el pedido', () => {
    const compra = cuerpoDe(pagina, 'comprar');
    const revision = compra.indexOf('erroresCasillasCompra(casillas)');
    expect(revision).toBeGreaterThan(-1);
    expect(revision).toBeLessThan(compra.indexOf('crearPedido('));
    expect(compra).toMatch(/crearPedidoConConsentimientos\(\(\) =>\s*crearPedido\(/);
    // Con una casilla sin marcar se lleva el foco a ella y se corta ahí: sin este return el pedido se crearía.
    const corte = compra.match(
      /if \(primeraSinMarcar\) \{\s*document\.getElementById\(idCasillaCompra\(primeraSinMarcar\.id\)\)\?\.focus\(\);\s*return;\s*\}/,
    );
    expect(corte, 'falta el return tras enfocar la casilla sin marcar').not.toBeNull();
    expect(compra.indexOf(corte![0])).toBeLessThan(compra.indexOf('crearPedido('));
    expect(compra).toMatch(/if \(!contactoValido\) \{[^}]*return;\s*\}/);
  });

  it('registra terminos_venta con los Términos y reembolsos con su política', () => {
    const terminos = documentoLegal('terminos');
    const reembolsos = documentoLegal('reembolsos');
    expect(itemsConsentimientoCompra()).toEqual([
      { tipo: 'terminos_venta', documentoSlug: 'terminos', version: terminos.version, hash: terminos.hash, accion: 'aceptado' },
      { tipo: 'reembolsos', documentoSlug: 'reembolsos', version: reembolsos.version, hash: reembolsos.hash, accion: 'aceptado' },
    ]);
  });
});

describe('Checkout: candado contra el doble envío', () => {
  it('dos clics seguidos: solo el primero corre (cada envío hace dos POST: consentimiento y pedido)', async () => {
    const candado = { current: false };
    let terminar!: () => void;
    const compra = vi.fn(() => new Promise<void>((resolver) => { terminar = resolver; }));

    const primero = conCandado(candado, compra);
    const segundo = conCandado(candado, compra);
    expect(compra).toHaveBeenCalledTimes(1);
    expect(candado.current).toBe(true);

    terminar();
    await Promise.all([primero, segundo]);
    expect(candado.current).toBe(false);
    // Ya terminado, se puede volver a confirmar.
    const otraCompra = vi.fn(async () => {});
    await conCandado(candado, otraCompra);
    expect(otraCompra).toHaveBeenCalledTimes(1);
    expect(compra).toHaveBeenCalledTimes(1);
  });

  it('si la compra falla, el candado se abre para reintentar', async () => {
    const candado = { current: false };
    await expect(conCandado(candado, async () => { throw new Error('sin conexión'); })).rejects.toThrow('sin conexión');
    expect(candado.current).toBe(false);
  });

  it('ejecutarCompra empieza con el candado de un useRef, antes de revisar nada', () => {
    expect(pagina).toMatch(/const enviandoRef = useRef\(false\);/);
    expect(cuerpoDe(pagina, 'ejecutarCompra')).toMatch(/^const ejecutarCompra = async \(\) => \{\s*(\/\/[^\n]*\n\s*)*await conCandado\(enviandoRef, comprar\);/);
  });
});

describe('Checkout: el consentimiento se registra antes de crear el pedido', () => {
  it('primero POST /api/consentimientos (formulario checkout) y después el pedido', async () => {
    post.mockResolvedValue({ success: true, data: [] });
    const crear = vi.fn(async () => ({ id: 7 }));

    await expect(crearPedidoConConsentimientos(crear)).resolves.toEqual({ id: 7 });

    expect(post).toHaveBeenCalledTimes(1);
    const [ruta, cuerpo] = post.mock.calls[0];
    expect(ruta).toBe('/api/consentimientos');
    expect(cuerpo).toEqual({
      items: itemsConsentimientoCompra(),
      formulario: 'checkout',
      rutaOrigen: '/cliente/tienda-online/checkout',
    });
    expect(post.mock.invocationCallOrder[0]).toBeLessThan(crear.mock.invocationCallOrder[0]);
  });

  it('si el registro falla, el pedido no se crea y el error lo dice', async () => {
    post.mockRejectedValue(Object.assign(new Error('Bad Request'), { status: 400, data: { message: 'La versión 1.0 del documento "reembolsos" no está publicada.' } }));
    const crear = vi.fn(async () => ({ id: 7 }));

    await expect(crearPedidoConConsentimientos(crear)).rejects.toThrow(
      /tu pedido no se creó.*La versión 1\.0 del documento "reembolsos" no está publicada/,
    );
    expect(crear).not.toHaveBeenCalled();
  });
});
