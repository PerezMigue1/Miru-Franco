/**
 * Subida de imágenes a Cloudinary (Upload Preset).
 * La carpeta (miru/productos, miru/servicios) se configura en el preset en Cloudinary.
 * Guía: FRONTEND_PASOS.md
 */

function getCloudinaryUrl(): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error(
      'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME no está configurada. Añádela en .env.local'
    );
  }
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

const presetProductos =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PRODUCTOS ||
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const presetServicios = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_SERVICIOS;

/**
 * Sube un archivo a Cloudinary usando el Upload Preset.
 * La carpeta está definida en el preset en Cloudinary (no se envía aquí).
 * @param file - Archivo de imagen
 * @param preset - Nombre del preset: 'ml_productos', 'ml_servicios', etc. Por defecto el de productos.
 * @returns URL de la imagen (secure_url)
 */
export async function subirImagenCloudinary(
  file: File,
  preset: string = presetProductos || ''
): Promise<string> {
  if (!preset) {
    throw new Error(
      'Ningún preset de Cloudinary configurado. Añade NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PRODUCTOS o NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET en .env.local'
    );
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  const res = await fetch(getCloudinaryUrl(), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message || 'Error al subir la imagen');
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error('Cloudinary no devolvió la URL de la imagen');
  return data.secure_url;
}

/**
 * Sube varias imágenes con el mismo preset.
 */
export async function subirImagenesCloudinary(
  files: FileList | File[],
  preset: string = presetProductos || ''
): Promise<string[]> {
  const list = Array.from(files);
  const urls = await Promise.all(list.map((file) => subirImagenCloudinary(file, preset)));
  return urls;
}

/** Preset de productos (para usar en formularios). */
export const PRESET_PRODUCTOS = presetProductos;
/** Preset de servicios (para usar en formularios). */
export const PRESET_SERVICIOS = presetServicios;
