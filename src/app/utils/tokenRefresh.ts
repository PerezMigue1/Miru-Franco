import { getBackendBaseUrl } from '../services/config';
import { hasSession, markSessionRefreshed } from './security';

export type SharedRefreshResult =
  | { kind: 'ok' }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'failed' };

/**
 * El backend invalida el access token anterior al emitir uno nuevo (rota la cookie httpOnly).
 * Si varias peticiones llaman a /api/auth/refresh a la vez, una puede recibir
 * "Token revocado" aunque la sesión sea válida. Una sola promesa en vuelo evita esa carrera.
 */
let refreshInFlight: Promise<SharedRefreshResult> | null = null;

export async function runSharedAccessTokenRefresh(): Promise<SharedRefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  if (!hasSession()) {
    return { kind: 'failed' };
  }

  refreshInFlight = (async (): Promise<SharedRefreshResult> => {
    try {
      const BACKEND_BASE = getBackendBaseUrl();
      // Sin Authorization: la cookie de sesión viaja con credentials. El backend responde con
      // Set-Cookie (token nuevo) y sin token en el cuerpo.
      const refreshResponse = await fetch(`${BACKEND_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const responseText = await refreshResponse.text();
      let data: { success?: boolean; message?: string; error?: string; renovarEnSegundos?: number } = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { message: responseText };
      }
      const message = data.message || data.error || '';

      if (refreshResponse.ok) {
        if (data.success === false) return { kind: 'failed' };
        markSessionRefreshed(data.renovarEnSegundos);
        return { kind: 'ok' };
      }

      if (refreshResponse.status === 401 && message.trim()) {
        return { kind: 'unauthorized', message };
      }
      return { kind: 'failed' };
    } catch {
      return { kind: 'failed' };
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
