import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DURACION_AVISO_MS, crearCentroAvisos, type DepsCentro, type NotificacionDeLista } from './centroAvisos';
import type { EstadoAvisos } from './avisosNotificaciones';

const n = (id: string, creadoEn: string, extra: Partial<NotificacionDeLista> = {}): NotificacionDeLista => ({
  id,
  titulo: `Título ${id}`,
  mensaje: `Mensaje ${id}`,
  urlAccion: `/cliente/servicios-citas/mis-citas/${id}`,
  creadoEn,
  leida: false,
  ...extra,
});

function montar(opciones: { noLeidas?: NotificacionDeLista[]; visible?: boolean; permiso?: EstadoAvisos; sesion?: boolean } = {}) {
  let noLeidas = opciones.noLeidas ?? [];
  const canal = { visible: opciones.visible ?? true, permiso: opciones.permiso ?? ('sin_pedir' as EstadoAvisos) };
  const nativas: { titulo: string; opciones: NotificationOptions }[] = [];
  const deps = {
    rutaRespaldo: '/cliente/notificaciones',
    haySesion: vi.fn(() => opciones.sesion ?? true),
    listarNoLeidas: vi.fn(async () => noLeidas),
    marcarLeida: vi.fn(async (id: string) => {
      noLeidas = noLeidas.filter((x) => x.id !== id);
    }),
    marcarTodas: vi.fn(async () => {
      noLeidas = [];
    }),
    canalNativo: vi.fn(() => canal),
    crearNativa: vi.fn((titulo: string, o: NotificationOptions) => {
      nativas.push({ titulo, opciones: o });
      return { onclick: null, close: vi.fn() };
    }),
    alFallarNativa: vi.fn(),
    enfocar: vi.fn(),
    navegar: vi.fn(),
    alError: vi.fn(),
  } satisfies DepsCentro;
  const centro = crearCentroAvisos(deps);
  return {
    centro,
    deps,
    canal,
    nativas,
    llegan: (...nuevas: NotificacionDeLista[]) => {
      noLeidas = [...nuevas, ...noLeidas];
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Capa 1: contador y lista de la campana', () => {
  it('el contador sale de GET /api/notificaciones?leida=false: lo que llegó sin estar en el sitio sigue sin leer', async () => {
    const { centro, deps } = montar({ noLeidas: [n('a', '2026-10-01T10:00:00Z'), n('b', '2026-10-03T10:00:00Z')] });
    await centro.cargar();
    expect(deps.listarNoLeidas).toHaveBeenCalledTimes(1);
    expect(centro.obtener().noLeidas).toBe(2);
  });

  it('la lista va de la más reciente a la más antigua', async () => {
    const { centro } = montar({
      noLeidas: [n('a', '2026-10-01T10:00:00Z'), n('c', '2026-10-03T10:00:00Z'), n('b', '2026-10-02T10:00:00Z')],
    });
    await centro.cargar();
    expect(centro.obtener().lista.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('las que ya estaban al cargar no salen como aviso flotante', async () => {
    const { centro } = montar({ noLeidas: [n('a', '2026-10-01T10:00:00Z')] });
    await centro.cargar();
    expect(centro.obtener().avisos).toEqual([]);
  });

  it('sin sesión: contador en 0 y no consulta', async () => {
    const { centro, deps } = montar({ sesion: false, noLeidas: [n('a', '2026-10-01T10:00:00Z')] });
    await centro.cargar();
    expect(centro.obtener().noLeidas).toBe(0);
    expect(deps.listarNoLeidas).not.toHaveBeenCalled();
  });

  it('avisa a quien se suscribe cuando cambia el estado', async () => {
    const { centro } = montar({ noLeidas: [n('a', '2026-10-01T10:00:00Z')] });
    const oyente = vi.fn();
    const quitar = centro.suscribir(oyente);
    await centro.cargar();
    expect(oyente).toHaveBeenCalled();
    quitar();
    oyente.mockClear();
    await centro.alNotificacion(n('z', '2026-10-05T10:00:00Z'));
    expect(oyente).not.toHaveBeenCalled();
  });
});

describe('Capa 1: aviso flotante al llegar una notificación', () => {
  it('aparece con título, mensaje y su ruta interna; el contador sube', async () => {
    const { centro, llegan } = montar();
    await centro.cargar();
    const nueva = n('x', '2026-10-05T10:00:00Z');
    llegan(nueva);
    await centro.alNotificacion(nueva);
    expect(centro.obtener().avisos).toEqual([
      expect.objectContaining({ id: 'x', titulo: 'Título x', mensaje: 'Mensaje x', ruta: '/cliente/servicios-citas/mis-citas/x' }),
    ]);
    expect(centro.obtener().noLeidas).toBe(1);
  });

  it(`se cierra solo a los ${DURACION_AVISO_MS / 1000} segundos`, async () => {
    expect(DURACION_AVISO_MS).toBe(6000);
    const { centro } = montar();
    await centro.alNotificacion(n('x', '2026-10-05T10:00:00Z'));
    vi.advanceTimersByTime(DURACION_AVISO_MS - 1);
    expect(centro.obtener().avisos).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(centro.obtener().avisos).toHaveLength(0);
  });

  it('se cierra antes con "Cerrar aviso"', async () => {
    const { centro } = montar();
    await centro.alNotificacion(n('x', '2026-10-05T10:00:00Z'));
    const [aviso] = centro.obtener().avisos;
    centro.cerrarAviso(aviso.clave);
    expect(centro.obtener().avisos).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('abrir el aviso: va a su ruta, lo marca como leído y lo cierra', async () => {
    const { centro, deps, llegan } = montar();
    const nueva = n('x', '2026-10-05T10:00:00Z');
    llegan(nueva);
    await centro.alNotificacion(nueva);
    await centro.abrirAviso(centro.obtener().avisos[0].clave);
    expect(deps.navegar).toHaveBeenCalledWith('/cliente/servicios-citas/mis-citas/x');
    expect(deps.marcarLeida).toHaveBeenCalledWith('x');
    expect(centro.obtener().avisos).toHaveLength(0);
    expect(centro.obtener().noLeidas).toBe(0);
  });

  it('fijarNavegacion: el router que llega después reemplaza al de la creación', async () => {
    const { centro, deps } = montar();
    const push = vi.fn();
    centro.fijarNavegacion(push);
    await centro.alNotificacion(n('x', '2026-10-05T10:00:00Z'));
    await centro.abrirAviso(centro.obtener().avisos[0].clave);
    expect(push).toHaveBeenCalledWith('/cliente/servicios-citas/mis-citas/x');
    expect(deps.navegar).not.toHaveBeenCalled();
  });

  it('la misma notificación dos veces (SSE y consulta de respaldo) se anuncia una sola vez', async () => {
    const { centro, llegan } = montar();
    await centro.cargar();
    const nueva = n('x', '2026-10-05T10:00:00Z');
    llegan(nueva);
    await centro.alNotificacion(nueva);
    await centro.alNotificacion(nueva);
    await centro.cargar(true);
    expect(centro.obtener().avisos).toHaveLength(1);
  });

  it('la consulta de respaldo anuncia las nuevas (máximo 3 de golpe)', async () => {
    const { centro, llegan } = montar();
    await centro.cargar();
    llegan(...['1', '2', '3', '4', '5'].map((id) => n(id, `2026-10-0${id}T10:00:00Z`)));
    await centro.cargar(true);
    expect(centro.obtener().avisos).toHaveLength(3);
    expect(centro.obtener().noLeidas).toBe(5);
  });

  it('evento sin datos legibles: solo refresca el contador', async () => {
    const { centro, llegan, deps } = montar();
    llegan(n('x', '2026-10-05T10:00:00Z'));
    await centro.alNotificacion(null);
    expect(centro.obtener().avisos).toHaveLength(0);
    expect(deps.listarNoLeidas).toHaveBeenCalled();
    expect(centro.obtener().noLeidas).toBe(1);
  });
});

describe('Capa 1: marcar como leído', () => {
  it('uno: sale de la lista y baja el contador (PUT con leida=true)', async () => {
    const { centro, deps } = montar({ noLeidas: [n('a', '2026-10-01T10:00:00Z'), n('b', '2026-10-02T10:00:00Z')] });
    await centro.cargar();
    await centro.marcarLeida('a');
    expect(deps.marcarLeida).toHaveBeenCalledWith('a');
    expect(centro.obtener().lista.map((x) => x.id)).toEqual(['b']);
    expect(centro.obtener().noLeidas).toBe(1);
  });

  it('todos: una sola llamada, lista vacía y contador en 0', async () => {
    const { centro, deps } = montar({ noLeidas: [n('a', '2026-10-01T10:00:00Z'), n('b', '2026-10-02T10:00:00Z')] });
    await centro.cargar();
    await centro.marcarTodas();
    expect(deps.marcarTodas).toHaveBeenCalledTimes(1);
    expect(deps.marcarLeida).not.toHaveBeenCalled();
    expect(centro.obtener()).toMatchObject({ noLeidas: 0, lista: [] });
  });

  it('si falla, avisa y vuelve a cargar lo que dice el servidor', async () => {
    const { centro, deps } = montar({ noLeidas: [n('a', '2026-10-01T10:00:00Z')] });
    await centro.cargar();
    deps.marcarLeida.mockRejectedValueOnce(new Error('sin red'));
    await centro.marcarLeida('a');
    expect(deps.alError).toHaveBeenCalledWith('No se pudo marcar como leído. Intenta de nuevo.');
    expect(centro.obtener().noLeidas).toBe(1);

    deps.marcarTodas.mockRejectedValueOnce(new Error('sin red'));
    await centro.marcarTodas();
    expect(deps.alError).toHaveBeenCalledTimes(2);
    expect(centro.obtener().noLeidas).toBe(1);
  });
});

describe('Capa 2: notificación del navegador como extra', () => {
  it('pestaña oculta y permiso concedido: nativa y aviso interno', async () => {
    const { centro, nativas } = montar({ visible: false, permiso: 'activados' });
    await centro.alNotificacion(n('x', '2026-10-05T10:00:00Z'));
    expect(nativas).toEqual([{ titulo: 'Título x', opciones: { body: 'Mensaje x', tag: 'x' } }]);
    expect(centro.obtener().avisos).toHaveLength(1);
  });

  it('pestaña visible: sin nativa', async () => {
    const { centro, nativas } = montar({ visible: true, permiso: 'activados' });
    await centro.alNotificacion(n('x', '2026-10-05T10:00:00Z'));
    expect(nativas).toEqual([]);
  });

  it('sin soporte (Android, iPhone, sin Notification): no la intenta y el aviso interno sí aparece', async () => {
    const { centro, deps } = montar({ visible: false, permiso: 'no_soportado' });
    await centro.alNotificacion(n('x', '2026-10-05T10:00:00Z'));
    expect(deps.crearNativa).not.toHaveBeenCalled();
    expect(centro.obtener().avisos).toHaveLength(1);
  });

  it('si el constructor lanza: no rompe, lo recuerda, no vuelve a intentarlo y no escribe en la consola', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { centro, deps } = montar({ visible: false, permiso: 'activados' });
    deps.crearNativa.mockImplementation(() => {
      throw new TypeError("Failed to construct 'Notification': Illegal constructor.");
    });
    await expect(centro.alNotificacion(n('x', '2026-10-05T10:00:00Z'))).resolves.toBeUndefined();
    await centro.alNotificacion(n('y', '2026-10-05T11:00:00Z'));
    expect(deps.crearNativa).toHaveBeenCalledTimes(1);
    expect(deps.alFallarNativa).toHaveBeenCalledTimes(1);
    expect(centro.obtener().avisos.map((a) => a.id)).toEqual(['x', 'y']);
    expect(consola).not.toHaveBeenCalled();
    expect(aviso).not.toHaveBeenCalled();
    consola.mockRestore();
    aviso.mockRestore();
  });
});

describe('detener', () => {
  it('cancela los temporizadores de los avisos flotantes', async () => {
    const { centro } = montar();
    await centro.alNotificacion(n('x', '2026-10-05T10:00:00Z'));
    expect(vi.getTimerCount()).toBe(1);
    centro.detener();
    expect(vi.getTimerCount()).toBe(0);
  });
});
