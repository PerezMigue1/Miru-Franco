import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('../services/client', () => ({ apiClient: { post: (...a: unknown[]) => post(...a) } }));
vi.mock('../services/config', () => ({ getBackendBaseUrl: () => 'https://api.ejemplo.test' }));

import {
  subirFirmado,
  subirFotoPerfilCloudinary,
  subirFotoUsuarioCloudinary,
  subirImagenesCloudinary,
  subirPdfCloudinary,
} from './cloudinary';

const UPLOAD_URL = 'https://api.cloudinary.com/v1_1/nube/image/upload';

function firma(params: Record<string, string>) {
  return { success: true, data: { uploadUrl: UPLOAD_URL, apiKey: '123', params, signature: 'f1rma' } };
}

const PARAMS_GALERIA = { allowed_formats: 'jpg,jpeg,png,webp,gif,avif,heic,heif', folder: 'galeria', timestamp: '1791374400' };
const PARAMS_PERFIL = {
  allowed_formats: 'jpg,jpeg,png,webp,gif,avif,heic',
  folder: 'avatares',
  invalidate: 'true',
  overwrite: 'true',
  public_id: 'usuario_u1',
  timestamp: '1791374400',
  transformation: 'c_limit,w_1024,h_1024',
};
const PARAMS_FACTURA = { allowed_formats: 'pdf', folder: 'facturas', timestamp: '1791374400' };

const fetchMock = vi.fn();
const imagen = (nombre = 'a.jpg') => new File([new Uint8Array([1, 2, 3])], nombre, { type: 'image/jpeg' });
const pdf = () => new File([new Uint8Array([37, 80, 68, 70])], 'cfdi.pdf', { type: 'application/pdf' });

/** Lo que llegó a Cloudinary en la llamada `i` de fetch. */
function enviado(i = 0): { url: string; datos: FormData } {
  const [url, init] = fetchMock.mock.calls[i];
  return { url, datos: init.body as FormData };
}

beforeEach(() => {
  post.mockReset();
  fetchMock.mockReset().mockImplementation(async () =>
    new Response(JSON.stringify({ secure_url: `https://res.cloudinary.com/nube/image/upload/v1/x${fetchMock.mock.calls.length}.jpg` }), {
      status: 200,
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('subirFirmado', () => {
  it('pide la firma de galería al backend y manda a Cloudinary file, api_key, signature y los params tal cual', async () => {
    post.mockResolvedValue(firma(PARAMS_GALERIA));
    const url = await subirFirmado(imagen(), 'galeria');

    expect(post).toHaveBeenCalledWith('/api/subidas/firma', { uso: 'galeria' }, 'https://api.ejemplo.test');
    const { url: destino, datos } = enviado();
    expect(destino).toBe(UPLOAD_URL);
    expect(datos.get('upload_preset')).toBeNull();
    expect(datos.get('api_key')).toBe('123');
    expect(datos.get('signature')).toBe('f1rma');
    expect(datos.get('timestamp')).toBe('1791374400');
    expect(datos.get('folder')).toBe('galeria');
    expect(datos.get('allowed_formats')).toBe('jpg,jpeg,png,webp,gif,avif,heic,heif');
    expect(datos.get('file')).toBeInstanceOf(File);
    expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\/nube\/image\/upload\//);
  });

  it('si Cloudinary rechaza, muestra un mensaje amable y deja el detalle en la consola', async () => {
    post.mockResolvedValue(firma(PARAMS_GALERIA));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid Signature 0123. String to sign - ...' } }), { status: 401 }),
    );
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const error = await subirFirmado(imagen(), 'galeria').catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain('Signature');
    expect((error as Error).message).toMatch(/No se pudo subir/);
    expect(JSON.stringify(consola.mock.calls)).toContain('Invalid Signature');
  });
});

describe('subirImagenesCloudinary (lotes)', () => {
  it('pide una sola firma de galería para todo el lote', async () => {
    post.mockResolvedValue(firma(PARAMS_GALERIA));
    const urls = await subirImagenesCloudinary([imagen('a.jpg'), imagen('b.jpg'), imagen('c.jpg')]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/api/subidas/firma', { uso: 'galeria' }, 'https://api.ejemplo.test');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(urls).toHaveLength(3);
    for (let i = 0; i < 3; i++) expect(enviado(i).datos.get('upload_preset')).toBeNull();
  });

  it('un lote vacío no pide firma', async () => {
    expect(await subirImagenesCloudinary([])).toEqual([]);
    expect(post).not.toHaveBeenCalled();
  });
});

describe('foto de perfil propia y foto de otra persona', () => {
  it('la foto propia usa la firma de perfil (POST /api/auth/me/foto/firma)', async () => {
    post.mockResolvedValue(firma(PARAMS_PERFIL));
    await subirFotoPerfilCloudinary(imagen());

    expect(post).toHaveBeenCalledWith('/api/auth/me/foto/firma', undefined, 'https://api.ejemplo.test');
    const { datos } = enviado();
    expect(datos.get('public_id')).toBe('usuario_u1');
    expect(datos.get('folder')).toBe('avatares');
    expect(datos.get('upload_preset')).toBeNull();
  });

  it('la foto de otra persona (admin) usa galería, nunca la firma de perfil del admin', async () => {
    post.mockResolvedValue(firma(PARAMS_GALERIA));
    await subirFotoUsuarioCloudinary(imagen());

    expect(post).toHaveBeenCalledWith('/api/subidas/firma', { uso: 'galeria' }, 'https://api.ejemplo.test');
    expect(post).not.toHaveBeenCalledWith('/api/auth/me/foto/firma', expect.anything(), expect.anything());
    expect(enviado().datos.get('public_id')).toBeNull();
  });
});

describe('subirPdfCloudinary', () => {
  it('usa la firma de factura y no manda preset', async () => {
    post.mockResolvedValue(firma(PARAMS_FACTURA));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/nube/image/upload/v1/facturas/x.pdf' }), { status: 200 }),
    );
    const url = await subirPdfCloudinary(pdf());

    expect(post).toHaveBeenCalledWith('/api/subidas/firma', { uso: 'factura' }, 'https://api.ejemplo.test');
    const { datos } = enviado();
    expect(datos.get('upload_preset')).toBeNull();
    expect(datos.get('folder')).toBe('facturas');
    expect(datos.get('signature')).toBe('f1rma');
    expect(url).toBe('https://res.cloudinary.com/nube/image/upload/v1/facturas/x.pdf');
  });

  it('rechaza lo que no sea PDF sin pedir firma', async () => {
    await expect(subirPdfCloudinary(imagen())).rejects.toThrow('El archivo debe ser un PDF.');
    expect(post).not.toHaveBeenCalled();
  });
});
