import type { Servicio } from '../services/servicios';
import { imagenProductoMostrable } from './normalizarUrlImagen';

/**
 * Una foto del mosaico de la galería: de un servicio real (GET /api/servicios) o de la galería administrada
 * (GET /api/galeria, ver services/galeria.ts aFotosGaleria), que trae su propio texto alternativo y puede no
 * estar ligada a un servicio (servicioId null: el visor no enlaza a ningún servicio).
 */
export interface FotoGaleria {
  url: string;
  servicioId: string | number | null;
  servicio: string;
  categoria?: string;
  /** Texto alternativo que escribió el equipo; sin él se usa "<servicio> en Mirú Franco". */
  alt?: string;
}

/**
 * Imagen de un servicio que se puede publicar: solo las que sube el equipo (Cloudinary), la misma regla
 * que las fotos de producto. Bancos de imágenes, relleno u otros hosts cuentan como "sin imagen" y la
 * pantalla muestra el monograma. Solo afecta a la presentación: no cambia el dato.
 */
export function imagenServicioMostrable(url: unknown): string | null {
  return imagenProductoMostrable(url);
}

/** Nombre de archivo que dejan los generadores de imágenes con IA (ChatGPT, DALL·E, Gemini, Midjourney). */
const ARCHIVO_GENERADO = /chatgpt[\s_-]*image|dall[\s_·.-]?e(?=[\s_.\-\d]|$)|gemini[\s_-]*generated|midjourney/i;

/**
 * Carpeta de las imágenes que el equipo marcó como ilustrativas al subirlas (firma `ilustrativa` del
 * backend: galeria/ilustrativas). Su nombre es aleatorio, así que la carpeta es lo que las distingue.
 */
const CARPETA_ILUSTRATIVAS = /\/ilustrativas\//i;

/**
 * ¿La imagen es generada con IA o ilustrativa? Las subidas marcadas como ilustrativas se reconocen por su
 * carpeta; las anteriores, por el nombre del archivo que dejan los generadores (no por la cuenta).
 */
export function esImagenGenerada(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const ruta = url.split(/[?#]/)[0];
  if (CARPETA_ILUSTRATIVAS.test(ruta)) return true;
  let archivo = ruta.split('/').pop() ?? '';
  try {
    archivo = decodeURIComponent(archivo);
  } catch {
    // Nombre con % sueltos: se revisa tal cual.
  }
  return ARCHIVO_GENERADO.test(archivo);
}

/**
 * Miniatura de la carta de servicios del home (64 px): ahí no cabe la insignia "Imagen ilustrativa", así que
 * una imagen generada con IA o ilustrativa no se muestra y sale el monograma.
 */
export function miniaturaDeServicio(servicio: Pick<Servicio, 'imagen' | 'imagenes'>): string | undefined {
  const url = servicio.imagen ?? servicio.imagenes?.[0];
  return url && !esImagenGenerada(url) ? url : undefined;
}

/**
 * Fotos de trabajo del salón. Fuente confirmada por el dueño del producto: las imágenes de los
 * servicios activos, que el equipo sube con "Subir foto" en el formulario de cada servicio.
 * Solo fotos del equipo (Cloudinary) y nunca imágenes generadas con IA: la sección dice "servicios
 * hechos en el salón". No publica fotos de clientas: ninguna foto está ligada a una clienta.
 * Sin fotos devuelve [] (la interfaz muestra un estado vacío; nunca imágenes de relleno).
 */
export function fotosDeServicios(servicios: Servicio[]): FotoGaleria[] {
  const vistas = new Set<string>();
  const fotos: FotoGaleria[] = [];
  for (const s of servicios) {
    if (s.activo === false) continue;
    const urls = s.imagenes?.length ? s.imagenes : s.imagen ? [s.imagen] : [];
    for (const original of urls) {
      const url = imagenServicioMostrable(original);
      if (!url || esImagenGenerada(url) || vistas.has(url)) continue;
      vistas.add(url);
      fotos.push({ url, servicioId: s.id, servicio: s.nombre, categoria: s.categoria || undefined });
    }
  }
  return fotos;
}
