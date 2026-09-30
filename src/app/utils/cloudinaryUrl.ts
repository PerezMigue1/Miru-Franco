/**
 * Pide a Cloudinary una versión transformada de una imagen ya subida (recorte, tamaño, formato
 * y calidad automáticos) insertando la transformación después de `/upload/`. No toca URLs de
 * otros hosts ni las que ya traen una transformación.
 */
export function urlCloudinaryTransformada(url: string, transformacion: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== 'res.cloudinary.com') return url;
  const marcador = '/upload/';
  const i = parsed.pathname.indexOf(marcador);
  if (i === -1) return url;
  const resto = parsed.pathname.slice(i + marcador.length);
  // Si el primer segmento ya es una transformación (p. ej. "c_fill,w_600"), se respeta.
  const primerSegmento = resto.split('/')[0] ?? '';
  if (/^[a-z]{1,3}_[^/]+$/.test(primerSegmento) && !/^v\d+$/.test(primerSegmento)) return url;
  parsed.pathname = `${parsed.pathname.slice(0, i + marcador.length)}${transformacion}/${resto}`;
  return parsed.toString();
}
