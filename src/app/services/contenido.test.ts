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
  actualizarPerfilPublico,
  actualizarPregunta,
  actualizarPromocion,
  crearPregunta,
  crearPromocion,
  eliminarPregunta,
  eliminarPromocion,
  listarEquipoAdmin,
  listarEquipoPublico,
  listarPreguntasAdmin,
  listarPreguntasFrecuentes,
  listarPromocionesActivas,
  listarPromocionesAdmin,
  ordenarEquipo,
  ordenarPreguntas,
  ordenarPromociones,
} from './contenido';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const respuesta = (cuerpo: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => cuerpo, text: async () => JSON.stringify(cuerpo) }) as Response;

describe('Contenido público (componentes de servidor con revalidación corta)', () => {
  it.each([
    ['promociones', listarPromocionesActivas, '/api/contenido/promociones'],
    ['preguntas frecuentes', listarPreguntasFrecuentes, '/api/contenido/preguntas-frecuentes'],
    ['equipo', listarEquipoPublico, '/api/contenido/equipo'],
  ] as const)('%s: GET con revalidate 60 y nunca lanza', async (_n, leer, ruta) => {
    const fetchMock = vi.fn(async () => respuesta({ success: true, data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await leer()).toEqual({ data: [], error: null });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { next?: { revalidate?: number } }];
    expect(url).toBe(`http://api.test${ruta}`);
    expect(init.next?.revalidate).toBe(60);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const fallo = await leer();
    expect(fallo.data).toEqual([]);
    expect(fallo.error).toBeTruthy();
  });

  it('promociones: conserva los campos que muestra el sitio y descarta lo mal formado', async () => {
    const promo = { id: 1, titulo: 'Martes', descripcion: 'x', imagenUrl: null, enlace: '/cliente/tienda-online', vigenteDesde: '2026-10-01', vigenteHasta: null, destacada: true };
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ data: [promo, { id: 2 }] })));
    expect((await listarPromocionesActivas()).data).toEqual([promo]);
  });

  it('equipo: solo nombre, puesto, foto y presentación', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ data: [{ nombre: 'Eva', puesto: 'Estilista', foto: null, bio: 'Colorista', email: 'no@debe.salir' }] })));
    expect((await listarEquipoPublico()).data).toEqual([{ nombre: 'Eva', puesto: 'Estilista', foto: null, bio: 'Colorista' }]);
  });
});

describe('Admin > Contenido', () => {
  it('promociones: listar, crear, editar, ordenar y eliminar', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    expect(await listarPromocionesAdmin()).toEqual([{ id: 1 }]);
    expect(get.mock.calls[0][0]).toBe('/api/contenido/admin/promociones');
    expect(get.mock.calls[0][1]).toMatchObject({ customBase: 'http://api.test', skip403Redirect: true });
    post.mockResolvedValueOnce({ data: { id: 2 } });
    expect(await crearPromocion({ titulo: 'P', descripcion: 'D' })).toEqual({ id: 2 });
    expect(post.mock.calls[0][0]).toBe('/api/contenido/admin/promociones');
    patch.mockResolvedValueOnce({ data: { id: 2, activa: true } });
    await actualizarPromocion(2, { activa: true });
    expect(patch.mock.calls[0][0]).toBe('/api/contenido/admin/promociones/2');
    put.mockResolvedValueOnce({ success: true });
    await ordenarPromociones([2, 1]);
    expect(put.mock.calls[0]).toEqual(['/api/contenido/admin/promociones/orden', { ids: [2, 1] }, expect.anything()]);
    del.mockResolvedValueOnce({ success: true });
    await eliminarPromocion(2);
    expect(del.mock.calls[0][0]).toBe('/api/contenido/admin/promociones/2');
  });

  it('preguntas frecuentes y equipo usan sus rutas', async () => {
    get.mockResolvedValue({ data: [] });
    await listarPreguntasAdmin();
    await listarEquipoAdmin();
    expect(get.mock.calls.map((c) => c[0])).toEqual(['/api/contenido/admin/preguntas-frecuentes', '/api/contenido/admin/equipo']);
    post.mockResolvedValueOnce({ data: { id: 1 } });
    await crearPregunta({ pregunta: 'P', respuesta: 'R' });
    patch.mockResolvedValue({ data: { id: 1 } });
    await actualizarPregunta(1, { visible: false });
    await actualizarPerfilPublico(3, { mostrarEnSitio: true });
    expect(patch.mock.calls.map((c) => c[0])).toEqual(['/api/contenido/admin/preguntas-frecuentes/1', '/api/contenido/admin/equipo/3']);
    put.mockResolvedValue({ success: true });
    await ordenarPreguntas([1]);
    await ordenarEquipo([3]);
    expect(put.mock.calls.map((c) => c[0])).toEqual(['/api/contenido/admin/preguntas-frecuentes/orden', '/api/contenido/admin/equipo/orden']);
    del.mockResolvedValueOnce({ success: true });
    await eliminarPregunta(1);
    expect(del.mock.calls[0][0]).toBe('/api/contenido/admin/preguntas-frecuentes/1');
  });
});
