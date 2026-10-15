import type { FetchEventSourceInit } from '@microsoft/fetch-event-source';
import { leerNotificacionEnVivo, type NotificacionEnVivo } from './avisosNotificaciones';

/**
 * Conexión en vivo con GET /api/notificaciones/stream (SSE), sin depender de React para poder probarla con
 * temporizadores falsos. El hook useNotificacionesSSE solo la crea y la detiene.
 *
 * - Reconexión automática con espera creciente acotada: 1 s, 2 s, 4 s... hasta 30 s, máximo MAX_REINTENTOS
 *   seguidos. Un corte limpio del servidor (el flujo termina) cuenta igual que un error.
 * - Respaldo: desde FALLOS_PARA_SONDEO fallos seguidos (o si la sesión sigue en 401 tras refrescarla) se
 *   consulta cada 60 s el endpoint REST de notificaciones (`sondear`), hasta que el SSE vuelva a abrir.
 *   Agotados los reintentos se queda consultando; `reintentar()` (al volver la red) reabre el SSE.
 * - 401 al abrir: un solo refresco de sesión compartido y se reabre.
 */

export const ESPERA_BASE_MS = 1000;
export const ESPERA_MAX_MS = 30_000;
export const MAX_REINTENTOS = 8;
export const FALLOS_PARA_SONDEO = 3;
export const INTERVALO_SONDEO_MS = 60_000;
const MAX_REFRESCOS_SESION = 1;

/** El token que traíamos ya no sirve (401): se refresca la sesión antes de reabrir. */
export class ErrorAutenticacionSse extends Error {}

export function esperaReconexion(intento: number): number {
  return Math.min(ESPERA_BASE_MS * 2 ** (Math.max(intento, 1) - 1), ESPERA_MAX_MS);
}

export interface ManejadoresFlujo {
  alAbrir: () => void;
  alMensaje: (evento: string, data: string) => void;
}

/**
 * Opciones de fetchEventSource para el flujo de notificaciones.
 * - openWhenHidden: true. Por omisión la librería CIERRA la conexión cuando la pestaña pasa a segundo plano y
 *   la reabre al volver: los avisos con la pestaña oculta nunca llegarían.
 * - credentials: 'include': la sesión viaja en la cookie httpOnly mf_session.
 * - onerror relanza siempre: el reintento interno de la librería reutiliza sus cabeceras (y un Last-Event-ID
 *   viejo); el reintento lo decide crearConexionNotificaciones.
 */
export function opcionesFlujoNotificaciones(m: ManejadoresFlujo, signal: AbortSignal): FetchEventSourceInit {
  return {
    signal,
    credentials: 'include',
    openWhenHidden: true,
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.startsWith('text/event-stream')) {
        m.alAbrir();
        return;
      }
      if (response.status === 401) throw new ErrorAutenticacionSse('SSE respondió 401');
      throw new Error(`SSE onopen: HTTP ${response.status}`);
    },
    onmessage(ev) {
      m.alMensaje(ev.event, ev.data);
    },
    onerror(err) {
      throw err;
    },
  };
}

interface Temporizadores {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
}

export interface DepsConexion {
  /** Abre el flujo; la promesa termina cuando se cierra (resuelve) o falla (rechaza). */
  abrir: (manejadores: ManejadoresFlujo, signal: AbortSignal) => Promise<void>;
  haySesion: () => boolean;
  /** Refresco compartido de la sesión (tokenRefresh). true si quedó una sesión válida. */
  refrescarSesion: () => Promise<boolean>;
  /** Una notificación real (null si el evento no se pudo leer: solo hay que refrescar el contador). */
  alNotificacion: (n: NotificacionEnVivo | null) => void;
  /** Consulta de respaldo al endpoint REST de no leídas. */
  sondear: () => void;
  temporizadores?: Temporizadores;
}

export function crearConexionNotificaciones(deps: DepsConexion) {
  const t: Temporizadores = deps.temporizadores ?? {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
    setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
    clearInterval: (id) => globalThis.clearInterval(id as ReturnType<typeof setInterval>),
  };
  let detenido = true;
  let abierta = false;
  let controller: AbortController | null = null;
  let reintento: unknown;
  let sondeo: unknown;
  let fallos = 0;
  let refrescos = 0;

  const iniciarSondeo = () => {
    if (sondeo !== undefined || detenido) return;
    sondeo = t.setInterval(() => {
      if (!detenido) deps.sondear();
    }, INTERVALO_SONDEO_MS);
  };
  const detenerSondeo = () => {
    if (sondeo === undefined) return;
    t.clearInterval(sondeo);
    sondeo = undefined;
  };

  const programarReintento = () => {
    fallos += 1;
    if (fallos >= FALLOS_PARA_SONDEO) iniciarSondeo();
    if (fallos > MAX_REINTENTOS) return; // se queda la consulta cada 60 s
    reintento = t.setTimeout(() => {
      reintento = undefined;
      void conectar();
    }, esperaReconexion(fallos));
  };

  const conectar = async (): Promise<void> => {
    if (detenido || !deps.haySesion()) return;
    const actual = new AbortController();
    controller = actual;
    try {
      await deps.abrir(
        {
          alAbrir: () => {
            abierta = true;
            fallos = 0;
            refrescos = 0;
            detenerSondeo();
          },
          alMensaje: (evento, data) => {
            if (evento === 'keep-alive') return;
            if (evento && evento !== 'notificacion') return;
            deps.alNotificacion(leerNotificacionEnVivo(data));
          },
        },
        actual.signal,
      );
      abierta = false;
      if (detenido || actual.signal.aborted) return;
      programarReintento();
    } catch (err) {
      abierta = false;
      if (detenido || actual.signal.aborted) return;
      if (err instanceof ErrorAutenticacionSse) {
        refrescos += 1;
        if (refrescos > MAX_REFRESCOS_SESION) {
          // La sesión sigue sin servir: client.ts y useAutoRefreshToken cierran sesión si de verdad venció.
          iniciarSondeo();
          return;
        }
        const ok = await deps.refrescarSesion();
        if (detenido) return;
        if (ok) void conectar();
        else iniciarSondeo();
        return;
      }
      programarReintento();
    }
  };

  return {
    iniciar() {
      if (!detenido) return;
      detenido = false;
      fallos = 0;
      refrescos = 0;
      void conectar();
    },
    detener() {
      detenido = true;
      abierta = false;
      if (reintento !== undefined) t.clearTimeout(reintento);
      reintento = undefined;
      detenerSondeo();
      controller?.abort();
    },
    /** Volvió la red o la pestaña: si no hay flujo abierto, reabrir ya (con presupuesto nuevo de reintentos). */
    reintentar() {
      if (detenido || abierta) return;
      if (reintento !== undefined) t.clearTimeout(reintento);
      reintento = undefined;
      fallos = 0;
      refrescos = 0;
      controller?.abort();
      void conectar();
    },
  };
}
