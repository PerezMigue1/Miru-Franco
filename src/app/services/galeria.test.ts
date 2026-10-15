import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post, put, patch, del } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>(),
  post: vi.fn<(ruta: string, cuerpo?: unknown, opciones?: unknown) => Promise<unknown>>(),
  put: vi.fn<(ruta: string, cuerpo?: unknown, opciones?: unknown) => Promise<unknown>>(),
  patch: vi.fn<(ruta: string, cuerpo?: unknown, base?: unknown, opciones?: unknown) => Promise<unknown>>(),
  del: vi.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>(),
}));
vi.mock('./client', () => ({ apiClient: { get, post, put, patch, delete: del } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  MENSAJE_FALLO_CLOUDINARY,
  aFotosGaleria,
  actualizarFoto,
  buscarAutorizaciones,
  crearFoto,
  eliminarFoto,
  listarGaleriaPanel,
  listarGaleriaPublica,
  pedirFirmaFotoGaleria,
  reordenarGaleria,
  validarArchivoGaleria,
} from './galeria';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const respuesta = (cuerpo: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => cuerpo, text: async () => JSON.stringify(cuerpo) }) as Response;

describe('Galería pública (componentes de servidor)', () => {
  it('lee GET /api/galeria con revalidación corta, sin sesión', async () => {
    const fetchMock = vi.fn(async () => respuesta({ success: true, data: [{ id: 1, url: 'https://res.cloudinary.com/x/image/upload/galeria/a.jpg', alt: 'Corte', servicio: null }] }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await listarGaleriaPublica();
    expect(r).toEqual({ data: [{ id: 1, url: 'https://res.cloudinary.com/x/image/upload/galeria/a.jpg', alt: 'Corte', servicio: null }], error: null });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { next?: { revalidate?: number } }];
    expect(url).toBe('http://api.test/api/galeria');
    expect(init.next?.revalidate).toBe(60);
    expect(init.credentials).toBeUndefined();
  });

  it('nunca lanza: sin red o con error devuelve lista vacía y el mensaje', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const sinRed = await listarGaleriaPublica();
    expect(sinRed.data).toEqual([]);
    expect(sinRed.error).toMatch(/conexión/i);
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ message: 'x' }, 500)));
    expect((await listarGaleriaPublica()).data).toEqual([]);
  });

  it('descarta elementos mal formados', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ data: [{ id: 1 }, null, { id: 2, url: 'https://a/b.jpg', alt: 'B', servicio: { id: 3, nombre: 'Tinte', categoria: 'Color' } }] })));
    expect((await listarGaleriaPublica()).data.map((f) => f.id)).toEqual([2]);
  });

  it('aFotosGaleria adapta al mosaico: texto alternativo de la foto y servicio opcional', () => {
    expect(
      aFotosGaleria([
        { id: 1, url: 'u1', alt: 'Bob corto', servicio: { id: 3, nombre: 'Corte', categoria: 'Cabello' } },
        { id: 2, url: 'u2', alt: 'Recogido', servicio: null },
      ]),
    ).toEqual([
      { url: 'u1', alt: 'Bob corto', servicioId: 3, servicio: 'Corte', categoria: 'Cabello' },
      { url: 'u2', alt: 'Recogido', servicioId: null, servicio: 'Trabajo del salón', categoria: undefined },
    ]);
  });
});

describe('Galería del panel', () => {
  it('lista con filtros en la query', async () => {
    get.mockResolvedValueOnce({ success: true, data: [{ id: 1 }] });
    expect(await listarGaleriaPanel({ servicioId: 3, estado: 'oculta', ilustrativa: false })).toEqual([{ id: 1 }]);
    expect(get.mock.calls[0][0]).toBe('/api/galeria/panel?servicioId=3&estado=oculta&ilustrativa=false');
    expect(get.mock.calls[0][1]).toMatchObject({ customBase: 'http://api.test', skip403Redirect: true });
    get.mockResolvedValueOnce({ success: true, data: [] });
    await listarGaleriaPanel();
    expect(get.mock.calls[1][0]).toBe('/api/galeria/panel');
  });

  it('crear, actualizar, reordenar y buscar autorizaciones usan sus rutas', async () => {
    post.mockResolvedValueOnce({ data: { id: 9 } });
    const publicId = 'galeria/panel_0123456789abcdef0123456789abcdef';
    expect(await crearFoto({ publicId, alt: 'a', visible: false })).toEqual({ id: 9 });
    expect(post.mock.calls[0][0]).toBe('/api/galeria');
    // Solo el public_id de la subida firmada: nunca una URL.
    expect(post.mock.calls[0][1]).toEqual({ publicId, alt: 'a', visible: false });

    patch.mockResolvedValueOnce({ data: { id: 9, visible: true } });
    expect(await actualizarFoto(9, { visible: true, sinPersonasIdentificables: true })).toEqual({ id: 9, visible: true });
    expect(patch.mock.calls[0][0]).toBe('/api/galeria/9');

    put.mockResolvedValueOnce({ success: true });
    await reordenarGaleria([3, 1, 2]);
    expect(put.mock.calls[0][0]).toBe('/api/galeria/orden');
    expect(put.mock.calls[0][1]).toEqual({ ids: [3, 1, 2] });

    get.mockResolvedValueOnce({ data: [{ consentimientoId: '4', nombre: 'Ana', fecha: '2026-10-01T00:00:00.000Z' }] });
    expect(await buscarAutorizaciones('  ana ')).toHaveLength(1);
    expect(get.mock.calls[0][0]).toBe('/api/galeria/autorizaciones?q=ana');
  });

  it('buscar autorizaciones con menos de 2 letras no llama al backend', async () => {
    expect(await buscarAutorizaciones(' a ')).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('eliminar: si Cloudinary falla (502) explica que la foto quedó oculta y que se reintente', async () => {
    del.mockResolvedValueOnce({ success: true });
    await eliminarFoto(4);
    expect(del.mock.calls[0][0]).toBe('/api/galeria/4');
    expect(del.mock.calls[0][1]).toMatchObject({ skip500Redirect: true });
    del.mockRejectedValueOnce(Object.assign(new Error('Ocurrió un error interno.'), { status: 502 }));
    await expect(eliminarFoto(4)).rejects.toThrow(MENSAJE_FALLO_CLOUDINARY);
  });
});

describe('Validación antes de subir', () => {
  const archivo = (tipo: string, bytes: number, nombre = 'foto') => ({ type: tipo, size: bytes, name: nombre }) as File;
  it('acepta JPG, PNG y WebP de hasta 5 MB', () => {
    expect(validarArchivoGaleria(archivo('image/jpeg', 1000))).toBeNull();
    expect(validarArchivoGaleria(archivo('image/png', 5 * 1024 * 1024))).toBeNull();
    expect(validarArchivoGaleria(archivo('image/webp', 10))).toBeNull();
  });
  it('rechaza otros formatos y archivos de más de 5 MB con un mensaje en español', () => {
    expect(validarArchivoGaleria(archivo('image/gif', 10, 'a.gif'))).toMatch(/JPG, PNG o WebP/);
    expect(validarArchivoGaleria(archivo('application/pdf', 10, 'a.pdf'))).toMatch(/JPG, PNG o WebP/);
    expect(validarArchivoGaleria(archivo('image/jpeg', 5 * 1024 * 1024 + 1, 'grande.jpg'))).toMatch(/5 MB/);
  });
});

describe('Solo fotos subidas desde el panel', () => {
  it('la firma se pide a POST /api/galeria/firma, una por foto, con el public_id que genera el servidor', async () => {
    const firma = { uploadUrl: 'https://api.cloudinary.com/v1_1/x/image/upload', apiKey: 'k', signature: 'f', params: { public_id: 'galeria/panel_0123456789abcdef0123456789abcdef', timestamp: '1' } };
    post.mockResolvedValueOnce({ data: firma });
    expect(await pedirFirmaFotoGaleria(false)).toEqual(firma);
    expect(post.mock.calls[0][0]).toBe('/api/galeria/firma');
    expect(post.mock.calls[0][1]).toEqual({});
    post.mockResolvedValueOnce({ data: { ...firma, params: { ...firma.params, public_id: 'galeria/ilustrativas/panel_0123456789abcdef0123456789abcdef' } } });
    await pedirFirmaFotoGaleria(true);
    expect(post.mock.calls[1][1]).toEqual({ ilustrativa: true });
  });

  it('una firma sin public_id del panel se rechaza (no se sube nada)', async () => {
    post.mockResolvedValueOnce({ data: { uploadUrl: 'u', apiKey: 'k', signature: 'f', params: { folder: 'galeria' } } });
    await expect(pedirFirmaFotoGaleria(false)).rejects.toThrow();
  });

  it('el panel no ofrece registrar por URL ni usa la firma general de subidas', () => {
    const panel = readFileSync(join(__dirname, '..', 'components', 'galeria', 'PanelGaleria.tsx'), 'utf8');
    const formulario = readFileSync(join(__dirname, '..', 'components', 'galeria', 'FormularioFotoGaleria.tsx'), 'utf8');
    expect(panel).not.toContain("pedirFirmaSubida('galeria'");
    expect(panel).toContain('pedirFirmaFotoGaleria(');
    expect(panel).not.toMatch(/crearFoto\(\{\s*url/);
    for (const fuente of [panel, formulario]) expect(fuente).not.toMatch(/type="url"|URL de la imagen|Pega la URL/i);
  });
});
