import type { Producto } from '../services/productos';
import { formatearPrecioMXN } from './formatoPrecio';

/**
 * Los cuatro fluidos AVYNA del hero: id real del catálogo → render propio en /public/hero/web.
 * Colores fijos: son el tono de cada fluido en la animación del hero, no colores de la interfaz.
 */
export const FLUIDOS_HERO = [
  { id: 34, clave: 'goji', color: '#7a1a1f' },
  { id: 33, clave: 'argan', color: '#d99a4e' },
  { id: 35, clave: 'platino', color: '#5b3fd6' },
  { id: 36, clave: 'hialuronico', color: '#d9728f' },
] as const;

export type ClaveFluido = (typeof FLUIDOS_HERO)[number]['clave'];

/** Ancho pintado del Goji, el LCP del home (lo comparten su <picture> y el preload de la página). */
export const TAMANO_GOJI = '(min-width: 768px) 170px, 115px';
export const SRCSET_GOJI_AVIF = '/hero/web/goji-240.avif 240w, /hero/web/goji-420.avif 420w';

export interface FluidoHero {
  id: number;
  clave: ClaveFluido;
  color: string;
  /** Nombre y precio salen del catálogo; si el API no los trae quedan vacíos (nunca inventados). */
  nombre: string | null;
  precio: string | null;
}

/**
 * Cruza los fluidos del hero con el catálogo real (GET /api/productos). Las imágenes no salen del
 * API (varias URL del catálogo están rotas): el hero usa los renders de /public/hero.
 */
export function seleccionarFluidos(productos: Producto[]): FluidoHero[] {
  return FLUIDOS_HERO.map((f) => {
    const p = productos.find((x) => String(x.id) === String(f.id));
    const precio = p ? formatearPrecioMXN(p.precio) : '';
    return { id: f.id, clave: f.clave, color: f.color, nombre: p?.nombre ?? null, precio: precio || null };
  });
}
