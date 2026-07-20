/**
 * Subida desde el navegador directo a Cloudinary (upload preset unsigned).
 * No usa tu API Nest ni rutas de Next: solo `fetch` a api.cloudinary.com.
 *
 * Si el archivo supera ~9 MB, se comprime en el navegador (JPEG) para respetar el límite
 * típico del plan gratuito de Cloudinary (10 MB por archivo).
 *
 * En .env.local deben existir (obligatorio el prefijo NEXT_PUBLIC_ para que el cliente las vea):
 * - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 * - NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PRODUCTOS o NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 *
 * El preset en Cloudinary: Signing mode = **Unsigned**.
 */

import { comprimirImagenSiSupera, CLOUDINARY_SUBIDA_MAX_BYTES } from './comprimirImagenCliente';

function getCloudinaryUploadUrl(): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) {
    throw new Error(
      'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME no está definida. Añádela en .env.local y reinicia el servidor de desarrollo.'
    );
  }
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

const presetProductos =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PRODUCTOS ||
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const presetServicios = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_SERVICIOS;
const presetPerfil =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATARES ||
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATAR ||
  presetProductos;

export async function subirImagenCloudinary(
  file: File,
  preset: string = presetProductos || ''
): Promise<string> {
  if (!preset) {
    throw new Error(
      'Ningún upload preset configurado. Añade NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PRODUCTOS o NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET en .env.local'
    );
  }
  const listo = await comprimirImagenSiSupera(file, CLOUDINARY_SUBIDA_MAX_BYTES);

  const formData = new FormData();
  formData.append('file', listo);
  formData.append('upload_preset', preset);

  const res = await fetch(getCloudinaryUploadUrl(), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    let raw = err?.error?.message || 'Error al subir la imagen';
    if (typeof raw === 'string' && raw.includes('File size too large')) {
      raw =
        'La imagen supera el límite de tamaño de tu plan en Cloudinary (~10 MB). El navegador debería comprimirla automáticamente; si sigue fallando, usa una foto más pequeña o revisa el plan en cloudinary.com/pricing.';
    }
    if (
      typeof raw === 'string' &&
      (raw.includes('whitelisted') ||
        raw.includes('unsigned') ||
        raw.includes('Upload preset'))
    ) {
      throw new Error(
        'Cloudinary: el upload preset debe ser Unsigned. En cloudinary.com → Settings → Upload → Upload presets.'
      );
    }
    throw new Error(raw);
  }

  const data = (await res.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url ?? data.url;
  if (!url) throw new Error('Cloudinary no devolvió la URL de la imagen');
  return url;
}

/**
 * Sube un PDF (no una imagen) a Cloudinary usando el mismo endpoint/preset — Cloudinary
 * acepta PDFs vía `image/upload` (los trata como recurso convertible). A diferencia de
 * `subirImagenCloudinary`, NO pasa por `comprimirImagenSiSupera` (que asume que el archivo
 * se puede decodificar como `<img>`; un PDF fallaría ahí). Usado para el PDF real del CFDI
 * que sube el usuario — nunca genera ni compone un PDF fiscal, solo lo transporta.
 */
export async function subirPdfCloudinary(
  file: File,
  preset: string = presetProductos || ''
): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error('El archivo debe ser un PDF.');
  }
  if (!preset) {
    throw new Error(
      'Ningún upload preset configurado. Añade NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PRODUCTOS o NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET en .env.local'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  const res = await fetch(getCloudinaryUploadUrl(), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    let raw = err?.error?.message || 'Error al subir el PDF';
    if (
      typeof raw === 'string' &&
      (raw.includes('whitelisted') || raw.includes('unsigned') || raw.includes('Upload preset'))
    ) {
      throw new Error(
        'Cloudinary: el upload preset debe ser Unsigned. En cloudinary.com → Settings → Upload → Upload presets.'
      );
    }
    throw new Error(raw);
  }

  const data = (await res.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url ?? data.url;
  if (!url) throw new Error('Cloudinary no devolvió la URL del PDF');
  return url;
}

export async function subirImagenesCloudinary(
  files: FileList | File[],
  preset: string = presetProductos || ''
): Promise<string[]> {
  const list = Array.from(files);
  return Promise.all(list.map((file) => subirImagenCloudinary(file, preset)));
}

export const PRESET_PRODUCTOS = presetProductos;
export const PRESET_SERVICIOS = presetServicios;
export const PRESET_PERFIL = presetPerfil;

const MAX_PERFIL_BYTES = 5 * 1024 * 1024;

export async function subirFotoPerfilCloudinary(file: File): Promise<string> {
  const preset = presetPerfil || presetProductos || '';
  if (!preset) {
    throw new Error(
      'Configura NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATARES o NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET en .env.local'
    );
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (JPG, PNG, WebP, etc.).');
  }
  const paraPerfil = await comprimirImagenSiSupera(file, MAX_PERFIL_BYTES);
  if (paraPerfil.size > MAX_PERFIL_BYTES) {
    throw new Error('La imagen no debe superar 5 MB (ni siquiera tras comprimirla).');
  }
  return subirImagenCloudinary(paraPerfil, preset);
}
