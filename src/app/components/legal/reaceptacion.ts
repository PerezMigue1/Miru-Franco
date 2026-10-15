import { apiClient } from '../../services/client';
import { getBackendBaseUrl } from '../../services/config';
import { api } from '../../services/auth';
import { misSolicitudesArco, type SolicitudArco } from '../../services/arco';
import {
  obtenerPendientes,
  registrarConsentimientos,
  type DocumentoPendiente,
  type ItemConsentimiento,
} from '../../services/consentimientos';
import { DOCUMENTOS_LEGALES } from '../../utils/documentosLegales';
import { fechaCortaEnMexico } from '../../utils/fechaSoloDia';
import { clearAuthData } from '../../utils/security';
import { solicitudAbiertaDe, validarSolicitud } from '../privacidad/accionesPrivacidad';

/**
 * Re-aceptación de documentos (punto 24): cuando se publica una versión nueva de los Términos o del Aviso,
 * la cuenta con sesión iniciada debe aceptarla para seguir. Lógica sin interfaz de ReaceptacionDocumentos.
 */
export const FORMULARIO_REACEPTACION = 'reaceptacion';
/** Límite de rutaOrigen en POST /consentimientos. */
const MAX_RUTA_ORIGEN = 300;
export const MENSAJE_CASILLA_REACEPTACION = 'Marca la casilla para aceptar este documento.';

/** Rutas de las páginas legales (sin el ancla): ahí no se pinta el diálogo, para poder leer lo que se pide aceptar. */
const RUTAS_DOCUMENTOS = DOCUMENTOS_LEGALES.map((d) => d.ruta.split('#')[0]);

/** true en la página de un documento legal (con o sin "/" final). Al volver a otra ruta el diálogo sale otra vez. */
export function esRutaDeDocumentoLegal(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const ruta = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return RUTAS_DOCUMENTOS.includes(ruta);
}

/**
 * Cuenta de la sesión actual, para saber si sus pendientes ya se consultaron: null sin sesión; con sesión, el id
 * del usuario guardado o una marca fija si no se puede leer. Al cambiar (salir, entrar u otra cuenta) se consulta de nuevo.
 */
export function cuentaEnSesion(haySesion: boolean, usuarioGuardado: string | null): string | null {
  if (!haySesion) return null;
  try {
    const id = (JSON.parse(usuarioGuardado ?? 'null') as { id?: unknown } | null)?.id;
    return id != null && String(id) ? String(id) : 'sesion';
  } catch {
    return 'sesion';
  }
}

/** `localStorage.user` tal cual, o null sin almacenamiento. */
export function leerUsuarioGuardado(): string | null {
  try {
    return localStorage.getItem('user');
  } catch {
    return null;
  }
}

/**
 * Título y ruta del documento de un pendiente. Si el backend pide un documento que la web no tiene registrado,
 * se muestra su slug sin enlace en vez de tirar el diálogo (y el layout).
 */
export function documentoDelPendiente(slug: string): { titulo: string; ruta: string | null } {
  const doc = DOCUMENTOS_LEGALES.find((d) => d.slug === slug);
  return doc ? { titulo: doc.titulo, ruta: doc.ruta } : { titulo: slug, ruta: null };
}

/** Documentos pendientes de la cuenta. Si la consulta falla no bloquea el sitio: se reintenta en la próxima carga. */
export async function consultarPendientes(): Promise<DocumentoPendiente[]> {
  try {
    return await obtenerPendientes();
  } catch (error) {
    console.warn('[Re-aceptación] No se pudieron consultar los documentos pendientes:', error);
    return [];
  }
}

/** Cada pendiente se acepta con la versión y el hash que dio el backend (los que se le mostraron). */
export function itemsReaceptacion(pendientes: DocumentoPendiente[]): ItemConsentimiento[] {
  return pendientes.map((p) => ({ tipo: p.tipo, documentoSlug: p.documentoSlug, version: p.version, hash: p.hash, accion: 'aceptado' }));
}

/** Mensaje de cada casilla sin marcar, por slug del documento; vacío = se puede aceptar. */
export function erroresReaceptacion(pendientes: DocumentoPendiente[], marcadas: Partial<Record<string, boolean>>): Record<string, string> {
  return Object.fromEntries(pendientes.filter((p) => !marcadas[p.documentoSlug]).map((p) => [p.documentoSlug, MENSAJE_CASILLA_REACEPTACION]));
}

export async function registrarReaceptacion(pendientes: DocumentoPendiente[], rutaOrigen: string): Promise<void> {
  await registrarConsentimientos({
    items: itemsReaceptacion(pendientes),
    formulario: FORMULARIO_REACEPTACION,
    rutaOrigen: rutaOrigen.slice(0, MAX_RUTA_ORIGEN),
  });
}

/** "Título versión X.Y" de cada pendiente, para la solicitud de cancelación. */
function listaDocumentos(pendientes: DocumentoPendiente[]): string {
  return pendientes.map((p) => `${documentoDelPendiente(p.documentoSlug).titulo} versión ${p.version}`).join(', ');
}

/** "No acepto" y quiere irse: solicitud ARCO de cancelación (POST /api/arco/solicitudes), antes de cerrar sesión. */
export async function solicitarCancelacionCuenta(pendientes: DocumentoPendiente[]): Promise<SolicitudArco | null> {
  const descripcion = `Solicito cancelar mi cuenta porque no acepto la versión vigente de: ${listaDocumentos(pendientes)}.`;
  const res = await apiClient.post<{ data?: SolicitudArco } | null>(
    '/api/arco/solicitudes',
    { tipo: 'cancelacion', descripcion: descripcion.slice(0, 2000) },
    { customBase: getBackendBaseUrl(), skip403Redirect: true },
  );
  const solicitud = res?.data;
  return solicitud && typeof solicitud === 'object' && !Array.isArray(solicitud) ? solicitud : null;
}

/** Estado del paso "No acepto": la casilla "entiendo" (sin marcar), su error y la cancelación que ya esté abierta. */
export interface EstadoRechazo {
  entendido: boolean;
  errorCasilla: string | null;
  abierta: SolicitudArco | null;
}

export const RECHAZO_INICIAL: EstadoRechazo = { entendido: false, errorCasilla: null, abierta: null };

export type ResultadoCancelacion =
  | { estado: 'falta_casilla'; mensaje: string }
  | { estado: 'ya_abierta'; solicitud: SolicitudArco }
  | { estado: 'enviada'; solicitud: SolicitudArco | null }
  | { estado: 'error'; mensaje: string };

/**
 * "Solicitar la cancelación de mi cuenta" desde la re-aceptación, con las mismas reglas que el perfil: sin la
 * casilla "entiendo" no se envía nada, y si ya hay una cancelación abierta no se abre otra (se muestra su folio).
 * Si no se pueden leer sus solicitudes se envía igual: el backend rechaza el duplicado con 409 y su mensaje se muestra.
 */
export async function pedirCancelacionPorRechazo(pendientes: DocumentoPendiente[], entendido: boolean): Promise<ResultadoCancelacion> {
  const falta = validarSolicitud('cancelacion', { descripcion: '', entendido });
  if (falta) return { estado: 'falta_casilla', mensaje: falta };
  try {
    const abierta = solicitudAbiertaDe(await misSolicitudesArco(), 'cancelacion');
    if (abierta) return { estado: 'ya_abierta', solicitud: abierta };
  } catch {
    /* sin la lista: el backend evita el duplicado */
  }
  try {
    return { estado: 'enviada', solicitud: await solicitarCancelacionCuenta(pendientes) };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : '';
    if ((e as { status?: number } | null)?.status === 409 && mensaje) return { estado: 'error', mensaje };
    const detalle = mensaje ? ` (${mensaje})` : '';
    return { estado: 'error', mensaje: `No pudimos enviar tu solicitud de cancelación${detalle}. Intenta de nuevo o solo cierra sesión.` };
  }
}

/** "Ya enviaste tu solicitud de cancelación ARCO-…. Te responderemos a más tardar el dd/mm/aaaa." */
export function textoCancelacionAbierta(solicitud: Pick<SolicitudArco, 'folio' | 'venceRespuesta'>): string {
  const vence = fechaCortaEnMexico(solicitud.venceRespuesta);
  return `Ya enviaste tu solicitud de cancelación ${solicitud.folio}.${vence ? ` Te responderemos a más tardar el ${vence}.` : ''}`;
}

/** Cierra la sesión como el menú de usuario (logout del backend y limpieza local), aunque el backend falle. */
export async function cerrarSesionPorRechazo(): Promise<void> {
  try {
    localStorage.setItem('manualLogout', 'true');
  } catch {
    /* sin almacenamiento: igual se cierra */
  }
  try {
    await api.logout(false);
  } finally {
    clearAuthData();
    try {
      localStorage.removeItem('manualLogout');
    } catch {
      /* sin almacenamiento */
    }
  }
}
