import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const base = vi.hoisted(() => ({ url: 'http://api.test' }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => base.url }));
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('./client', () => ({ apiClient: api }));

import {
  descartarBorradorDocumentoLegal,
  documentosAfectadosPorReglas,
  guardarBorradorDocumentoLegal,
  htmlPublicadoEsSeguro,
  listarDocumentosLegalesAdmin,
  obtenerDocumentoPublicado,
  prepararVersionDocumentoLegal,
  publicarVersionDocumentoLegal,
  versionesVigentes,
  vistaPreviaDocumentoLegal,
} from './documentosLegales';
import { DOCUMENTOS_LEGALES, hashTextoDocumento } from '../utils/documentosLegales';

/**
 * Documentos legales desde el backend: la página pública muestra el html vigente solo si es seguro y da el hash
 * publicado; si no, la página usa su texto de respaldo. El panel llama a /api/documentos-legales/admin.
 */
const HTML = '<main class="mf-terminos"><article><p>Hola &amp; adiós</p></article></main>';

async function respuesta(cambios: Record<string, unknown> = {}) {
  return {
    success: true,
    data: { slug: 'terminos', version: '2.1', vigenteDesde: '2026-10-20', hash: await hashTextoDocumento(HTML), html: HTML, requiereAceptacion: true, ...cambios },
  };
}

function conFetch(cuerpo: unknown, ok = true) {
  const fetchFalso = vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => cuerpo }));
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

beforeEach(() => {
  base.url = 'http://api.test';
  for (const fn of Object.values(api)) fn.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('obtenerDocumentoPublicado (páginas legales)', () => {
  it('trae el vigente con revalidación de un minuto y lo devuelve si el hash coincide', async () => {
    const fetchFalso = conFetch(await respuesta());
    const doc = await obtenerDocumentoPublicado('terminos');
    expect(doc).toMatchObject({ slug: 'terminos', version: '2.1', html: HTML });
    const [url, opciones] = fetchFalso.mock.calls[0] as unknown as [string, { next?: { revalidate?: number }; signal?: unknown }];
    expect(url).toBe('http://api.test/api/documentos-legales/terminos/vigente');
    expect(opciones.next?.revalidate).toBe(60);
    expect(opciones.signal).toBeDefined();
  });

  it('si el hash no corresponde al texto, usa el respaldo (null)', async () => {
    conFetch(await respuesta({ hash: 'a'.repeat(64) }));
    expect(await obtenerDocumentoPublicado('terminos')).toBeNull();
  });

  it('sin texto en la base, con error, sin red o de otro documento: null', async () => {
    conFetch(await respuesta({ html: null }));
    expect(await obtenerDocumentoPublicado('terminos')).toBeNull();
    conFetch({}, false);
    expect(await obtenerDocumentoPublicado('terminos')).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    expect(await obtenerDocumentoPublicado('terminos')).toBeNull();
    conFetch(await respuesta({ slug: 'cookies' }));
    expect(await obtenerDocumentoPublicado('terminos')).toBeNull();
  });

  it('sin la URL del backend no pide nada', async () => {
    base.url = '';
    const fetchFalso = conFetch(await respuesta());
    expect(await obtenerDocumentoPublicado('terminos')).toBeNull();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('html con algo ejecutable no se muestra aunque el hash coincida', async () => {
    for (const malo of [
      '<main class="mf-terminos"><script>alert(1)</script></main>',
      '<main class="mf-terminos"><p onclick="x()">Hola</p></main>',
      '<main class="mf-terminos"><a href="javascript:alert(1)">x</a></main>',
      '<main class="mf-terminos"><iframe src="https://x.com"></iframe></main>',
      '<div><p>Hola</p></div>',
    ]) {
      expect(htmlPublicadoEsSeguro(malo), malo).toBe(false);
      conFetch(await respuesta({ html: malo, hash: await hashTextoDocumento(malo) }));
      expect(await obtenerDocumentoPublicado('terminos')).toBeNull();
    }
    expect(htmlPublicadoEsSeguro(HTML)).toBe(true);
    expect(htmlPublicadoEsSeguro('<main class="mf-terminos"><p>Base de datos: ondas = 3</p></main>')).toBe(true);
  });
});

describe('versionesVigentes (casillas de consentimiento)', () => {
  it('usa las del backend y, si no responde, las del registro de la web', async () => {
    conFetch({ data: [{ slug: 'terminos', version: '2.1', hash: 'b'.repeat(64), vigenteDesde: '2026-10-20', requiereAceptacion: false }] });
    const lista = await versionesVigentes();
    expect(lista.find((d) => d.slug === 'terminos')).toMatchObject({ version: '2.1', hash: 'b'.repeat(64) });
    expect(lista.find((d) => d.slug === 'cookies')).toMatchObject({ version: DOCUMENTOS_LEGALES.find((d) => d.slug === 'cookies')!.version });
    conFetch({}, false);
    expect((await versionesVigentes()).map((d) => d.version)).toEqual(DOCUMENTOS_LEGALES.map((d) => d.version));
  });
});

describe('Panel: Admin > Documentos legales', () => {
  it('lista, guarda y descarta el borrador, prepara una versión y la vista previa', async () => {
    api.get.mockResolvedValue({ success: true, data: [{ slug: 'terminos' }] });
    expect(await listarDocumentosLegalesAdmin()).toEqual([{ slug: 'terminos' }]);
    expect(api.get).toHaveBeenCalledWith('/api/documentos-legales/admin', { customBase: 'http://api.test', skip403Redirect: true });

    api.put.mockResolvedValue({ success: true, data: { guardado: true } });
    await guardarBorradorDocumentoLegal('terminos', '## A');
    expect(api.put).toHaveBeenCalledWith('/api/documentos-legales/admin/terminos/borrador', { plantilla: '## A' }, 'http://api.test');

    api.delete.mockResolvedValue({ success: true, data: { descartado: true } });
    await descartarBorradorDocumentoLegal('terminos');
    expect(api.delete).toHaveBeenCalledWith('/api/documentos-legales/admin/terminos/borrador', 'http://api.test');

    api.post.mockResolvedValue({ success: true, data: { creado: true } });
    await prepararVersionDocumentoLegal('reembolsos');
    expect(api.post).toHaveBeenLastCalledWith('/api/documentos-legales/admin/reembolsos/preparar-version', {}, 'http://api.test');

    api.post.mockResolvedValue({ success: true, data: { html: HTML, hash: 'x', errores: [] } });
    await vistaPreviaDocumentoLegal('terminos', { plantilla: '## A', version: '2.1', vigenteDesde: '2026-10-20' });
    expect(api.post).toHaveBeenLastCalledWith('/api/documentos-legales/admin/terminos/vista-previa', { plantilla: '## A', version: '2.1', vigenteDesde: '2026-10-20' }, 'http://api.test');
  });

  it('publicar manda versión, fecha, motivo y la casilla de volver a aceptar', async () => {
    api.post.mockResolvedValue({ success: true, data: { version: '2.1' } });
    const datos = { plantilla: '## A', version: '2.1', vigenteDesde: '2026-10-20', motivo: 'Cambio importante.', requiereAceptacion: true };
    expect(await publicarVersionDocumentoLegal('terminos', datos)).toEqual({ version: '2.1' });
    expect(api.post).toHaveBeenCalledWith('/api/documentos-legales/admin/terminos/publicar', datos, 'http://api.test');
  });

  it('afectados por reglas: GET con las de hoy y POST con las propuestas', async () => {
    api.get.mockResolvedValue({ success: true, data: [] });
    await documentosAfectadosPorReglas();
    expect(api.get).toHaveBeenCalledWith('/api/documentos-legales/admin/afectados-por-reglas', { customBase: 'http://api.test', skip403Redirect: true });
    api.post.mockResolvedValue({ success: true, data: [{ slug: 'terminos', titulo: 'Términos', version: '2.0', variables: [] }] });
    const r = await documentosAfectadosPorReglas({ garantia: { diasServicio: 10 } });
    expect(r[0].slug).toBe('terminos');
    expect(api.post).toHaveBeenCalledWith('/api/documentos-legales/admin/afectados-por-reglas', { reglas: { garantia: { diasServicio: 10 } } }, 'http://api.test');
  });
});
