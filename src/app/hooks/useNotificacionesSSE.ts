'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getToken } from '../utils/security';
import { getBackendBaseUrl } from '../services/config';
import { runSharedAccessTokenRefresh } from '../utils/tokenRefresh';
import { MIRU_USER_STORAGE_UPDATED } from '../utils/userStorageSync';

/** Distingue "el token que traíamos ya no sirve" de un corte de red transitorio:
 *  solo la primera debe pasar por el mismo refresh compartido que usa
 *  client.ts antes de reintentar. */
class SseAuthError extends Error {}

const BASE_RETRY_MS = 1000;
const MAX_RETRY_MS = 30_000;
const MAX_RETRIES = 8;
/** Cuántas veces se intenta "401 -> refresh -> reconectar" antes de rendirse.
 *  Si el token sigue sin servir después de refrescarlo, algo más profundo
 *  falló (sesión revocada, etc.) y useAutoRefreshToken/client.ts ya se
 *  encargan de cerrar sesión — insistir aquí solo alimentaría un bucle. */
const MAX_AUTH_RETRIES = 1;

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
 * - `onerror` SIEMPRE relanza el error (nunca retorna un intervalo): esto
 *   evita que `fetchEventSource` reintente POR SU CUENTA reutilizando el
 *   MISMO objeto `headers` interno — verificado leyendo su código fuente
 *   (`node_modules/@microsoft/fetch-event-source/lib/cjs/fetch.js`), ese
 *   reintento interno es el que arrastra un `Last-Event-ID` ya capturado
 *   entre reconexiones sin que este hook se entere. Todo reintento pasa por
 *   el `catch` de abajo, con headers frescos desde `getToken()`.
 * - Token vencido/revocado a media conexión: si `onopen` ve un 401, se lanza
 *   `SseAuthError`; el `catch` llama a `runSharedAccessTokenRefresh()` (el
 *   mismo refresh compartido que usa `client.ts`) y, si da un token válido,
 *   abre una conexión nueva. Si el 401 persiste tras `MAX_AUTH_RETRIES`
 *   refrescos, se deja de reconectar (queda el poll-on-focus de Header.tsx).
 * - Errores de red/servidor: backoff exponencial propio (`BASE_RETRY_MS`,
 *   doblando hasta `MAX_RETRY_MS`), con tope de `MAX_RETRIES` intentos. Al
 *   agotarlos se deja de reconectar — nunca queda una pestaña reintentando en
 *   bucle indefinido; el poll-on-focus existente en Header.tsx sigue vivo
 *   como red de respaldo.
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
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryCount = 0;
    let authRetryCount = 0;

    const conectar = async () => {
      const token = getToken();
      if (!token || detenido) return;

      const headers = { Authorization: `Bearer ${token}` };

      controller = new AbortController();
      try {
        await fetchEventSource(`${getBackendBaseUrl()}/api/notificaciones/stream`, {
          signal: controller.signal,
          headers,
          async onopen(response) {
            if (response.ok && response.headers.get('content-type')?.startsWith('text/event-stream')) {
              // Conexión sana: se reinician los contadores para que una falla
              // futura (horas después) vuelva a tener su propio presupuesto
              // de reintentos, en vez de heredar el de una falla ya resuelta.
              retryCount = 0;
              authRetryCount = 0;
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
            // Siempre relanzar: nunca dejar que fetchEventSource reintente
            // internamente (ver docstring de arriba). El backoff y el tope de
            // reintentos los controla este hook en el catch de abajo.
            throw err;
          },
        });
      } catch (err) {
        if (detenido || controller.signal.aborted) return;

        if (err instanceof SseAuthError) {
          authRetryCount += 1;
          if (authRetryCount > MAX_AUTH_RETRIES) return; // 401 persiste tras refresh: no insistir más
          const resultado = await runSharedAccessTokenRefresh();
          if (!detenido && resultado.kind === 'ok') {
            void conectar();
          }
          // Si el refresh falla, no insistimos aquí: useAutoRefreshToken y el
          // interceptor de client.ts ya se encargan de limpiar la sesión y
          // redirigir a /login cuando el token realmente ya no sirve.
          return;
        }

        retryCount += 1;
        if (retryCount > MAX_RETRIES) return; // se agotaron los reintentos: cae al poll-on-focus de Header.tsx

        const delay = Math.min(BASE_RETRY_MS * 2 ** (retryCount - 1), MAX_RETRY_MS);
        retryTimer = setTimeout(() => {
          if (!detenido) void conectar();
        }, delay);
      }
    };

    void conectar();

    return () => {
      detenido = true;
      clearTimeout(retryTimer);
      controller.abort();
    };
  }, [pathname, sesionVersion]);
}
