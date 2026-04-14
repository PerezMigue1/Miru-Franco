import { getBackendBaseUrl } from '../services/config';
import { getToken, persistAccessTokenOnly } from './security';

export type SharedRefreshResult =
  | { kind: 'ok'; token: string }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'failed' };

/**
 * El backend puede invalidar el access token anterior al emitir uno nuevo.
 * Si varias peticiones llaman a /api/auth/refresh a la vez, una puede recibir
 * "Token revocado" aunque la sesión sea válida. Una sola promesa en vuelo evita esa carrera.
 */
let refreshInFlight: Promise<SharedRefreshResult> | null = null;

export async function runSharedAccessTokenRefresh(): Promise<SharedRefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  const tokenInicial = getToken();
  if (!tokenInicial) {
    return { kind: 'failed' };
  }

  refreshInFlight = (async (): Promise<SharedRefreshResult> => {
    try {
      const BACKEND_BASE = getBackendBaseUrl();
      const bearer = getToken() ?? tokenInicial;
      const refreshResponse = await fetch(`${BACKEND_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const errorText = await refreshResponse.text();
      let errorData: { message?: string; error?: string } = {};
      try {
        errorData = errorText ? JSON.parse(errorText) : {};
      } catch {
        errorData = { message: errorText };
      }
      const message = errorData.message || errorData.error || '';

      if (refreshResponse.ok) {
        let data: { token?: string } = {};
        try {
          data = errorText ? JSON.parse(errorText) : {};
        } catch {
          data = {};
        }
        if (data.token) {
          persistAccessTokenOnly(data.token);
          return { kind: 'ok', token: data.token };
        }
        return { kind: 'failed' };
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
