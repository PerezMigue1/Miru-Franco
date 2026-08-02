'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getToken } from '../utils/security';
import { getBackendBaseUrl } from '../services/config';
import { runSharedAccessTokenRefresh } from '../utils/tokenRefresh';
import { MIRU_USER_STORAGE_UPDATED } from '../utils/userStorageSync';

/** Distingue "el token que traíamos ya no sirve" de un corte de red transitorio:
 *  solo la primera debe saltarse el backoff automático de la librería y pasar
 *  por el mismo refresh compartido que usa client.ts antes de reintentar. */
class SseAuthError extends Error {}

/**
 * Mantiene abierta una conexión SSE a `${getBackendBaseUrl()}/api/notificaciones/stream`
 * mientras haya sesión, y llama a `onNotificacion` por cada evento real (nunca
 * por los `type: 'keep-alive'` que el backend manda cada ~28s solo para que el
 * proxy de Render no corte la conexión ociosa).
 *
 * No guarda su propio estado de notificaciones — quien use el hook decide qué
 * hacer con `onNotificacion` (en Header.tsx: volver a llamar
 * `listarNotificaciones()`, la misma función que ya alimenta
 * `notificationsCount`), para no crear una fuente de verdad paralela.
 *
 * Reconexión:
 * - Login/logout/navegación: el efecto depende de `pathname` (mismo mecanismo
 *   que ya usa el `useEffect` de notificaciones de Header.tsx) y de un
 *   listener de `MIRU_USER_STORAGE_UPDATED` — cualquiera de los dos hace que
 *   se limpie la conexión vieja (cleanup del efecto) y se abra una nueva
 *   leyendo `getToken()` de nuevo.
 * - Token vencido/revocado a media conexión (el caso "zombie" que había que
 *   evitar): `fetchEventSource` reutiliza el MISMO objeto `headers` en todos
 *   sus reintentos automáticos (backoff y el que dispara al volver de una
 *   pestaña oculta) — verificado leyendo su código fuente
 *   (`node_modules/@microsoft/fetch-event-source/lib/cjs/fetch.js`), no hay
 *   forma de que la librería SOLA recalcule el header en un reintento interno.
 *   Por eso, si `onopen` ve un 401, se lanza `SseAuthError` para que la
 *   librería NO reintente con el mismo token: el `catch` de este hook llama a
 *   `runSharedAccessTokenRefresh()` (el mismo refresh compartido que usa
 *   `client.ts`) y, si da un token válido, abre una conexión NUEVA con
 *   `headers` construidos en ese momento a partir de `getToken()`.
 */
export function useNotificacionesSSE(onNotificacion: () => void): void {
  const onNotificacionRef = useRef(onNotificacion);
  useEffect(() => {
    onNotificacionRef.current = onNotificacion;
  }, [onNotificacion]);
  const pathname = usePathname();
  const [sesionVersion, setSesionVersion] = useState(0);

  // Login (o cualquier cambio de usuario) sin necesariamente cambiar de ruta:
  // bumpea `sesionVersion` para que el efecto de abajo limpie la conexión
  // vieja y abra una nueva leyendo el token otra vez — mismo evento al que ya
  // reacciona el efecto de notificaciones de Header.tsx.
  useEffect(() => {
    const onUpdate = () => setSesionVersion((v) => v + 1);
    window.addEventListener(MIRU_USER_STORAGE_UPDATED, onUpdate);
    return () => window.removeEventListener(MIRU_USER_STORAGE_UPDATED, onUpdate);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getToken()) return;

    let detenido = false;
    let controller = new AbortController();

    const conectar = async () => {
      const token = getToken();
      if (!token || detenido) return;

      controller = new AbortController();
      try {
        await fetchEventSource(`${getBackendBaseUrl()}/api/notificaciones/stream`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
          async onopen(response) {
            if (response.ok && response.headers.get('content-type')?.startsWith('text/event-stream')) {
              return;
            }
            if (response.status === 401) throw new SseAuthError('SSE respondió 401');
            throw new Error(`SSE onopen: HTTP ${response.status}`);
          },
          onmessage(ev) {
            if (ev.event === 'keep-alive') return;
            onNotificacionRef.current();
          },
          onerror(err) {
            if (err instanceof SseAuthError) throw err; // no reintentar con el mismo token vencido
            // errores de red/servidor transitorios: dejar que fetchEventSource reintente con su backoff
          },
        });
      } catch (err) {
        if (detenido || controller.signal.aborted) return;
        if (err instanceof SseAuthError) {
          const resultado = await runSharedAccessTokenRefresh();
          if (!detenido && resultado.kind === 'ok') {
            void conectar();
          }
          // Si el refresh falla, no insistimos aquí: useAutoRefreshToken y el
          // interceptor de client.ts ya se encargan de limpiar la sesión y
          // redirigir a /login cuando el token realmente ya no sirve.
        }
      }
    };

    void conectar();

    return () => {
      detenido = true;
      controller.abort();
    };
  }, [pathname, sesionVersion]);
}
