import { getServicios, type Servicio, type ServiciosResult } from '../services/servicios';

/**
 * Cifras y listas de servicios que se muestran al público (pie de página, home y "Sobre nosotros"). Salen
 * siempre del catálogo real de servicios activos: si el API falla o no hay servicios, no se muestra nada,
 * nunca una cifra o un nombre inventado.
 */

const activos = (servicios: Servicio[]) => servicios.filter((s) => s.activo !== false);

/** "N Servicios disponibles" con el conteo real de activos; null si no hay ninguno (o el API falló). */
export function cifraServiciosDisponibles(servicios: Servicio[]): { num: string; label: string } | null {
  const n = activos(servicios).length;
  if (n === 0) return null;
  return { num: String(n), label: n === 1 ? 'Servicio disponible' : 'Servicios disponibles' };
}

/** Máximo de servicios que lista el pie de página. */
const MAX_SERVICIOS_FOOTER = 6;

/** Nombres de los servicios activos para el pie: sin vacíos ni repetidos, en el orden del catálogo. */
export function nombresServiciosFooter(servicios: Servicio[]): string[] {
  const nombres = activos(servicios)
    .map((s) => s.nombre.trim())
    .filter(Boolean);
  return [...new Set(nombres)].slice(0, MAX_SERVICIOS_FOOTER);
}

/** El pie se pinta en el navegador: guarda la lista una hora (como revalidate 3600) para no pedirla en cada página. */
const VIGENCIA_MS = 3600 * 1000;
let enCache: { nombres: string[]; hasta: number } | null = null;

/**
 * Nombres de servicios para el pie de página. Nunca lanza: si el API responde con error o no responde,
 * devuelve una lista vacía (y no la guarda, para volver a intentar en la siguiente página).
 */
export async function cargarNombresServiciosFooter(
  obtener: () => Promise<ServiciosResult> = getServicios,
  ahora: number = Date.now(),
): Promise<string[]> {
  if (enCache && ahora < enCache.hasta) return enCache.nombres;
  try {
    const { data, error } = await obtener();
    if (error) return [];
    const nombres = nombresServiciosFooter(data);
    enCache = { nombres, hasta: ahora + VIGENCIA_MS };
    return nombres;
  } catch {
    return [];
  }
}
