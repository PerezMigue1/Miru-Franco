import type { Servicio } from '../services/servicios';

/** Una foto de la galería del salón: siempre sale de un servicio real (GET /api/servicios). */
export interface FotoGaleria {
  url: string;
  servicioId: string | number;
  servicio: string;
  categoria?: string;
}

/**
 * Fotos de trabajo del salón. Fuente confirmada por el dueño del producto: las imágenes de los
 * servicios activos, que el equipo sube desde /operacion/subir-imagenes y asigna a cada servicio.
 * Sin fotos devuelve [] (la interfaz muestra un estado vacío; nunca imágenes de relleno).
 */
export function fotosDeServicios(servicios: Servicio[]): FotoGaleria[] {
  const vistas = new Set<string>();
  const fotos: FotoGaleria[] = [];
  for (const s of servicios) {
    if (s.activo === false) continue;
    const urls = s.imagenes?.length ? s.imagenes : s.imagen ? [s.imagen] : [];
    for (const url of urls) {
      if (!url?.startsWith('http') || vistas.has(url)) continue;
      vistas.add(url);
      fotos.push({ url, servicioId: s.id, servicio: s.nombre, categoria: s.categoria || undefined });
    }
  }
  return fotos;
}
