'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { documentoLegal, type SlugDocumentoLegal } from '../utils/documentosLegales';

/**
 * Registro trazable de consentimientos (POST /api/consentimientos y lecturas propias). Cada casilla marcada
 * se guarda con el documento, la versión y el hash que la clienta tenía a la vista; el backend agrega la
 * fecha (UTC), la IP y el navegador. Nada se edita ni se borra: revocar es otra fila.
 */
export type TipoConsentimiento =
  | 'terminos'
  | 'aviso_privacidad'
  | 'promociones'
  | 'datos_salud'
  | 'terminos_venta'
  | 'reembolsos'
  | 'anticipos'
  | 'fotos_resultado'
  | 'cookies';

export interface ItemConsentimiento {
  tipo: TipoConsentimiento;
  documentoSlug?: SlugDocumentoLegal;
  version?: string;
  hash?: string;
  accion: 'aceptado' | 'revocado';
}

export interface ConsentimientoRegistrado {
  id: string;
  usuarioId: string | null;
  visitanteId: string | null;
  tipo: TipoConsentimiento;
  documentoSlug: SlugDocumentoLegal | null;
  documentoVersion: string | null;
  documentoHash: string | null;
  accion: 'aceptado' | 'revocado';
  creadoEn: string;
  ip: string | null;
  userAgent: string | null;
  formulario: string;
  rutaOrigen: string | null;
  metodo: string;
}

export interface DocumentoPendiente {
  tipo: 'terminos' | 'aviso_privacidad';
  documentoSlug: 'terminos' | 'aviso-privacidad';
  version: string;
  hash: string;
  vigenteDesde: string;
  versionAceptada: string | null;
}

/** Tipo de consentimiento que corresponde a cada documento legal. */
const TIPO_POR_DOCUMENTO: Record<SlugDocumentoLegal, TipoConsentimiento> = {
  terminos: 'terminos',
  'aviso-privacidad': 'aviso_privacidad',
  cookies: 'cookies',
  reembolsos: 'reembolsos',
  anticipos: 'anticipos',
};

/** Casilla de un documento legal: lleva la versión y el hash publicados hoy en el registro. */
export function aceptacionDeDocumento(slug: SlugDocumentoLegal): ItemConsentimiento {
  const doc = documentoLegal(slug);
  return { tipo: TIPO_POR_DOCUMENTO[slug], documentoSlug: slug, version: doc.version, hash: doc.hash, accion: 'aceptado' };
}

/** Revocar un consentimiento (promociones, datos de salud, fotos): una fila nueva, sin documento. */
export function revocacion(tipo: TipoConsentimiento): ItemConsentimiento {
  return { tipo, accion: 'revocado' };
}

/** `documentos` del registro y del alta con Google: qué versión de cada documento aceptó. */
export function documentosAceptados(slugs: SlugDocumentoLegal[]): { slug: SlugDocumentoLegal; version: string; hash: string }[] {
  return slugs.map((slug) => {
    const { version, hash } = documentoLegal(slug);
    return { slug, version, hash };
  });
}

const opciones = () => ({ customBase: getBackendBaseUrl(), skip403Redirect: true });

function datosDe<T>(res: unknown): T[] {
  const data = (res as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function registrarConsentimientos(entrada: {
  items: ItemConsentimiento[];
  formulario: string;
  rutaOrigen?: string;
}): Promise<ConsentimientoRegistrado[]> {
  const res = await apiClient.post<unknown>('/api/consentimientos', entrada, opciones());
  return datosDe<ConsentimientoRegistrado>(res);
}

/**
 * Documentos obligatorios cuya versión vigente aún no acepta la cuenta (vacío: al día). Es una consulta de fondo
 * que corre en cualquier página: un 401 (sesión local vieja) no manda al login; del vencimiento se encarga
 * useAutoRefreshToken.
 */
export async function obtenerPendientes(): Promise<DocumentoPendiente[]> {
  return datosDe<DocumentoPendiente>(
    await apiClient.get<unknown>('/api/consentimientos/pendientes', { ...opciones(), skip401Redirect: true }),
  );
}

/** Historial propio, el más reciente primero. */
export async function misConsentimientos(): Promise<ConsentimientoRegistrado[]> {
  return datosDe<ConsentimientoRegistrado>(await apiClient.get<unknown>('/api/consentimientos/mios', opciones()));
}
