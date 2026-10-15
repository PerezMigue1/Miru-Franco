import type { PersonaConsentimiento } from '../../../services/consentimientosAdmin';

/**
 * Persona a la que corresponde una búsqueda, para exportar su CSV y su constancia. Solo cuando todas las filas
 * son de la misma cuenta y no puede haber otras fuera de la vista: una sola página de resultados, o una
 * búsqueda por su id exacto (la de nombre o correo es por coincidencia parcial).
 */
export function personaDeResultados(
  filas: { usuarioId: string | null; usuario: PersonaConsentimiento | null }[],
  busqueda: { q: string; totalPages: number },
): PersonaConsentimiento | null {
  const primera = filas[0]?.usuario;
  if (!primera) return null;
  if (!filas.every((f) => f.usuarioId === primera.id && f.usuario)) return null;
  if (busqueda.totalPages > 1 && busqueda.q.trim() !== primera.id) return null;
  return primera;
}

/** El CSV del backend es de una cuenta (usuarioId) o de todas: no hay CSV de una búsqueda de varias personas. */
export function csvDisponible(persona: PersonaConsentimiento | null, q: string): boolean {
  return !!persona || !q.trim();
}

/** Texto del botón del CSV: con una búsqueda activa sin persona elegida no se ofrece "de todas". */
export function etiquetaCsv(persona: PersonaConsentimiento | null, q: string): string {
  if (persona) return 'CSV de esta persona';
  return q.trim() ? 'Elige una persona para el CSV' : 'CSV de todas';
}

/** Por qué no hay CSV, según las filas a la vista (null si no hay filas: la tabla ya lo dice). */
export function avisoSinCsv(filas: { usuarioId: string | null; visitanteId: string | null }[]): string | null {
  if (filas.length === 0) return null;
  const personas = new Set(filas.map((f) => (f.usuarioId ? `u:${f.usuarioId}` : `v:${f.visitanteId ?? ''}`)));
  if (personas.size > 1) return 'La búsqueda incluye a varias personas: para el CSV de una sola, elige su nombre en la tabla.';
  if (!filas[0].usuarioId) {
    return 'Estos registros son de un visitante sin cuenta: el CSV por persona solo existe para cuentas. Para este visitante, descarga la constancia en PDF.';
  }
  return 'Puede haber más personas en otras páginas: para el CSV de esta persona, elige su nombre en la tabla.';
}

/**
 * Consulta de la pantalla. Cada acción cuenta un intento nuevo, así el efecto vuelve a pedir aunque se repita la
 * misma búsqueda (o se toque a la persona ya filtrada) y la pantalla no se queda en "Consultando…".
 */
export interface ConsultaConsentimientos {
  q: string;
  pagina: number;
  intento: number;
}

export const CONSULTA_INICIAL: ConsultaConsentimientos = { q: '', pagina: 1, intento: 0 };

export type AccionConsulta = { tipo: 'buscar'; texto: string } | { tipo: 'pagina'; pagina: number } | { tipo: 'recargar' };

export function reducirConsulta(estado: ConsultaConsentimientos, accion: AccionConsulta): ConsultaConsentimientos {
  switch (accion.tipo) {
    case 'buscar':
      return { q: accion.texto.trim(), pagina: 1, intento: estado.intento + 1 };
    case 'pagina':
      return { ...estado, pagina: Math.max(1, accion.pagina), intento: estado.intento + 1 };
    case 'recargar':
      return { ...estado, intento: estado.intento + 1 };
  }
}
