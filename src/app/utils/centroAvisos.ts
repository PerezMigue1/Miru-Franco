import {
  entregarAviso,
  idsNuevas,
  ordenarRecientes,
  type DepsEntrega,
  type EstadoAvisos,
  type NotificacionEnVivo,
} from './avisosNotificaciones';

/**
 * Estado de la campana (capa 1, aviso interno) sin React, para probarlo en node con temporizadores falsos.
 * El hook useAvisosNotificaciones lo crea una vez por encabezado y lo lee con useSyncExternalStore.
 *
 * - Contador y lista: salen SIEMPRE de GET /api/notificaciones?leida=false (`listarNoLeidas`). Así lo que llegó
 *   mientras la persona no estaba en el sitio queda como no leído al volver; el SSE solo dispara la recarga.
 * - Aviso flotante por cada notificación nueva: se cierra solo a los DURACION_AVISO_MS o con "Cerrar aviso".
 * - Capa 2 (notificación del navegador): entregarAviso decide; si el constructor lanza una vez, no se reintenta.
 */

export const DURACION_AVISO_MS = 6000;
/** Avisos flotantes a la vez; al llegar otro se quita el más viejo. */
export const MAX_AVISOS_EN_PANTALLA = 3;
/** Cuántas nuevas se anuncian de golpe cuando las trae la consulta de respaldo. */
const MAX_AVISOS_POR_CONSULTA = 3;

/** Lo que la campana usa de cada notificación (NotificacionApi cumple con esta forma). */
export interface NotificacionDeLista extends NotificacionEnVivo {
  creadoEn?: string;
  leida?: boolean;
}

export interface AvisoEnPantalla {
  /** Identifica el aviso flotante (la misma notificación no se anuncia dos veces, pero la clave es propia). */
  clave: number;
  id: string;
  titulo: string;
  mensaje: string;
  /** Ruta interna ya validada (rutaDeNotificacion). */
  ruta: string;
}

export interface EstadoCentro {
  noLeidas: number;
  lista: NotificacionDeLista[];
  avisos: AvisoEnPantalla[];
}

interface Temporizadores {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
}

export interface DepsCentro {
  /** Bandeja que abre un aviso sin ruta propia o con ruta externa. */
  rutaRespaldo: string;
  haySesion: () => boolean;
  listarNoLeidas: () => Promise<NotificacionDeLista[]>;
  marcarLeida: (id: string) => Promise<unknown>;
  marcarTodas: () => Promise<unknown>;
  /** En el momento del aviso: si la pestaña está visible y el estado de los avisos del navegador. */
  canalNativo: () => { visible: boolean; permiso: EstadoAvisos };
  crearNativa: DepsEntrega['crearNativa'];
  alFallarNativa: () => void;
  enfocar: () => void;
  navegar: (ruta: string) => void;
  alError?: (mensaje: string) => void;
  temporizadores?: Temporizadores;
}

export const ESTADO_INICIAL: EstadoCentro = Object.freeze({ noLeidas: 0, lista: [], avisos: [] }) as EstadoCentro;

const ERROR_MARCAR = 'No se pudo marcar como leído. Intenta de nuevo.';

export function crearCentroAvisos(deps: DepsCentro) {
  const t: Temporizadores = deps.temporizadores ?? {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
  };
  let estado: EstadoCentro = ESTADO_INICIAL;
  const oyentes = new Set<() => void>();
  const conocidas = new Set<string>();
  const temporizadores = new Map<number, unknown>();
  let siguienteClave = 0;
  let reqId = 0;
  /** El constructor Notification ya lanzó en esta página: la capa 2 queda apagada. */
  let nativaApagada = false;
  /** Se reemplaza con fijarNavegacion cuando el router de Next está disponible. */
  let navegar = deps.navegar;

  const fijar = (cambios: Partial<EstadoCentro>) => {
    estado = { ...estado, ...cambios };
    for (const oyente of oyentes) oyente();
  };

  const fijarLista = (lista: NotificacionDeLista[]) => {
    const ordenada = ordenarRecientes(lista);
    fijar({ lista: ordenada, noLeidas: ordenada.length });
  };

  const cerrarAviso = (clave: number) => {
    const id = temporizadores.get(clave);
    if (id !== undefined) t.clearTimeout(id);
    temporizadores.delete(clave);
    if (estado.avisos.some((a) => a.clave === clave)) fijar({ avisos: estado.avisos.filter((a) => a.clave !== clave) });
  };

  const mostrarEnPantalla = (n: NotificacionEnVivo, ruta: string) => {
    const clave = ++siguienteClave;
    const aviso: AvisoEnPantalla = { clave, id: n.id, titulo: n.titulo, mensaje: n.mensaje, ruta };
    const avisos = [...estado.avisos, aviso];
    while (avisos.length > MAX_AVISOS_EN_PANTALLA) {
      const viejo = avisos.shift();
      if (viejo) {
        t.clearTimeout(temporizadores.get(viejo.clave));
        temporizadores.delete(viejo.clave);
      }
    }
    fijar({ avisos });
    temporizadores.set(clave, t.setTimeout(() => cerrarAviso(clave), DURACION_AVISO_MS));
  };

  const anunciar = (n: NotificacionEnVivo) => {
    const canal = deps.canalNativo();
    entregarAviso(n, deps.rutaRespaldo, {
      visible: canal.visible,
      permiso: nativaApagada ? 'no_soportado' : canal.permiso,
      crearNativa: deps.crearNativa,
      alFallarNativa: () => {
        nativaApagada = true;
        deps.alFallarNativa();
      },
      enfocar: deps.enfocar,
      navegar: (ruta) => navegar(ruta),
      mostrarEnPantalla,
    });
  };

  /** Recarga las no leídas. Con `anunciarNuevas`, anuncia las que no se conocían (consulta de respaldo). */
  const cargar = async (anunciarNuevas = false): Promise<void> => {
    const miReq = ++reqId;
    if (!deps.haySesion()) {
      conocidas.clear();
      fijar({ noLeidas: 0, lista: [] });
      return;
    }
    try {
      const lista = await deps.listarNoLeidas();
      if (miReq !== reqId) return;
      if (anunciarNuevas) {
        for (const n of idsNuevas(conocidas, lista).slice(0, MAX_AVISOS_POR_CONSULTA)) anunciar(n);
      }
      for (const n of lista) conocidas.add(n.id);
      fijarLista(lista);
    } catch {
      // Sin red o sin sesión: se conserva lo que había; client.ts se encarga de un 401 real.
    }
  };

  const marcarLeida = async (id: string): Promise<void> => {
    reqId++; // una carga en vuelo no debe devolver la que se acaba de marcar
    fijarLista(estado.lista.filter((n) => n.id !== id));
    try {
      await deps.marcarLeida(id);
    } catch {
      deps.alError?.(ERROR_MARCAR);
      await cargar();
    }
  };

  return {
    obtener: (): EstadoCentro => estado,
    suscribir(oyente: () => void): () => void {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
    cargar,
    /** Evento SSE `notificacion` (null si no se pudo leer: solo se refresca el contador). */
    async alNotificacion(n: NotificacionEnVivo | null): Promise<void> {
      if (n && !conocidas.has(n.id)) {
        conocidas.add(n.id);
        anunciar(n);
        if (!estado.lista.some((x) => x.id === n.id)) fijarLista([{ ...n, leida: false }, ...estado.lista]);
      }
      await cargar();
    },
    cerrarAviso,
    /** El hook pasa aquí la navegación con el router de Next (cambia entre renders; el centro se crea una vez). */
    fijarNavegacion(fn: (ruta: string) => void): void {
      navegar = fn;
    },
    /** Clic en el aviso flotante: abre su pantalla, lo marca como leído y lo cierra. */
    async abrirAviso(clave: number): Promise<void> {
      const aviso = estado.avisos.find((a) => a.clave === clave);
      if (!aviso) return;
      cerrarAviso(clave);
      navegar(aviso.ruta);
      await marcarLeida(aviso.id);
    },
    marcarLeida,
    async marcarTodas(): Promise<void> {
      reqId++;
      fijarLista([]);
      try {
        await deps.marcarTodas();
      } catch {
        deps.alError?.(ERROR_MARCAR);
        await cargar();
      }
    },
    /** Al desmontar: cancela los temporizadores de los avisos flotantes (las suscripciones se quitan solas). */
    detener(): void {
      for (const id of temporizadores.values()) t.clearTimeout(id);
      temporizadores.clear();
    },
  };
}

export type CentroAvisos = ReturnType<typeof crearCentroAvisos>;
