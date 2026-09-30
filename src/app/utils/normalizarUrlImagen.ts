/**
 * Algunos backends o plantillas escapan la URL (ej. &#x2F; en vez de /).
 * Eso rompe next/image (hostname inválido como "&").
 */
export function normalizarUrlImagenExterna(url: string | null | undefined): string {
  if (url == null) return '';
  let s = String(url).trim();
  if (!s) return '';
  for (let i = 0; i < 8; i++) {
    const prev = s;
    s = s
      .replace(/&amp;/g, '&')
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        const code = parseInt(hex, 16);
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : _;
      })
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = parseInt(dec, 10);
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : _;
      });
    if (s === prev) break;
  }
  return s.trim();
}

export function urlImagenEsValida(url: string): boolean {
  const n = normalizarUrlImagenExterna(url);
  if (!n) return false;
  try {
    const u = new URL(n);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Origen de las fotos reales de producto (las que sube el equipo). */
export const ORIGEN_IMAGENES_PRODUCTO = 'https://res.cloudinary.com/';

/**
 * Regla única para mostrar la imagen de un producto: solo si está alojada en Cloudinary. Cualquier
 * otra URL (p. ej. el relleno "https://url.jpg" que hay en la base) se trata como "sin imagen" y la
 * pantalla muestra el placeholder de marca. Solo afecta a la presentación: no cambia el dato.
 */
export function imagenProductoMostrable(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const n = normalizarUrlImagenExterna(url);
  return n.startsWith(ORIGEN_IMAGENES_PRODUCTO) ? n : null;
}
