/** Evento para refrescar UI (header, etc.) cuando cambia `localStorage.user`. */
export const MIRU_USER_STORAGE_UPDATED = 'miru-user-updated';

export function emitMiruUserStorageUpdated(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(MIRU_USER_STORAGE_UPDATED));
  } catch {
    /* ignore */
  }
}
