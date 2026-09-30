import { urlsGaleriaProductoCatalogo, type Producto } from '../services/productos';
import { urlCloudinaryTransformada } from './cloudinaryUrl';
import { formatearPrecioMXN } from './formatoPrecio';

/** Datos mínimos que necesita el hero (servidor → cliente): nada inventado, todo del catálogo. */
export interface ProductoHero {
  id: string | number;
  nombre: string;
  marca?: string;
  precio: string;
  /** Foto 3:4 recortada por Cloudinary (600×800) para tarjetas y texturas WebGL. */
  imagen: string;
}

/** Recorte 3:4 con encuadre automático; Cloudinary responde con CORS abierto (texturas WebGL). */
export const TRANSFORMACION_HERO = 'c_fill,g_auto,w_600,h_800,f_auto,q_auto';

/**
 * Elige productos reales para el hero: activos (disponibles) y con imagen, variando categoría
 * para que la vitrina no muestre cinco champús iguales. El orden de entrada decide el resultado
 * (la home ya baraja el catálogo en cada regeneración).
 */
export function seleccionarProductosHero(productos: Producto[], maximo = 7): ProductoHero[] {
  const candidatos = productos
    .filter((p) => p.disponible !== false)
    .map((p) => ({ p, url: urlsGaleriaProductoCatalogo(p)[0] }))
    .filter((x): x is { p: Producto; url: string } => typeof x.url === 'string' && x.url.startsWith('http'));

  const elegidos: { p: Producto; url: string }[] = [];
  const categorias = new Set<string>();
  for (const c of candidatos) {
    if (elegidos.length >= maximo) break;
    const cat = (c.p.categoria || '').toLowerCase();
    if (categorias.has(cat)) continue;
    categorias.add(cat);
    elegidos.push(c);
  }
  for (const c of candidatos) {
    if (elegidos.length >= maximo) break;
    if (!elegidos.includes(c)) elegidos.push(c);
  }

  return elegidos.map(({ p, url }) => ({
    id: p.id,
    nombre: p.nombre,
    marca: p.marca || undefined,
    precio: formatearPrecioMXN(p.precio),
    imagen: urlCloudinaryTransformada(url, TRANSFORMACION_HERO),
  }));
}
