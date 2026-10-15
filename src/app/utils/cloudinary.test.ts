import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('../services/client', () => ({ apiClient: { post: (...a: unknown[]) => post(...a) } }));
vi.mock('../services/config', () => ({ getBackendBaseUrl: () => 'https://api.ejemplo.test' }));

import {
  subirFirmado,
  subirFotoPerfilCloudinary,
  subirImagenSegura,
  subirImagenesSeguras,
  subirPdfCloudinary,
  vistaPreviaDe,
} from './cloudinary';

const UPLOAD_URL = 'https://api.cloudinary.com/v1_1/nube/image/upload';

function firma(params: Record<string, string>) {
  return { success: true, data: { uploadUrl: UPLOAD_URL, apiKey: '123', params, signature: 'f1rma' } };
}

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

const panel = (uso: string, n: number, ilus = false) => `${uso}/${ilus ? 'ilustrativas/' : ''}panel_${String(n).padStart(32, '0')}`;
const PARAMS_PANEL = (publicId: string) => ({ allowed_formats: 'jpg,jpeg,png,webp', overwrite: 'false', public_id: publicId, timestamp: '1791374400' });

describe('subirFirmado', () => {
  it('pide la firma al backend y manda a Cloudinary file, api_key, signature y los params tal cual', async () => {
    post.mockResolvedValue(firma(PARAMS_PERFIL));
    const url = await subirFirmado(imagen(), 'perfil');

    expect(post).toHaveBeenCalledWith('/api/auth/me/foto/firma', undefined, 'https://api.ejemplo.test');
    const { url: destino, datos } = enviado();
    expect(destino).toBe(UPLOAD_URL);
    expect(datos.get('upload_preset')).toBeNull();
    expect(datos.get('api_key')).toBe('123');
    expect(datos.get('signature')).toBe('f1rma');
    expect(datos.get('timestamp')).toBe('1791374400');
    expect(datos.get('folder')).toBe('avatares');
    expect(datos.get('allowed_formats')).toBe('jpg,jpeg,png,webp,gif,avif,heic');
    expect(datos.get('file')).toBeInstanceOf(File);
    expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\/nube\/image\/upload\//);
  });

  it('si Cloudinary rechaza, muestra un mensaje amable y deja el detalle en la consola', async () => {
    post.mockResolvedValue(firma(PARAMS_PERFIL));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid Signature 0123. String to sign - ...' } }), { status: 401 }),
    );
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const error = await subirFirmado(imagen(), 'perfil').catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain('Signature');
    expect((error as Error).message).toMatch(/No se pudo subir/);
    expect(JSON.stringify(consola.mock.calls)).toContain('Invalid Signature');
  });
});

describe('Subida segura de imágenes de los formularios', () => {
  it.each(['servicios', 'productos', 'equipo', 'promociones', 'sitio', 'usuarios'] as const)(
    '%s: pide a POST /api/subidas/imagen/firma la firma de su carpeta, sube con los params tal cual y devuelve el public_id del servidor',
    async (uso) => {
      const id = panel(uso, 1);
      post.mockResolvedValueOnce(firma(PARAMS_PANEL(id)));
      const r = await subirImagenSegura(imagen(), uso);
      expect(post).toHaveBeenCalledWith('/api/subidas/imagen/firma', { uso }, 'https://api.ejemplo.test');
      expect(enviado().datos.get('public_id')).toBe(id);
      expect(enviado().datos.get('folder')).toBeNull();
      expect(r.publicId).toBe(id);
      expect(r.vistaPrevia).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    },
  );

  it('ilustrativa (servicios y sitio) pide la bandera; la vista previa del public_id queda disponible para el formulario', async () => {
    const id = panel('servicios', 2, true);
    post.mockResolvedValueOnce(firma(PARAMS_PANEL(id)));
    const r = await subirImagenSegura(imagen(), 'servicios', { ilustrativa: true });
    expect(post.mock.calls[0][1]).toEqual({ uso: 'servicios', ilustrativa: true });
    expect(vistaPreviaDe(id)).toBe(r.vistaPrevia);
  });

  it('una firma sin public_id de su carpeta (por ejemplo galeria/ o con folder) se rechaza sin subir nada', async () => {
    post.mockResolvedValueOnce(firma(PARAMS_PANEL(panel('galeria', 3))));
    await expect(subirImagenSegura(imagen(), 'servicios')).rejects.toThrow();
    post.mockResolvedValueOnce(firma({ folder: 'servicios', timestamp: '1' }));
    await expect(subirImagenSegura(imagen(), 'servicios')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('varias imágenes: una firma por archivo (cada una con su public_id)', async () => {
    post.mockResolvedValueOnce(firma(PARAMS_PANEL(panel('productos', 4)))).mockResolvedValueOnce(firma(PARAMS_PANEL(panel('productos', 5))));
    const r = await subirImagenesSeguras([imagen('a.jpg'), imagen('b.jpg')], 'productos');
    expect(post).toHaveBeenCalledTimes(2);
    expect(r.map((x) => x.publicId)).toEqual([panel('productos', 4), panel('productos', 5)]);
  });

  it('vistaPreviaDe: una URL guardada se muestra tal cual; un texto que no es URL ni subida conocida no se muestra', () => {
    expect(vistaPreviaDe('https://res.cloudinary.com/nube/image/upload/v1/servicios/a.jpg')).toBe('https://res.cloudinary.com/nube/image/upload/v1/servicios/a.jpg');
    expect(vistaPreviaDe(panel('equipo', 99))).toBeNull();
    expect(vistaPreviaDe('')).toBeNull();
  });
});

describe('foto de perfil propia', () => {
  it('la foto propia usa la firma de perfil (POST /api/auth/me/foto/firma)', async () => {
    post.mockResolvedValueOnce(firma(PARAMS_PERFIL));
    await subirFotoPerfilCloudinary(imagen());
    expect(post.mock.calls[0][0]).toBe('/api/auth/me/foto/firma');
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
