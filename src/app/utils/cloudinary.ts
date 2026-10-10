/**
 * Subida desde el navegador directo a Cloudinary con firma del backend (sin upload presets).
 * El backend decide carpeta y formatos según el uso y devuelve { uploadUrl, apiKey, params, signature };
 * aquí solo se manda a `uploadUrl` el archivo con api_key, signature y `params` sin cambiarlos.
 * - perfil: POST /api/auth/me/foto/firma (foto propia, avatares/usuario_<id>).
 * - galeria: POST /api/subidas/firma (imágenes de productos y servicios, foto de otra persona).
 * - factura: POST /api/subidas/firma (PDF del CFDI, solo admin).
 *
 * Si una imagen supera ~9 MB, se comprime en el navegador (JPEG) para respetar el límite
 * típico del plan gratuito de Cloudinary (10 MB por archivo).
 */

import { apiClient } from '../services/client';
import { getBackendBaseUrl } from '../services/config';
import { comprimirImagenSiSupera, CLOUDINARY_SUBIDA_MAX_BYTES } from './comprimirImagenCliente';
import { MENSAJE_SIN_CONEXION, esErrorDeRed } from './errorRed';

export type UsoSubida = 'perfil' | 'galeria' | 'factura';

/** Respuesta del backend: Cloudinary acepta la firma 1 hora desde `params.timestamp`. */
export interface FirmaSubida {
  uploadUrl: string;
  apiKey: string;
  params: Record<string, string>;
  signature: string;
}

const MENSAJE_FALLO_IMAGEN = 'No se pudo subir la imagen. Revisa que sea JPG, PNG, WebP, GIF, AVIF o HEIC y vuelve a intentarlo.';
const MENSAJE_FALLO_PDF = 'No se pudo subir el PDF. Vuelve a intentarlo en unos momentos.';

/** Pide al backend la firma de `uso` (una firma sirve para un lote dentro de su vigencia). */
export async function pedirFirmaSubida(uso: UsoSubida): Promise<FirmaSubida> {
  const res =
    uso === 'perfil'
      ? await apiClient.post<unknown>('/api/auth/me/foto/firma', undefined, getBackendBaseUrl())
      : await apiClient.post<unknown>('/api/subidas/firma', { uso }, getBackendBaseUrl());
  const data = (res as { data?: FirmaSubida } | null)?.data;
  if (!data?.uploadUrl || !data.apiKey || !data.signature || !data.params) {
    console.error('Firma de subida incompleta', res);
    throw new Error('La subida no está disponible por ahora. Vuelve a intentarlo más tarde.');
  }
  return data;
}

/** POST a Cloudinary; si falla la red, un mensaje para el usuario en vez de "Failed to fetch". */
async function enviarACloudinary(url: string, formData: FormData): Promise<Response> {
  try {
    return await fetch(url, { method: 'POST', body: formData });
  } catch (e) {
    throw esErrorDeRed(e) ? new Error(MENSAJE_SIN_CONEXION) : e;
  }
}

/** Manda `archivo` con la firma tal cual la entregó el backend y devuelve la `secure_url`. */
async function enviarFirmado(archivo: Blob, firma: FirmaSubida, mensajeFallo: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', archivo);
  formData.append('api_key', firma.apiKey);
  formData.append('signature', firma.signature);
  for (const [nombre, valor] of Object.entries(firma.params)) formData.append(nombre, valor);

  const res = await enviarACloudinary(firma.uploadUrl, formData);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    console.error('Cloudinary rechazó la subida', res.status, err?.error?.message ?? err);
    throw new Error(mensajeFallo);
  }

  const data = (await res.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url ?? data.url;
  if (!url) {
    console.error('Cloudinary no devolvió la URL', data);
    throw new Error(mensajeFallo);
  }
  return url;
}

/**
 * Sube una imagen con firma de `uso`. Pasa `firma` para reutilizar la de un lote; si no, pide una.
 */
export async function subirFirmado(file: File, uso: UsoSubida, firma?: FirmaSubida): Promise<string> {
  const listo = await comprimirImagenSiSupera(file, CLOUDINARY_SUBIDA_MAX_BYTES);
  return enviarFirmado(listo, firma ?? (await pedirFirmaSubida(uso)), MENSAJE_FALLO_IMAGEN);
}

/**
 * Sube un PDF (no una imagen) con la firma de factura. Va por `image/upload` como antes, así la URL
 * no cambia de forma. No pasa por `comprimirImagenSiSupera` (asume que el archivo se puede decodificar
 * como `<img>`; un PDF fallaría ahí). Usado para el PDF real del CFDI que sube el usuario: nunca genera
 * ni compone un PDF fiscal, solo lo transporta.
 */
export async function subirPdfCloudinary(file: File): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error('El archivo debe ser un PDF.');
  }
  return enviarFirmado(file, await pedirFirmaSubida('factura'), MENSAJE_FALLO_PDF);
}

/** Sube varias imágenes a la galería con una sola firma para todo el lote. */
export async function subirImagenesCloudinary(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files);
  if (!list.length) return [];
  const firma = await pedirFirmaSubida('galeria');
  return Promise.all(list.map((file) => subirFirmado(file, 'galeria', firma)));
}

const MAX_PERFIL_BYTES = 5 * 1024 * 1024;

/** Valida y comprime una foto de persona (máx. 5 MB). */
async function prepararFotoPersona(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (JPG, PNG, WebP, etc.).');
  }
  const lista = await comprimirImagenSiSupera(file, MAX_PERFIL_BYTES);
  if (lista.size > MAX_PERFIL_BYTES) {
    throw new Error('La imagen no debe superar 5 MB (ni siquiera tras comprimirla).');
  }
  return lista;
}

/** Foto de perfil propia: firma de perfil (avatares/usuario_<id de la sesión>). */
export async function subirFotoPerfilCloudinary(file: File): Promise<string> {
  return subirFirmado(await prepararFotoPersona(file), 'perfil');
}

/**
 * Foto de OTRA persona (admin editando un usuario): firma de galería. Nunca la de perfil, porque
 * esa escribe en avatares/usuario_<id de quien sube> y sobrescribiría la foto del admin.
 */
export async function subirFotoUsuarioCloudinary(file: File): Promise<string> {
  return subirFirmado(await prepararFotoPersona(file), 'galeria');
}
