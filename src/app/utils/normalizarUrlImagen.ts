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
