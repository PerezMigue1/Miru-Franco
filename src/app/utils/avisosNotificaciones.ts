/**
 * Avisos en vivo del sitio (punto 20 y 21 del diseño), sin herramientas externas: funcionan mientras el sitio
 * está abierto, aunque la pestaña esté en segundo plano. Aquí vive la lógica pura (probada en node); el hook
 * useAvisosNotificaciones la conecta con el navegador.
 *
 * Dos capas:
 * 1. Aviso interno, siempre: aviso flotante de la campana (se cierra solo a los 6 s o con "Cerrar aviso"),
 *    contador de no leídas y lista en el menú de la campana.
 * 2. Notificación del navegador, como extra: solo si la persona activó los avisos (permiso concedido), el
 *    navegador puede mostrarla sin service worker y la pestaña no está visible.
 * - El permiso se pide solo cuando la persona pulsa "Activar avisos del navegador".
 */

/** Lo que el sitio usa de cada evento SSE `notificacion` (el backend manda la fila completa). */
export interface NotificacionEnVivo {
  id: string;
  tipo?: string;
  titulo: string;
  mensaje: string;
  /** Pantalla relacionada (ruta interna, p. ej. /cliente/servicios-citas/mis-citas/7). */
  urlAccion?: string | null;
}

export type EstadoAvisos = 'sin_pedir' | 'activados' | 'bloqueados' | 'no_soportado';

/** Lo mínimo de la API Notification que se usa (se inyecta en las pruebas). */
export interface EntornoAvisos {
  Notification?: {
    permission: NotificationPermission;
    requestPermission?: () => Promise<NotificationPermission>;
  };
  /** navigator.userAgent: Chrome en Android y Safari en iPhone o iPad no pueden sin service worker. */
  userAgent?: string;
  /** navigator.maxTouchPoints: el iPad se anuncia como Mac; se distingue por la pantalla táctil. */
  maxTouchPoints?: number;
  /** El constructor Notification ya lanzó antes en este navegador (recordarFalloNativa). */
  nativaFallo?: boolean;
}

/** Por qué este navegador no puede mostrar la notificación nativa; null si puede. */
export type MotivoSinNativa = 'sin_api' | 'android' | 'ios' | 'fallo_previo';

/**
 * Sin service worker, `new Notification()` solo funciona en navegadores de escritorio:
 * - sin window.Notification (Safari en iPhone o iPad fuera de una app instalada, navegadores viejos);
 * - Chrome en Android expone Notification, pero el constructor lanza "Illegal constructor";
 * - en iPhone o iPad (también el iPad que se anuncia como Mac) solo hay avisos con service worker;
 * - si el constructor ya lanzó una vez aquí, no se vuelve a intentar.
 */
export function motivoSinNativa(entorno: EntornoAvisos): MotivoSinNativa | null {
  if (!entorno.Notification) return 'sin_api';
  const ua = entorno.userAgent ?? '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (entorno.maxTouchPoints ?? 0) > 1)) return 'ios';
  if (entorno.nativaFallo) return 'fallo_previo';
  return null;
}

const CLAVE_FALLO_NATIVA = 'mf-avisos-nativa-fallo';
let falloNativaEnMemoria = false;

/** true si el constructor Notification ya lanzó en este navegador (en memoria o guardado). */
export function falloNativaRecordado(): boolean {
  if (falloNativaEnMemoria) return true;
  try {
    return globalThis.localStorage?.getItem(CLAVE_FALLO_NATIVA) === '1';
  } catch {
    return false;
  }
}

/** El constructor lanzó: se recuerda para no volver a intentarlo ni ofrecer activarlos. */
export function recordarFalloNativa(): void {
  falloNativaEnMemoria = true;
  try {
    globalThis.localStorage?.setItem(CLAVE_FALLO_NATIVA, '1');
  } catch {
    // Almacenamiento bloqueado (modo privado): basta con la memoria de esta página.
  }
}

const texto = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** JSON del evento SSE `notificacion`. Sin id o con JSON inválido: null (solo se refresca el contador). */
export function leerNotificacionEnVivo(data: unknown): NotificacionEnVivo | null {
  let o: unknown = data;
  if (typeof data === 'string') {
    if (!data.trim()) return null;
    try {
      o = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!o || typeof o !== 'object') return null;
  const r = o as Record<string, unknown>;
  const id = texto(r.id);
  if (!id) return null;
  const urlAccion = r.urlAccion ?? r.url_accion;
  return {
    id,
    tipo: texto(r.tipo),
    titulo: texto(r.titulo),
    mensaje: texto(r.mensaje),
    urlAccion: urlAccion == null ? null : texto(urlAccion),
  };
}

/**
 * Pantalla que abre el aviso: la ruta de la notificación si es interna del sitio (empieza con una sola "/");
 * si no trae ruta o apunta fuera (protocolo, "//", "/\"), la de respaldo (la bandeja de notificaciones). Con
 * espacios o caracteres de control también: el navegador los quita y "/<tab>/otro.sitio" acabaría en "//otro.sitio".
 */
export function rutaDeNotificacion(n: Pick<NotificacionEnVivo, 'urlAccion'>, respaldo: string): string {
  const ruta = (n.urlAccion ?? '').trim();
  // eslint-disable-next-line no-control-regex
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.startsWith('/\\') || /[\s\x00-\x1f\x7f]/.test(ruta)) return respaldo;
  return ruta;
}

export function estadoAvisosNavegador(entorno: EntornoAvisos = entornoNavegador()): EstadoAvisos {
  const N = entorno.Notification;
  if (!N || motivoSinNativa(entorno)) return 'no_soportado';
  if (N.permission === 'granted') return 'activados';
  if (N.permission === 'denied') return 'bloqueados';
  return 'sin_pedir';
}

/** Pide el permiso al navegador. Llamar SOLO desde el clic en "Activar avisos del navegador". */
export async function pedirPermisoAvisos(entorno: EntornoAvisos = entornoNavegador()): Promise<EstadoAvisos> {
  const actual = estadoAvisosNavegador(entorno);
  if (actual !== 'sin_pedir' || !entorno.Notification?.requestPermission) return actual;
  try {
    const respuesta = await entorno.Notification.requestPermission();
    if (respuesta === 'granted') return 'activados';
    if (respuesta === 'denied') return 'bloqueados';
  } catch {
    // Safari antiguo usa callback; si falla, se lee el estado que haya quedado.
  }
  return estadoAvisosNavegador(entorno);
}

export function entornoNavegador(): EntornoAvisos {
  if (typeof window === 'undefined') return {};
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  return {
    Notification: 'Notification' in window ? window.Notification : undefined,
    userAgent: nav?.userAgent,
    maxTouchPoints: nav?.maxTouchPoints,
    nativaFallo: falloNativaRecordado(),
  };
}

/** Textos del botón y del estado (perfil de la clienta y paneles). */
export function textoEstadoAvisos(estado: EstadoAvisos): { accion: string; detalle: string } {
  switch (estado) {
    case 'activados':
      return {
        accion: 'Avisos del navegador activados',
        detalle: 'Avisos activados: te avisaremos aunque tengas el sitio en otra pestaña.',
      };
    case 'bloqueados':
      return {
        accion: 'Avisos bloqueados por el navegador',
        detalle:
          'Bloqueaste los avisos para este sitio. Para activarlos, toca el candado junto a la dirección, busca Notificaciones y elige Permitir; luego recarga la página.',
      };
    case 'no_soportado':
      return {
        accion: 'Avisos del navegador no disponibles',
        detalle: 'Este navegador no permite avisos. Verás tus notificaciones en la campana mientras tengas el sitio abierto.',
      };
    default:
      return {
        accion: 'Activar avisos del navegador',
        detalle: 'Recibe un aviso aunque tengas el sitio en otra pestaña. Solo mientras el sitio esté abierto.',
      };
  }
}

/** Opción de la notificación nativa dentro del menú de la campana; null si no se ofrece nada. */
export function opcionNativaEnMenu(estado: EstadoAvisos): { tipo: 'activar' | 'bloqueados'; texto: string } | null {
  if (estado === 'sin_pedir') return { tipo: 'activar', texto: textoEstadoAvisos('sin_pedir').accion };
  if (estado === 'bloqueados') {
    return { tipo: 'bloqueados', texto: 'Avisos bloqueados: toca el candado junto a la dirección y permite Notificaciones.' };
  }
  // Ya activados, o el navegador no puede mostrarlos (Android, iPhone, sin Notification): solo el aviso interno.
  return null;
}

/** La capa nativa solo se usa con el permiso concedido (y soporte) y la pestaña no visible. */
export function debeMostrarNativa(d: { visible: boolean; permiso: EstadoAvisos }): boolean {
  return !d.visible && d.permiso === 'activados';
}

export interface DepsEntrega {
  /** document.visibilityState === 'visible' */
  visible: boolean;
  permiso: EstadoAvisos;
  /** `new Notification(titulo, opciones)`; el tipo admite el `this` de Notification en onclick. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  crearNativa: (titulo: string, opciones: NotificationOptions) => { onclick: ((this: any, ev?: any) => unknown) | null; close: () => void };
  /** El constructor lanzó: recordarlo (recordarFalloNativa) para no volver a intentarlo. */
  alFallarNativa?: () => void;
  enfocar: () => void;
  navegar: (ruta: string) => void;
  /** Capa 1: aviso interno (aviso flotante de la campana) con la ruta interna que abre. */
  mostrarEnPantalla: (n: NotificacionEnVivo, ruta: string) => void;
}

/** Entrega un aviso: el interno siempre; la notificación del navegador además, si toca (debeMostrarNativa). */
export function entregarAviso(n: NotificacionEnVivo, respaldo: string, d: DepsEntrega): { interno: true; nativa: boolean } {
  const ruta = rutaDeNotificacion(n, respaldo);
  d.mostrarEnPantalla(n, ruta);
  if (!debeMostrarNativa(d)) return { interno: true, nativa: false };
  try {
    // tag = id: si la misma notificación llega dos veces (dos pestañas), el navegador muestra una sola.
    const nativa = d.crearNativa(n.titulo, { body: n.mensaje, tag: n.id });
    nativa.onclick = () => {
      d.enfocar();
      d.navegar(ruta);
      nativa.close();
    };
    return { interno: true, nativa: true };
  } catch {
    // Sin service worker algunos navegadores lanzan "Illegal constructor": se recuerda y no se reintenta.
    d.alFallarNativa?.();
    return { interno: true, nativa: false };
  }
}

/** Las más recientes primero (por creadoEn); las que no traen fecha, al final. No cambia la lista original. */
export function ordenarRecientes<T extends { creadoEn?: string }>(lista: readonly T[]): T[] {
  const tiempo = (n: T) => {
    const t = n.creadoEn ? Date.parse(n.creadoEn) : NaN;
    return Number.isNaN(t) ? -Infinity : t;
  };
  return [...lista].sort((a, b) => tiempo(b) - tiempo(a));
}

const PREFIJO_CONTADOR = /^\(\d+\+?\)\s/;

/** "(3) Título original"; en 0 restaura el título sin el contador. */
export function tituloConContador(titulo: string, noLeidas: number): string {
  const base = titulo.replace(PREFIJO_CONTADOR, '');
  if (noLeidas <= 0) return base;
  return `(${noLeidas > 99 ? '99+' : noLeidas}) ${base}`;
}

/** No leídas que no se conocían (las trae la consulta de respaldo cuando el SSE no está). */
export function idsNuevas<T extends { id: string; leida?: boolean }>(conocidas: ReadonlySet<string>, lista: T[]): T[] {
  return lista.filter((n) => n.leida !== true && !conocidas.has(n.id));
}

/**
 * Abre la pantalla relacionada. Si es la misma pantalla con otra ancla (p. ej. ya está en su perfil), cambia el
 * hash para que la pantalla reaccione con `hashchange`; el router de Next no lo dispara.
 */
export function irARuta(ruta: string, d: { pathname: string; cambiarHash: (hash: string) => void; push: (ruta: string) => void }): void {
  const i = ruta.indexOf('#');
  if (i > 0 && ruta.slice(0, i) === d.pathname) {
    d.cambiarHash(ruta.slice(i + 1));
    return;
  }
  d.push(ruta);
}
