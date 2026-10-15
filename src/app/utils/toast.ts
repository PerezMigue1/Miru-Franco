/**
 * API global de notificaciones y alertas.
 * Permite llamar showAlert, showConfirm y showToast desde cualquier parte
 * (incluyendo servicios, hooks, interceptors) sin depender de React context.
 * El ToastProvider registra las funciones reales al montarse.
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Botón opcional del aviso (p. ej. "Ver" en una notificación nueva). Al pulsarlo se ejecuta y el aviso se cierra. */
export interface AccionToast {
  etiqueta: string;
  alHacerClic: () => void;
}

export interface ToastAPI {
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string, options?: { title?: string; confirmText?: string; cancelText?: string }) => Promise<boolean>;
  showToast: (message: string, type?: ToastType, duration?: number, accion?: AccionToast) => void;
}

let api: ToastAPI | null = null;

export function setToastAPI(newApi: ToastAPI) {
  api = newApi;
}

export async function showAlert(message: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (api?.showAlert) return api.showAlert(message);
  // Fallback antes de que el provider esté montado (SSR o hidratación)
  return new Promise((resolve) => {
    window.alert(message);
    resolve();
  });
}

export async function showConfirm(
  message: string,
  options?: { title?: string; confirmText?: string; cancelText?: string }
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (api?.showConfirm) return api.showConfirm(message, options);
  return new Promise((resolve) => {
    resolve(window.confirm(message));
  });
}

export function showToast(message: string, type: ToastType = 'info', duration = 4000, accion?: AccionToast): void {
  if (typeof window === 'undefined') return;
  if (api?.showToast) return accion ? api.showToast(message, type, duration, accion) : api.showToast(message, type, duration);
}
