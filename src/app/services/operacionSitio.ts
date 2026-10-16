import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import type { HorarioDia } from './configuracionSitio';
import type { DefinicionRegla, DiaInhabil } from '../utils/reglasNegocio';

/**
 * Operaciones > Horario y días inhábiles (permiso horario:editar). El backend valida y guarda con historial igual que
 * Admin > Configuración del sitio, y avisa a la web para que el sitio lo muestre al momento.
 */
export interface DatosOperacionSitio {
  horario: { valor: { dias?: HorarioDia[] } | null; actualizadoEn: string; actualizadoPor: string | null } | null;
  diasInhabiles: DiaInhabil[];
  definicionDiasInhabiles: DefinicionRegla | null;
  diasInhabilesActualizado: { actualizadoEn: string; actualizadoPor: string | null } | null;
}

// Un 403 se muestra en la misma pantalla en vez de ir a /403.
const EN_PANTALLA = () => ({ customBase: getBackendBaseUrl(), skip403Redirect: true });

export function obtenerOperacionSitio(): Promise<DatosOperacionSitio> {
  return apiClient.get<DatosOperacionSitio>('/api/operacion-sitio', EN_PANTALLA());
}
/** `actualizadoEn`: la versión que se cargó; si otra persona guardó después, el backend responde 409. */
export function guardarHorarioOperacion(dias: HorarioDia[], actualizadoEn?: string | null): Promise<unknown> {
  return apiClient.put<unknown>('/api/operacion-sitio/horario', { valor: { dias }, ...(actualizadoEn ? { actualizadoEn } : {}) }, EN_PANTALLA());
}
export function guardarDiasInhabilesOperacion(diasInhabiles: DiaInhabil[], actualizadoEn?: string | null): Promise<unknown> {
  return apiClient.put<unknown>('/api/operacion-sitio/dias-inhabiles', { diasInhabiles, ...(actualizadoEn ? { actualizadoEn } : {}) }, EN_PANTALLA());
}
