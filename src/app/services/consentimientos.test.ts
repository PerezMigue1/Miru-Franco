import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(),
  post: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(),
}));
vi.mock('./client', () => ({ apiClient: { get, post } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  aceptacionDeDocumento,
  documentosAceptados,
  misConsentimientos,
  obtenerPendientes,
  registrarConsentimientos,
  revocacion,
} from './consentimientos';
import { documentoLegal } from '../utils/documentosLegales';

afterEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('Consentimientos: cada casilla se registra con el documento y la versión que leyó la clienta', () => {
  it('aceptar un documento manda su slug, versión y hash del registro legal', () => {
    const terminos = documentoLegal('terminos');
    expect(aceptacionDeDocumento('terminos')).toEqual({
      tipo: 'terminos',
      documentoSlug: 'terminos',
      version: terminos.version,
      hash: terminos.hash,
      accion: 'aceptado',
    });
    expect(aceptacionDeDocumento('aviso-privacidad').tipo).toBe('aviso_privacidad');
    expect(aceptacionDeDocumento('anticipos').documentoSlug).toBe('anticipos');
  });

  it('revocar no necesita documento y queda como una fila nueva con accion revocado', () => {
    expect(revocacion('promociones')).toEqual({ tipo: 'promociones', accion: 'revocado' });
  });

  it('los documentos aceptados del registro llevan slug, versión y hash', () => {
    const docs = documentosAceptados(['terminos', 'aviso-privacidad']);
    expect(docs).toEqual([
      { slug: 'terminos', version: documentoLegal('terminos').version, hash: documentoLegal('terminos').hash },
      { slug: 'aviso-privacidad', version: documentoLegal('aviso-privacidad').version, hash: documentoLegal('aviso-privacidad').hash },
    ]);
  });

  it('registrar hace POST /api/consentimientos con formulario y ruta de origen, sin redirigir ante un 403', async () => {
    post.mockResolvedValueOnce({ success: true, data: [{ id: '1' }] });
    const filas = await registrarConsentimientos({
      items: [aceptacionDeDocumento('reembolsos')],
      formulario: 'checkout',
      rutaOrigen: '/cliente/tienda-online/checkout',
    });
    expect(filas).toEqual([{ id: '1' }]);
    const [ruta, cuerpo, opciones] = post.mock.calls[0];
    expect(ruta).toBe('/api/consentimientos');
    expect(cuerpo).toMatchObject({ formulario: 'checkout', rutaOrigen: '/cliente/tienda-online/checkout' });
    expect(opciones).toMatchObject({ customBase: 'http://api.test', skip403Redirect: true });
  });

  it('pendientes e historial leen sus rutas y devuelven la lista', async () => {
    get.mockResolvedValueOnce({ success: true, data: [{ documentoSlug: 'terminos', version: '2.0' }] });
    expect(await obtenerPendientes()).toEqual([{ documentoSlug: 'terminos', version: '2.0' }]);
    expect(get.mock.calls[0][0]).toBe('/api/consentimientos/pendientes');

    get.mockResolvedValueOnce({ success: true, data: [] });
    expect(await misConsentimientos()).toEqual([]);
    expect(get.mock.calls[1][0]).toBe('/api/consentimientos/mios');
  });

  it('los pendientes son una consulta de fondo: un 401 no manda al login (skip401Redirect)', async () => {
    get.mockResolvedValueOnce({ success: true, data: [] });
    await obtenerPendientes();
    expect(get.mock.calls[0][1]).toMatchObject({ customBase: 'http://api.test', skip403Redirect: true, skip401Redirect: true });
  });
});
