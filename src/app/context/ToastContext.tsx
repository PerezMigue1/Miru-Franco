'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { setToastAPI, type ToastType } from '../utils/toast';
import Button from '../components/ui/Button';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface AlertState {
  message: string;
  resolve: () => void;
}

interface ConfirmState {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  resolve: (value: boolean) => void;
}

const ToastContext = createContext<{
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string, options?: { title?: string; confirmText?: string; cancelText?: string }) => Promise<boolean>;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const toastBorderColors: Record<ToastType, string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--enlaces-textos-interactivos)',
};

const toastIconColors: Record<ToastType, string> = {
  success: 'var(--logo-branding)',
  error: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--logo-branding)',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const toastIdRef = useRef(0);
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timersRef.current.delete(id);
    }, duration);
    timersRef.current.set(id, t);
  }, []);

  const showAlert = useCallback((message: string) => {
    return new Promise<void>((resolve) => {
      setAlertState({ message, resolve });
    });
  }, []);

  const handleAlertClose = useCallback(() => {
    setAlertState((prev) => {
      if (prev) {
        prev.resolve();
        return null;
      }
      return prev;
    });
  }, []);

  const showConfirm = useCallback(
    (
      message: string,
      options?: { title?: string; confirmText?: string; cancelText?: string }
    ) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({
          message,
          title: options?.title,
          confirmText: options?.confirmText ?? 'Aceptar',
          cancelText: options?.cancelText ?? 'Cancelar',
          resolve,
        });
      });
    },
    []
  );

  const handleConfirmResponse = useCallback((value: boolean) => {
    setConfirmState((prev) => {
      if (prev) {
        prev.resolve(value);
        return null;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    setToastAPI({
      showAlert,
      showConfirm,
      showToast,
    });
    return () => { setToastAPI({ showAlert: async () => {}, showConfirm: async () => false, showToast: () => {} }); };
  }, [showAlert, showConfirm, showToast]);

  return (
    <ToastContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}

      {/* Toasts flotantes arriba - solo en cliente para evitar hydration mismatch */}
      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 max-w-md w-full mx-4 pointer-events-none"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-4 rounded-lg shadow-lg pointer-events-auto animate-toast-enter"
                style={{
                  backgroundColor: 'var(--fondo-general)',
                  borderLeft: `4px solid ${toastBorderColors[t.type]}`,
                }}
              >
                <div
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: toastIconColors[t.type] }}
                >
                  {toastIcons[t.type]}
                </div>
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: 'var(--encabezados-alterno)' }}
                >
                  {t.message}
                </p>
              </div>
            ))}
          </div>,
          document.body
        )}

      {/* Modal de alerta (reemplaza window.alert) */}
      {alertState && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-xl"
            style={{ backgroundColor: 'var(--tarjetas-paneles)' }}
            role="alertdialog"
            aria-labelledby="alert-title"
            aria-describedby="alert-desc"
          >
            <div className="px-6 py-4">
              <h2
                id="alert-title"
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--logo-branding)' }}
              >
                Miru Franco
              </h2>
              <p
                id="alert-desc"
                className="text-sm mb-6 whitespace-pre-line"
                style={{ color: 'var(--logo-branding)' }}
              >
                {alertState.message}
              </p>
              <div className="flex justify-end">
                <Button onClick={handleAlertClose}>Aceptar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación (reemplaza window.confirm) */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-xl"
            style={{ backgroundColor: 'var(--tarjetas-paneles)' }}
            role="alertdialog"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
          >
            <div className="px-6 py-4">
              <h2
                id="confirm-title"
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--logo-branding)' }}
              >
                {confirmState.title ?? 'Confirmar'}
              </h2>
              <p
                id="confirm-desc"
                className="text-sm mb-6 whitespace-pre-line"
                style={{ color: 'var(--logo-branding)' }}
              >
                {confirmState.message}
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => handleConfirmResponse(false)}>
                  {confirmState.cancelText}
                </Button>
                <Button onClick={() => handleConfirmResponse(true)}>
                  {confirmState.confirmText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
