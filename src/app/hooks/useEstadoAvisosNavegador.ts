'use client';

import { useSyncExternalStore } from 'react';
import { showToast } from '../utils/toast';
import { estadoAvisosNavegador, pedirPermisoAvisos, textoEstadoAvisos, type EstadoAvisos } from '../utils/avisosNotificaciones';

/** Aviso interno para que la campana y el perfil se enteren del permiso nuevo (o de que el constructor falló). */
export const EVENTO_PERMISO_AVISOS = 'mf-avisos-permiso';

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO_PERMISO_AVISOS, avisar);
  // El permiso también cambia desde la configuración del navegador: se relee al volver a la pestaña.
  window.addEventListener('focus', avisar);
  return () => {
    window.removeEventListener(EVENTO_PERMISO_AVISOS, avisar);
    window.removeEventListener('focus', avisar);
  };
}

/**
 * Estado de la notificación del navegador (capa 2). null en el servidor y al hidratar (no hay Notification):
 * mismo HTML en ambos lados. 'no_soportado' en Android, iPhone o iPad, sin Notification o si el constructor ya
 * lanzó (utils/avisosNotificaciones.ts, motivoSinNativa).
 */
export function useEstadoAvisosNavegador(): EstadoAvisos | null {
  return useSyncExternalStore<EstadoAvisos | null>(suscribir, () => estadoAvisosNavegador(), () => null);
}

/** Avisa a todos los que leen el estado (p. ej. después de recordar que el constructor falló). */
export function avisarCambioPermiso(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_PERMISO_AVISOS));
}

/** "Activar avisos del navegador": el permiso de Notification se pide SOLO desde este clic. */
export async function activarAvisosNavegador(): Promise<EstadoAvisos> {
  const nuevo = await pedirPermisoAvisos();
  avisarCambioPermiso();
  if (nuevo === 'activados') showToast('Listo: te avisaremos aunque tengas el sitio en otra pestaña.', 'success');
  else if (nuevo === 'bloqueados') showToast(textoEstadoAvisos('bloqueados').detalle, 'warning', 8000);
  return nuevo;
}
