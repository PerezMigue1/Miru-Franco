/**
 * API global de notificaciones y alertas.
 * Permite llamar showAlert, showConfirm y showToast desde cualquier parte
 * (incluyendo servicios, hooks, interceptors) sin depender de React context.
 * El ToastProvider registra las funciones reales al montarse.
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAPI {
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string, options?: { title?: string; confirmText?: string; cancelText?: string }) => Promise<boolean>;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
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

export function showToast(message: string, type: ToastType = 'info', duration = 4000): void {
  if (typeof window === 'undefined') return;
  if (api?.showToast) return api.showToast(message, type, duration);
}
