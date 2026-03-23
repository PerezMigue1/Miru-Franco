/**
 * Subida de imágenes a Cloudinary con upload_preset (sin API secret en el navegador).
 * El preset en el panel de Cloudinary debe tener Signing mode = **Unsigned**; si no, verás
 * "Upload preset must be whitelisted for unsigned uploads".
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
 * Preset para fotos de perfil (`subirFotoPerfilCloudinary`).
 * Prioridad: NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATARES → _AVATAR → preset de productos.
 */
const presetPerfil =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATARES ||
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATAR ||
  presetProductos;

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
    const raw = err?.error?.message || 'Error al subir la imagen';
    if (
      typeof raw === 'string' &&
      (raw.includes('whitelisted') ||
        raw.includes('unsigned') ||
        raw.includes('Upload preset'))
    ) {
      throw new Error(
        'Cloudinary: el upload preset debe permitir subidas sin firma. En cloudinary.com → Settings → Upload → ' +
          'Upload presets → edita el preset que usas (o crea uno nuevo) y en Signing mode elige «Unsigned». ' +
          'Ese nombre debe coincidir con NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATARES (o PRODUCTOS) en .env.local.'
      );
    }
    throw new Error(raw);
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
/** Preset recomendado para avatar / foto de perfil. */
export const PRESET_PERFIL = presetPerfil;

const MAX_PERFIL_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Sube imagen de perfil a Cloudinary (usa PRESET_PERFIL o el de productos).
 */
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
  if (file.size > MAX_PERFIL_BYTES) {
    throw new Error('La imagen no debe superar 5 MB.');
  }
  return subirImagenCloudinary(file, preset);
}
