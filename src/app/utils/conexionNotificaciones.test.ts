import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ErrorAutenticacionSse,
  FALLOS_PARA_SONDEO,
  INTERVALO_SONDEO_MS,
  MAX_REINTENTOS,
  crearConexionNotificaciones,
  esperaReconexion,
  opcionesFlujoNotificaciones,
  type ManejadoresFlujo,
} from './conexionNotificaciones';

/** Conexión simulada: cada llamada a `abrir` queda pendiente hasta que la prueba la abre, la corta o la falla. */
function simulador() {
  const intentos: { manejadores: ManejadoresFlujo; signal: AbortSignal; fallar: (e: unknown) => void; cerrar: () => void }[] = [];
  const abrir = vi.fn(
    (manejadores: ManejadoresFlujo, signal: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        intentos.push({ manejadores, signal, fallar: reject, cerrar: resolve });
      }),
  );
  return { abrir, intentos };
}



function montar(opciones: { refresco?: boolean } = {}) {
  const { abrir, intentos } = simulador();
  const alNotificacion = vi.fn();
  const sondear = vi.fn();
  const refrescarSesion = vi.fn(async () => opciones.refresco ?? true);
  const conexion = crearConexionNotificaciones({ abrir, haySesion: () => true, refrescarSesion, alNotificacion, sondear });
  return { conexion, abrir, intentos, alNotificacion, sondear, refrescarSesion };
}

describe('esperaReconexion: espera creciente y acotada', () => {
  it('1 s, 2 s, 4 s... hasta 30 s', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(esperaReconexion)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
  });
});

describe('opcionesFlujoNotificaciones (fetch-event-source)', () => {
  it('sigue conectado con la pestaña en segundo plano y manda la cookie de sesión', () => {
    const op = opcionesFlujoNotificaciones({ alAbrir: vi.fn(), alMensaje: vi.fn() }, new AbortController().signal);
    expect(op.openWhenHidden).toBe(true);
    expect(op.credentials).toBe('include');
  });

  it('401 al abrir es error de sesión; otro estado o tipo de contenido es error de red', async () => {
    const op = opcionesFlujoNotificaciones({ alAbrir: vi.fn(), alMensaje: vi.fn() }, new AbortController().signal);
    await expect(op.onopen!(new Response('', { status: 401 }))).rejects.toBeInstanceOf(ErrorAutenticacionSse);
    await expect(op.onopen!(new Response('', { status: 502 }))).rejects.toThrow('HTTP 502');
    await expect(op.onopen!(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }))).rejects.toThrow();
  });

  it('abierta: avisa y pasa cada evento con su nombre; onerror relanza (el reintento lo decide la conexión)', async () => {
    const alAbrir = vi.fn();
    const alMensaje = vi.fn();
    const op = opcionesFlujoNotificaciones({ alAbrir, alMensaje }, new AbortController().signal);
    await op.onopen!(new Response('', { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    expect(alAbrir).toHaveBeenCalled();
    op.onmessage!({ event: 'notificacion', data: '{"id":"n-1"}', id: '0', retry: undefined });
    expect(alMensaje).toHaveBeenCalledWith('notificacion', '{"id":"n-1"}');
    expect(() => op.onerror!(new Error('corte'))).toThrow('corte');
  });
});

describe('crearConexionNotificaciones', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('cada evento "notificacion" llega leído; el latido keep-alive se ignora', async () => {
    const { conexion, intentos, alNotificacion } = montar();
    conexion.iniciar();
    intentos[0].manejadores.alAbrir();
    intentos[0].manejadores.alMensaje('keep-alive', '');
    intentos[0].manejadores.alMensaje('notificacion', JSON.stringify({ id: 'n-1', titulo: 'Hola', mensaje: 'm', urlAccion: '/x' }));
    expect(alNotificacion).toHaveBeenCalledTimes(1);
    expect(alNotificacion).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-1', titulo: 'Hola' }));
    conexion.detener();
  });

  it('se reconecta sola con espera creciente', async () => {
    const { conexion, abrir, intentos } = montar();
    conexion.iniciar();
    intentos[0].fallar(new Error('red'));
    await vi.advanceTimersByTimeAsync(999);
    expect(abrir).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(abrir).toHaveBeenCalledTimes(2);
    intentos[1].fallar(new Error('red'));
    await vi.advanceTimersByTimeAsync(1999);
    expect(abrir).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(abrir).toHaveBeenCalledTimes(3);
    conexion.detener();
  });

  it('si el servidor cierra el flujo, también reconecta', async () => {
    const { conexion, abrir, intentos } = montar();
    conexion.iniciar();
    intentos[0].manejadores.alAbrir();
    intentos[0].cerrar();
    await vi.advanceTimersByTimeAsync(1000);
    expect(abrir).toHaveBeenCalledTimes(2);
    conexion.detener();
  });

  it(`tras ${FALLOS_PARA_SONDEO} fallos seguidos consulta cada 60 s el endpoint REST; al reconectar deja de consultar`, async () => {
    const { conexion, intentos, sondear } = montar();
    conexion.iniciar();
    for (let i = 0; i < FALLOS_PARA_SONDEO; i += 1) {
      intentos[i].fallar(new Error('red'));
      await vi.advanceTimersByTimeAsync(esperaReconexion(i + 1));
    }
    expect(sondear).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(INTERVALO_SONDEO_MS);
    expect(sondear).toHaveBeenCalled();
    const llamadas = sondear.mock.calls.length;
    intentos[intentos.length - 1].manejadores.alAbrir();
    await vi.advanceTimersByTimeAsync(INTERVALO_SONDEO_MS * 3);
    expect(sondear).toHaveBeenCalledTimes(llamadas);
    conexion.detener();
  });

  it(`agotados ${MAX_REINTENTOS} reintentos deja de reconectar pero sigue consultando cada 60 s; "reintentar" vuelve a abrir`, async () => {
    const { conexion, abrir, intentos, sondear } = montar();
    conexion.iniciar();
    for (let i = 0; i <= MAX_REINTENTOS; i += 1) {
      intentos[i].fallar(new Error('red'));
      await vi.advanceTimersByTimeAsync(esperaReconexion(i + 1));
    }
    const abiertas = abrir.mock.calls.length;
    expect(abiertas).toBe(MAX_REINTENTOS + 1);
    sondear.mockClear();
    await vi.advanceTimersByTimeAsync(INTERVALO_SONDEO_MS * 2);
    expect(abrir).toHaveBeenCalledTimes(abiertas);
    expect(sondear).toHaveBeenCalledTimes(2);
    conexion.reintentar();
    expect(abrir).toHaveBeenCalledTimes(abiertas + 1);
    conexion.detener();
  });

  it('401: refresca la sesión una vez y reabre; si sigue en 401, pasa a consultar cada 60 s', async () => {
    const { conexion, abrir, intentos, refrescarSesion, sondear } = montar();
    conexion.iniciar();
    intentos[0].fallar(new ErrorAutenticacionSse('401'));
    await vi.advanceTimersByTimeAsync(0);
    expect(refrescarSesion).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledTimes(2);
    intentos[1].fallar(new ErrorAutenticacionSse('401'));
    await vi.advanceTimersByTimeAsync(0);
    expect(refrescarSesion).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(INTERVALO_SONDEO_MS);
    expect(sondear).toHaveBeenCalledTimes(1);
    conexion.detener();
  });

  it('detener corta la conexión, los reintentos y la consulta', async () => {
    const { conexion, abrir, intentos, sondear } = montar();
    conexion.iniciar();
    for (let i = 0; i < FALLOS_PARA_SONDEO; i += 1) {
      intentos[i].fallar(new Error('red'));
      await vi.advanceTimersByTimeAsync(esperaReconexion(i + 1));
    }
    const ultima = intentos[intentos.length - 1];
    conexion.detener();
    expect(ultima.signal.aborted).toBe(true);
    const abiertas = abrir.mock.calls.length;
    sondear.mockClear();
    await vi.advanceTimersByTimeAsync(INTERVALO_SONDEO_MS * 3);
    expect(abrir).toHaveBeenCalledTimes(abiertas);
    expect(sondear).not.toHaveBeenCalled();
  });

  it('sin sesión no abre nada', () => {
    const { abrir } = simulador();
    const conexion = crearConexionNotificaciones({ abrir, haySesion: () => false, refrescarSesion: vi.fn(), alNotificacion: vi.fn(), sondear: vi.fn() });
    conexion.iniciar();
    expect(abrir).not.toHaveBeenCalled();
  });
});


