/**
 * Subida desde el navegador directo a Cloudinary con firma del backend (sin upload presets).
 * El backend decide carpeta y formatos según el uso y devuelve { uploadUrl, apiKey, params, signature };
 * aquí solo se manda a `uploadUrl` el archivo con api_key, signature y `params` sin cambiarlos.
 * - perfil: POST /api/auth/me/foto/firma (foto propia, avatares/usuario_<id>).
 * - factura: POST /api/subidas/firma (PDF del CFDI, solo admin).
 * - imágenes de los formularios (servicios, productos, equipo, promociones, sitio y la foto de otra persona):
 *   subida segura, una firma por imagen en POST /api/subidas/imagen/firma con el public_id que genera el servidor
 *   en la carpeta de cada uso. El formulario manda ese public_id y el backend lo cambia por la URL; nunca se
 *   escribe una URL a mano.
 *
 * Si una imagen supera ~9 MB, se comprime en el navegador (JPEG) para respetar el límite
 * típico del plan gratuito de Cloudinary (10 MB por archivo).
 */

import { apiClient } from '../services/client';
import { getBackendBaseUrl } from '../services/config';
import { comprimirImagenSiSupera, CLOUDINARY_SUBIDA_MAX_BYTES } from './comprimirImagenCliente';
import { MENSAJE_SIN_CONEXION, esErrorDeRed } from './errorRed';

export type UsoSubida = 'perfil' | 'factura';

/** Uso de una imagen de formulario: decide su carpeta en Cloudinary (nunca galeria/). */
export type UsoImagen = 'servicios' | 'productos' | 'equipo' | 'promociones' | 'sitio' | 'usuarios';

/**
 * Qué es una imagen que llega a la galería: foto real de un trabajo del salón o imagen ilustrativa. Las
 * ilustrativas se firman para galeria/ilustrativas, así la URL lo dice y nunca se presentan como trabajo real.
 */
export type TipoImagenGaleria = 'real' | 'ilustrativa';

/** Respuesta del backend: Cloudinary acepta la firma 1 hora desde `params.timestamp`. */
export interface FirmaSubida {
  uploadUrl: string;
  apiKey: string;
  params: Record<string, string>;
  signature: string;
}

const MENSAJE_FALLO_IMAGEN = 'No se pudo subir la imagen. Revisa que sea JPG, PNG, WebP, GIF, AVIF o HEIC y vuelve a intentarlo.';
const MENSAJE_FALLO_PDF = 'No se pudo subir el PDF. Vuelve a intentarlo en unos momentos.';

/**
 * Pide al backend la firma de `uso` (una firma sirve para un lote dentro de su vigencia). En galería,
 * `ilustrativa` pide la carpeta de imágenes ilustrativas.
 */
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

/** Vistas previas de las imágenes recién subidas (public_id -> secure_url), hasta que el formulario se guarde. */
const vistasPrevias = new Map<string, string>();

/** Qué mostrar de un valor de imagen: una URL guardada tal cual, o la vista previa de una subida recién hecha. */
export function vistaPreviaDe(valor: string | null | undefined): string | null {
  const v = (valor ?? '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) || v.startsWith('/')) return v;
  return vistasPrevias.get(v) ?? null;
}

/** ¿Es el public_id que genera el servidor para este uso? */
export const esPublicIdDeUso = (uso: UsoImagen, valor: unknown): valor is string =>
  typeof valor === 'string' && new RegExp(`^${uso}/(ilustrativas/)?panel_[0-9a-f]{32}$`).test(valor);

/**
 * Firma de UNA imagen del formulario (POST /api/subidas/imagen/firma). Una firma sin el public_id de su carpeta se
 * rechaza aquí, antes de subir nada.
 */
export async function pedirFirmaImagen(uso: UsoImagen, { ilustrativa = false }: { ilustrativa?: boolean } = {}): Promise<FirmaSubida> {
  const res = await apiClient.post<unknown>('/api/subidas/imagen/firma', ilustrativa ? { uso, ilustrativa: true } : { uso }, getBackendBaseUrl());
  const data = (res as { data?: FirmaSubida } | null)?.data;
  if (!data?.uploadUrl || !data.apiKey || !data.signature || !esPublicIdDeUso(uso, data.params?.public_id)) {
    throw new Error('La subida no está disponible por ahora. Vuelve a intentarlo más tarde.');
  }
  return data;
}

/** Imagen subida con la subida segura: el public_id que va en el formulario y la vista previa para mostrarla. */
export interface ImagenSubida {
  publicId: string;
  vistaPrevia: string;
}

/**
 * Sube UNA imagen de formulario con su propia firma (public_id del servidor en la carpeta del uso). El formulario
 * guarda `publicId`; el backend comprueba la firma y la cambia por la URL al guardar.
 */
export async function subirImagenSegura(file: File, uso: UsoImagen, opciones: { ilustrativa?: boolean } = {}): Promise<ImagenSubida> {
  const firma = await pedirFirmaImagen(uso, opciones);
  const listo = await comprimirImagenSiSupera(file, CLOUDINARY_SUBIDA_MAX_BYTES);
  const vistaPrevia = await enviarFirmado(listo, firma, MENSAJE_FALLO_IMAGEN);
  const publicId = firma.params.public_id;
  vistasPrevias.set(publicId, vistaPrevia);
  return { publicId, vistaPrevia };
}

/** Varias imágenes: una firma por archivo. */
export async function subirImagenesSeguras(files: FileList | File[], uso: UsoImagen, opciones: { ilustrativa?: boolean } = {}): Promise<ImagenSubida[]> {
  const subidas: ImagenSubida[] = [];
  for (const file of Array.from(files)) subidas.push(await subirImagenSegura(file, uso, opciones));
  return subidas;
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

