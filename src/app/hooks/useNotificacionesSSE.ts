'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { hasSession } from '../utils/security';
import { getBackendBaseUrl } from '../services/config';
import { runSharedAccessTokenRefresh } from '../utils/tokenRefresh';
import { MIRU_USER_STORAGE_UPDATED } from '../utils/userStorageSync';
import { crearConexionNotificaciones, opcionesFlujoNotificaciones } from '../utils/conexionNotificaciones';
import type { NotificacionEnVivo } from '../utils/avisosNotificaciones';

/**
 * Mantiene abierta la conexión SSE con `${getBackendBaseUrl()}/api/notificaciones/stream` mientras haya
 * sesión, también con la pestaña en segundo plano (openWhenHidden), y llama a `onNotificacion` por cada
 * evento `notificacion` (nunca por el latido `keep-alive` que el backend manda cada ~28 s).
 *
 * Reconexión, consulta de respaldo cada 60 s y refresco de sesión ante 401: utils/conexionNotificaciones.ts.
 * Login, logout o cambio de usuario (`MIRU_USER_STORAGE_UPDATED`) y la navegación cierran la conexión vieja
 * y abren otra comprobando `hasSession()` de nuevo. Al volver la red (`online`) se reintenta de inmediato.
 * La sesión viaja en la cookie httpOnly (`credentials: 'include'`).
 */
export function useNotificacionesSSE(
  onNotificacion: (n: NotificacionEnVivo | null) => void,
  onSondeo?: () => void,
): void {
  const onNotificacionRef = useRef(onNotificacion);
  const onSondeoRef = useRef(onSondeo);
  useEffect(() => {
    onNotificacionRef.current = onNotificacion;
    onSondeoRef.current = onSondeo;
  }, [onNotificacion, onSondeo]);
  const pathname = usePathname();
  const [sesionVersion, setSesionVersion] = useState(0);

  useEffect(() => {
    const onUpdate = () => setSesionVersion((v) => v + 1);
    window.addEventListener(MIRU_USER_STORAGE_UPDATED, onUpdate);
    return () => window.removeEventListener(MIRU_USER_STORAGE_UPDATED, onUpdate);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasSession()) return;

    const conexion = crearConexionNotificaciones({
      abrir: (manejadores, signal) =>
        fetchEventSource(`${getBackendBaseUrl()}/api/notificaciones/stream`, opcionesFlujoNotificaciones(manejadores, signal)),
      haySesion: hasSession,
      refrescarSesion: async () => (await runSharedAccessTokenRefresh()).kind === 'ok',
      alNotificacion: (n) => onNotificacionRef.current(n),
      sondear: () => (onSondeoRef.current ?? (() => onNotificacionRef.current(null)))(),
    });
    conexion.iniciar();
    const alVolverLaRed = () => conexion.reintentar();
    window.addEventListener('online', alVolverLaRed);

    return () => {
      window.removeEventListener('online', alVolverLaRed);
      conexion.detener();
    };
  }, [pathname, sesionVersion]);
}
