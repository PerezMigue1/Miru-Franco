import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { DOCUMENTOS_LEGALES, hashTextoDocumento, type SlugDocumentoLegal } from '../utils/documentosLegales';

/**
 * Documentos legales en la base (backend-miru, módulo documentos-legales).
 * - Páginas públicas: obtenerDocumentoPublicado trae el html vigente. Solo se muestra si es seguro y si su texto da el
 *   hash publicado; si no (o si el backend no responde), la página usa su texto escrito en la web como respaldo.
 * - Casillas de consentimiento: versionesVigentes da versión y hash vigentes, con el registro de la web de respaldo.
 * - Admin > Documentos legales: borrador, vista previa, historial y "Publicar nueva versión".
 */

export interface DocumentoPublicado {
  slug: SlugDocumentoLegal;
  version: string;
  vigenteDesde: string;
  hash: string;
  html: string;
  requiereAceptacion: boolean;
}

/** Lo que espera la página antes de usar su respaldo (no debe colgar el render ni el build). */
const TIEMPO_MAXIMO_MS = 4000;
const VERSION = /^\d+\.\d+$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const HASH = /^[0-9a-f]{64}$/;

const ETIQUETA_PELIGROSA = /^<\s*\/?\s*(script|style|iframe|frame|object|embed|form|input|button|textarea|select|link|meta|base|img|video|audio|source|template|foreignobject|use|image|animate|set|math|noscript)\b/i;
const ATRIBUTO_EVENTO = /\son[a-z]+\s*=/i;
const ESQUEMA_PELIGROSO = /(javascript|vbscript|data)\s*:/i;

/**
 * Segunda revisión del html que manda el backend (que ya lo limpió con su lista blanca al publicar): debe ser el <main>
 * de un documento legal y ninguna etiqueta puede ser ejecutable ni llevar atributos on* o enlaces javascript:.
 */
export function htmlPublicadoEsSeguro(html: string): boolean {
  if (!html.startsWith('<main class="mf-terminos">') || !html.endsWith('</main>')) return false;
  for (const [etiqueta] of html.matchAll(/<[^>]*>/g)) {
    if (ETIQUETA_PELIGROSA.test(etiqueta) || ATRIBUTO_EVENTO.test(etiqueta) || ESQUEMA_PELIGROSO.test(etiqueta)) return false;
  }
  return !/<!--/.test(html);
}

function datosDe(cuerpo: unknown): unknown {
  return cuerpo && typeof cuerpo === 'object' && 'data' in cuerpo ? (cuerpo as { data: unknown }).data : cuerpo;
}

/**
 * Texto vigente de un documento legal para su página (componente de servidor: revalida cada minuto). null si no se
 * puede mostrar: sin backend, sin texto en la base, html no seguro o hash que no corresponde al texto.
 */
export async function obtenerDocumentoPublicado(slug: SlugDocumentoLegal): Promise<DocumentoPublicado | null> {
  const base = getBackendBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/documentos-legales/${slug}/vigente`, {
      next: { revalidate: 60, tags: ['contenido-publico'] },
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    } as RequestInit);
    if (!res.ok) return null;
    const d = datosDe(await res.json()) as Partial<DocumentoPublicado> | null;
    if (!d || d.slug !== slug || typeof d.html !== 'string' || !VERSION.test(String(d.version)) || !DIA.test(String(d.vigenteDesde)) || !HASH.test(String(d.hash))) {
      return null;
    }
    if (!htmlPublicadoEsSeguro(d.html)) return null;
    if ((await hashTextoDocumento(d.html)) !== d.hash) return null;
    return {
      slug,
      version: d.version as string,
      vigenteDesde: d.vigenteDesde as string,
      hash: d.hash as string,
      html: d.html,
      requiereAceptacion: d.requiereAceptacion !== false,
    };
  } catch {
    return null;
  }
}

export interface VersionVigente {
  slug: SlugDocumentoLegal;
  version: string;
  hash: string;
  vigenteDesde: string;
}

/**
 * Versión y hash vigentes de cada documento (lo que llevan las casillas de consentimiento). Lo que el backend no dé,
 * o todo si no responde, sale del registro de la web (DOCUMENTOS_LEGALES), como hasta hoy.
 */
export async function versionesVigentes(): Promise<VersionVigente[]> {
  let delBackend: unknown[] = [];
  const base = getBackendBaseUrl();
  if (base) {
    try {
      const res = await fetch(`${base}/api/documentos-legales/vigentes`, { next: { revalidate: 60, tags: ['contenido-publico'] }, signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) } as RequestInit);
      const lista = res.ok ? datosDe(await res.json()) : [];
      delBackend = Array.isArray(lista) ? lista : [];
    } catch {
      delBackend = [];
    }
  }
  return DOCUMENTOS_LEGALES.map((registro) => {
    const d = delBackend.find((x) => (x as { slug?: unknown } | null)?.slug === registro.slug) as Partial<VersionVigente> | undefined;
    const valido = d && VERSION.test(String(d.version)) && HASH.test(String(d.hash)) && DIA.test(String(d.vigenteDesde));
    return valido
      ? { slug: registro.slug, version: d.version as string, hash: d.hash as string, vigenteDesde: d.vigenteDesde as string }
      : { slug: registro.slug, version: registro.version, hash: registro.hash, vigenteDesde: registro.vigenteDesde };
  });
}

// ---------------------------------------------------------------- Panel

export type SlugEditable = 'terminos' | 'aviso-privacidad' | 'cookies' | 'reembolsos';

export interface VariableDesactualizada {
  nombre: string;
  publicado: string;
  actual: string;
}

export interface DocumentoAdmin {
  slug: SlugEditable;
  titulo: string;
  ruta: string;
  incluye: string | null;
  vigente: { version: string; vigenteDesde: string; hash: string; requiereAceptacion: boolean; tieneTexto: boolean } | null;
  programada: { version: string; vigenteDesde: string } | null;
  borrador: { actualizadoEn: string; basadoEnVersion: string | null } | null;
  variablesDesactualizadas: VariableDesactualizada[];
}

export interface VersionHistorial {
  version: string;
  vigenteDesde: string;
  publicadoEn: string;
  hash: string;
  motivo: string | null;
  requiereAceptacion: boolean;
  tieneTexto: boolean;
  estado: 'vigente' | 'programada' | 'anterior';
  publicadoPor: { id: string; nombre: string } | null;
  variables: Record<string, string>;
}

export interface HistorialDocumento {
  slug: SlugEditable;
  titulo: string;
  versiones: VersionHistorial[];
}

export interface VersionPublicada {
  slug: SlugEditable;
  version: string;
  vigenteDesde: string;
  hash: string;
  html: string | null;
  plantilla: string | null;
  variables: Record<string, string>;
  motivo: string | null;
  requiereAceptacion: boolean;
}

export interface VariableDisponible {
  nombre: string;
  etiqueta: string;
  valor: string;
}

export interface BorradorDocumento {
  slug: SlugEditable;
  plantilla: string;
  guardado: boolean;
  basadoEnVersion: string | null;
  actualizadoEn: string | null;
  variablesDisponibles?: VariableDisponible[];
}

export interface VistaPreviaDocumento {
  slug: SlugEditable;
  version: string;
  vigenteDesde: string;
  html: string;
  hash: string;
  variables: Record<string, string>;
  errores: string[];
}

export interface DatosPublicacion {
  plantilla: string;
  version: string;
  vigenteDesde: string;
  motivo: string;
  requiereAceptacion: boolean;
}

export interface ResultadoPublicacion {
  slug: SlugEditable;
  version: string;
  vigenteDesde: string;
  hash: string;
  requiereAceptacion: boolean;
  variables: Record<string, string>;
}

export interface DocumentoAfectado {
  slug: SlugEditable;
  titulo: string;
  version: string;
  variables: VariableDesactualizada[];
}

const BASE = () => getBackendBaseUrl();
/** Lecturas de la pantalla: un 403 se muestra en la misma pantalla en vez de ir a /403. */
const EN_PANTALLA = () => ({ customBase: BASE(), skip403Redirect: true });
const RUTA = '/api/documentos-legales/admin';
const ruta = (slug: string, resto = '') => `${RUTA}/${encodeURIComponent(slug)}${resto}`;

async function leer<T>(promesa: Promise<unknown>): Promise<T> {
  return datosDe(await promesa) as T;
}

export async function listarDocumentosLegalesAdmin(): Promise<DocumentoAdmin[]> {
  const lista = await leer<unknown>(apiClient.get(RUTA, EN_PANTALLA()));
  return Array.isArray(lista) ? (lista as DocumentoAdmin[]) : [];
}

export function historialDocumentoLegal(slug: SlugEditable): Promise<HistorialDocumento> {
  return leer<HistorialDocumento>(apiClient.get(ruta(slug, '/versiones'), EN_PANTALLA()));
}

export function versionDocumentoLegal(slug: SlugEditable, version: string): Promise<VersionPublicada> {
  return leer<VersionPublicada>(apiClient.get(ruta(slug, `/versiones/${encodeURIComponent(version)}`), EN_PANTALLA()));
}

export function borradorDocumentoLegal(slug: SlugEditable): Promise<BorradorDocumento> {
  return leer<BorradorDocumento>(apiClient.get(ruta(slug, '/borrador'), EN_PANTALLA()));
}

export function guardarBorradorDocumentoLegal(slug: SlugEditable, plantilla: string): Promise<BorradorDocumento> {
  return leer<BorradorDocumento>(apiClient.put(ruta(slug, '/borrador'), { plantilla }, BASE()));
}

export function descartarBorradorDocumentoLegal(slug: SlugEditable): Promise<{ slug: SlugEditable; descartado: boolean }> {
  return leer(apiClient.delete(ruta(slug, '/borrador'), BASE()));
}

export function vistaPreviaDocumentoLegal(slug: SlugEditable, datos: { plantilla: string; version?: string; vigenteDesde?: string }): Promise<VistaPreviaDocumento> {
  return leer<VistaPreviaDocumento>(apiClient.post(ruta(slug, '/vista-previa'), datos, BASE()));
}

export function prepararVersionDocumentoLegal(slug: SlugEditable): Promise<{ slug: SlugEditable; creado: boolean; basadoEnVersion: string | null }> {
  return leer(apiClient.post(ruta(slug, '/preparar-version'), {}, BASE()));
}

export function publicarVersionDocumentoLegal(slug: SlugEditable, datos: DatosPublicacion): Promise<ResultadoPublicacion> {
  return leer<ResultadoPublicacion>(apiClient.post(ruta(slug, '/publicar'), datos, BASE()));
}

/**
 * Documentos vigentes que usan una regla que cambió. Sin argumento, con las reglas de hoy; con `reglas`, con las
 * propuestas (para avisar en Admin > Configuración del sitio antes de guardar).
 */
export async function documentosAfectadosPorReglas(reglas?: unknown): Promise<DocumentoAfectado[]> {
  const lista =
    reglas === undefined
      ? await leer<unknown>(apiClient.get(`${RUTA}/afectados-por-reglas`, EN_PANTALLA()))
      : await leer<unknown>(apiClient.post(`${RUTA}/afectados-por-reglas`, { reglas }, BASE()));
  return Array.isArray(lista) ? (lista as DocumentoAfectado[]) : [];
}
