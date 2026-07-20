// Servicio del recomendador (reglas de asociación / Apriori)
// Usa POST del backend (NEXT_PUBLIC_API_URL + /api/recomendaciones)

import { getBackendBaseUrl } from './config';

/** Sugerencia devuelta por el backend, alineada con la tabla `reglas_asociacion`. */
export interface RecomendacionItem {
  item: string;
  basadoEn: string;
  confianza: number;
  lift: number;
  /** 'alta_confianza' (producto -> servicio, casi segura) | 'confianza_amplia' (servicio -> producto, exploratoria) */
  tipo: string;
  /** 'producto' | 'servicio' | null si el nombre no coincide con el catálogo actual. */
  tipoItem: 'producto' | 'servicio' | null;
  /** id real en productos/servicios, para enlazar al detalle. null si no se pudo resolver. */
  id: number | null;
  /** Miniatura resuelta del catálogo. null si no se encontró match o no tiene imagen. */
  imagenUrl: string | null;
}

export type RecomendacionesResult = { data: RecomendacionItem[]; error: string | null };

/**
 * Dado lo que el cliente ya tiene (nombres de servicios/productos en su
 * carrito o cita), obtiene sugerencias del recomendador. Endpoint público,
 * no requiere sesión. No lanza: si falla, devuelve `data: []` y el motivo
 * en `error`, para no romper la pantalla donde se use.
 */
export async function getRecomendaciones(
  items: string[],
  topN = 5,
  tipo?: 'alta_confianza' | 'confianza_amplia'
): Promise<RecomendacionesResult> {
  const itemsLimpios = items.map((i) => i.trim()).filter(Boolean);
  if (itemsLimpios.length === 0) return { data: [], error: null };

  try {
    const base = getBackendBaseUrl();
    const res = await fetch(`${base}/api/recomendaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ items: itemsLimpios, topN, tipo }),
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = `Error ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = j.message ?? j.error ?? msg;
      } catch {
        if (text) msg = text.slice(0, 120);
      }
      return { data: [], error: msg };
    }

    const response = await res.json();
    const list = Array.isArray(response?.data) ? (response.data as RecomendacionItem[]) : [];
    return { data: list, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al conectar con el servidor';
    return { data: [], error: msg };
  }
}
