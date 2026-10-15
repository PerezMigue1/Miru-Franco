import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post, patch } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(),
  post: vi.fn<(ruta: string, body?: unknown, base?: unknown) => Promise<unknown>>(),
  patch: vi.fn<(ruta: string, body?: unknown, base?: string, opciones?: unknown) => Promise<unknown>>(),
}));
vi.mock('./client', () => ({ apiClient: { get, post, patch } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  archivoMisDatos,
  crearSolicitudArco,
  ejecutarCancelacionArco,
  listarSolicitudesArco,
  misSolicitudesArco,
  obtenerMisDatos,
  oponerseAPromociones,
  responderSolicitudArco,
} from './arco';

afterEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
});

describe('ARCO de la titular: solicitudes, mis datos y oposición', () => {
  it('crear una solicitud hace POST /api/arco/solicitudes solo con tipo y descripción recortada', async () => {
    post.mockResolvedValueOnce({ success: true, data: { id: 1, folio: 'ARCO-2026-000001', estado: 'recibida' } });
    const solicitud = await crearSolicitudArco({ tipo: 'rectificacion', descripcion: '  Mi teléfono correcto es 7711234567  ' });
    expect(solicitud).toMatchObject({ folio: 'ARCO-2026-000001', estado: 'recibida' });
    const [ruta, cuerpo, opciones] = post.mock.calls[0];
    expect(ruta).toBe('/api/arco/solicitudes');
    expect(cuerpo).toEqual({ tipo: 'rectificacion', descripcion: 'Mi teléfono correcto es 7711234567' });
    expect(opciones).toMatchObject({ customBase: 'http://api.test', skip403Redirect: true });
  });

  it('sin descripción no manda el campo (el backend rechaza campos de más o vacíos)', async () => {
    post.mockResolvedValueOnce({ success: true, data: { id: 2 } });
    await crearSolicitudArco({ tipo: 'cancelacion', descripcion: '   ' });
    expect(post.mock.calls[0][1]).toEqual({ tipo: 'cancelacion' });
  });

  it('mis solicitudes lee GET /api/arco/mias y devuelve la lista', async () => {
    get.mockResolvedValueOnce({ success: true, data: [{ id: 3, folio: 'ARCO-2026-000003' }] });
    expect(await misSolicitudesArco()).toEqual([{ id: 3, folio: 'ARCO-2026-000003' }]);
    expect(get.mock.calls[0][0]).toBe('/api/arco/mias');
  });

  it('mis datos lee GET /api/arco/mis-datos y devuelve el objeto completo', async () => {
    const datos = { generadoEn: '2026-10-14T18:00:00.000Z', perfil: { id: 'u-1', nombre: 'Ana' }, pedidos: [] };
    get.mockResolvedValueOnce({ success: true, data: datos });
    expect(await obtenerMisDatos()).toEqual(datos);
    expect(get.mock.calls[0][0]).toBe('/api/arco/mis-datos');
  });

  it('mis datos sin cuerpo válido es un error claro, no un archivo vacío', async () => {
    get.mockResolvedValueOnce({ success: true });
    await expect(obtenerMisDatos()).rejects.toThrow('No pudimos leer tus datos');
  });

  it('el archivo JSON descargable lleva todos los datos y el día de México en el nombre', () => {
    const datos = { generadoEn: '2026-10-15T03:00:00.000Z', perfil: { id: 'u-1', nombre: 'Ana' } };
    const archivo = archivoMisDatos(datos);
    // 03:00 UTC del 15 es todavía el 14 en México
    expect(archivo.nombre).toBe('mis-datos-miru-franco-2026-10-14.json');
    expect(archivo.tipo).toBe('application/json');
    expect(JSON.parse(archivo.contenido)).toEqual(datos);
  });

  it('oponerse a promociones hace POST /api/arco/oposicion con la finalidad', async () => {
    post.mockResolvedValueOnce({ success: true, data: { tipo: 'oposicion', estado: 'atendida' } });
    expect(await oponerseAPromociones()).toMatchObject({ estado: 'atendida' });
    expect(post.mock.calls[0][0]).toBe('/api/arco/oposicion');
    expect(post.mock.calls[0][1]).toEqual({ finalidad: 'promociones' });
  });
});

describe('ARCO del panel: bandeja, respuesta y cancelación', () => {
  it('la bandeja lee GET /api/arco/solicitudes con los filtros en la URL', async () => {
    get.mockResolvedValueOnce({ success: true, data: [{ id: 9 }], total: 21, page: 2, limit: 20, totalPages: 2 });
    const res = await listarSolicitudesArco({ estado: 'recibida', vencidas: true, page: 2 });
    expect(get.mock.calls[0][0]).toBe('/api/arco/solicitudes?estado=recibida&vencidas=true&page=2&limit=20');
    expect(get.mock.calls[0][1]).toMatchObject({ customBase: 'http://api.test', skip403Redirect: true });
    expect(res).toEqual({ filas: [{ id: 9 }], total: 21, page: 2, totalPages: 2 });
  });

  it('sin filtros solo pide la página', async () => {
    get.mockResolvedValueOnce({ success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await listarSolicitudesArco({});
    expect(get.mock.calls[0][0]).toBe('/api/arco/solicitudes?page=1&limit=20');
  });

  it('responder hace PATCH /api/arco/solicitudes/:id con estado y respuesta recortada', async () => {
    patch.mockResolvedValueOnce({ success: true, data: { id: 5, estado: 'respondida' } });
    await responderSolicitudArco(5, { estado: 'respondida', respuesta: '  Procede, corregimos tu teléfono.  ' });
    const [ruta, cuerpo, base, opciones] = patch.mock.calls[0];
    expect(ruta).toBe('/api/arco/solicitudes/5');
    expect(cuerpo).toEqual({ estado: 'respondida', respuesta: 'Procede, corregimos tu teléfono.' });
    expect(base).toBe('http://api.test');
    expect(opciones).toMatchObject({ skip403Redirect: true });
  });

  it('respondida o rechazada sin respuesta no llega al servidor', async () => {
    await expect(responderSolicitudArco(5, { estado: 'rechazada', respuesta: '   ' })).rejects.toThrow(
      'Escribe la respuesta para la titular.',
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it('atender una revocación manda en revocar los consentimientos elegidos', async () => {
    patch.mockResolvedValueOnce({ success: true, data: { id: 6, estado: 'atendida' } });
    await responderSolicitudArco(6, { estado: 'atendida', respuesta: 'Revocamos lo que pediste.', revocar: ['datos_salud', 'fotos_resultado'] });
    expect(patch.mock.calls[0][1]).toEqual({
      estado: 'atendida',
      respuesta: 'Revocamos lo que pediste.',
      revocar: ['datos_salud', 'fotos_resultado'],
    });
  });

  it('sin consentimientos elegidos no manda revocar (el backend lo rechaza vacío)', async () => {
    patch.mockResolvedValueOnce({ success: true, data: { id: 6, estado: 'en_proceso' } });
    await responderSolicitudArco(6, { estado: 'en_proceso', revocar: [] });
    expect(patch.mock.calls[0][1]).toEqual({ estado: 'en_proceso' });
  });

  it('pasar a en proceso no exige respuesta ni la manda vacía', async () => {
    patch.mockResolvedValueOnce({ success: true, data: { id: 5, estado: 'en_proceso' } });
    await responderSolicitudArco(5, { estado: 'en_proceso', respuesta: '' });
    expect(patch.mock.calls[0][1]).toEqual({ estado: 'en_proceso' });
  });

  it('ejecutar la cancelación hace POST sin cuerpo a /ejecutar-cancelacion', async () => {
    post.mockResolvedValueOnce({ success: true, message: 'Cuenta anonimizada y solicitud atendida.' });
    expect(await ejecutarCancelacionArco(7)).toEqual({ mensaje: 'Cuenta anonimizada y solicitud atendida.', correoEnviado: undefined });
    const [ruta, cuerpo, opciones] = post.mock.calls[0];
    expect(ruta).toBe('/api/arco/solicitudes/7/ejecutar-cancelacion');
    expect(cuerpo).toBeUndefined();
    expect(opciones).toMatchObject({ customBase: 'http://api.test', skip403Redirect: true, skip500Redirect: true });
  });

  it('responder devuelve la solicitud y correoEnviado del nivel superior de la respuesta', async () => {
    patch.mockResolvedValueOnce({ success: true, data: { id: 5, estado: 'respondida' }, correoEnviado: false });
    const r = await responderSolicitudArco(5, { estado: 'respondida', respuesta: 'x' });
    expect(r.correoEnviado).toBe(false);
    expect(r.solicitud).toMatchObject({ id: 5, estado: 'respondida' });
  });

  it('responder sin correoEnviado en la respuesta (en proceso) lo deja sin definir', async () => {
    patch.mockResolvedValueOnce({ success: true, data: { id: 5, estado: 'en_proceso' } });
    expect((await responderSolicitudArco(5, { estado: 'en_proceso' })).correoEnviado).toBeUndefined();
  });

  it('ejecutar la cancelación devuelve data.correoEnviado', async () => {
    post.mockResolvedValueOnce({ success: true, message: 'Listo.', data: { correoEnviado: false } });
    expect(await ejecutarCancelacionArco(7)).toEqual({ mensaje: 'Listo.', correoEnviado: false });
  });
});
