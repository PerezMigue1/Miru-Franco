/**
 * Algunos backends o plantillas escapan la URL (ej. &#x2F; en vez de /).
 * Eso rompe next/image (hostname inválido como "&").
 */
export function normalizarUrlImagenExterna(url: string | null | undefined): string {
  if (url == null) return '';
  let s = String(url).trim();
  if (!s) return '';
  s = s
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&#58;/g, ':');
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
