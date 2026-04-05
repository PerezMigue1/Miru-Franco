/**
 * Reduce peso/dimensiones en el cliente para caber en el límite de subida de Cloudinary
 * (plan gratuito ~10 MB por archivo).
 */

const MB = 1024 * 1024;

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen (formato no soportado en el navegador, p. ej. algunos HEIC).'));
    img.src = src;
  });
}

function encajar(w: number, h: number, maxLado: number): { w: number; h: number } {
  const m = Math.max(w, h);
  if (m <= maxLado) return { w, h };
  const s = maxLado / m;
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

function blobJpeg(canvas: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', calidad));
}

/**
 * Si supera `maxBytes`, reexporta como JPEG redimensionando y bajando calidad hasta entrar en el límite.
 */
export async function comprimirImagenSiSupera(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await cargarImagen(url);
    let maxLado = Math.min(2400, Math.max(img.naturalWidth, img.naturalHeight, 1));
    let calidad = 0.88;

    for (let ronda = 0; ronda < 28; ronda++) {
      const { w, h } = encajar(img.naturalWidth, img.naturalHeight, maxLado);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Este navegador no permite comprimir la imagen (canvas).');
      }
      ctx.drawImage(img, 0, 0, w, h);

      const blob = await blobJpeg(canvas, calidad);
      if (!blob) {
        throw new Error('No se pudo generar la versión comprimida.');
      }
      if (blob.size <= maxBytes) {
        const base = file.name.replace(/\.[^/.]+$/, '') || 'imagen';
        return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      }

      calidad -= 0.07;
      if (calidad < 0.48) {
        calidad = 0.85;
        maxLado = Math.round(maxLado * 0.82);
        if (maxLado < 560) {
          throw new Error(
            'La imagen sigue siendo demasiado pesada para el límite de Cloudinary (~10 MB en plan gratuito). Prueba otra foto o comprímela fuera del sitio.'
          );
        }
      }
    }

    throw new Error('No se pudo reducir la imagen lo suficiente.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Margen bajo el límite típico de 10 MB de Cloudinary. */
export const CLOUDINARY_SUBIDA_MAX_BYTES = 9 * MB;
