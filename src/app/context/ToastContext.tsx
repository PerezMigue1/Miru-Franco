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
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { setToastAPI, type ToastType } from '../utils/toast';
import Button from '../components/ui/Button';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  /** Marcado al vencer: se anima la salida y se quita al terminar (SALIDA_TOAST_MS). */
  saliendo?: boolean;
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

/** Igual a la transición de salida de .mf-aviso[data-saliendo] en sistema.css. */
const SALIDA_TOAST_MS = 160;

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CircleCheck size={18} aria-hidden />,
  error: <CircleX size={18} aria-hidden />,
  warning: <TriangleAlert size={18} aria-hidden />,
  info: <Info size={18} aria-hidden />,
};

/** Color del ícono por tipo: variantes "texto" de la paleta, AA en claro y oscuro. */
const toastIconColors: Record<ToastType, string> = {
  success: 'var(--success-texto)',
  error: 'var(--danger-texto)',
  warning: 'var(--warning-texto)',
  info: 'var(--info-texto)',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const toastIdRef = useRef(0);
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.map((x) => (x.id === id ? { ...x, saliendo: true } : x)));
      const salida = setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
        timersRef.current.delete(id);
      }, SALIDA_TOAST_MS);
      timersRef.current.set(id, salida);
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
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                data-saliendo={t.saliendo ? 'true' : undefined}
                className="mf-aviso flex items-start gap-3 p-4 pointer-events-auto"
              >
                <span className="mt-0.5 shrink-0" style={{ color: toastIconColors[t.type] }}>
                  {toastIcons[t.type]}
                </span>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--texto-cuerpo)' }}>
                  {t.message}
                </p>
              </div>
            ))}
          </div>,
          document.body
        )}

      {/* Modal de alerta (reemplaza window.alert) */}
      {alertState && (
        <div className="mf-velo fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div
            className="mf-dialogo max-w-md w-full"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="alert-title"
            aria-describedby="alert-desc"
          >
            <div className="px-6 pt-5 pb-5">
              <h2
                id="alert-title"
                className="text-lg font-bold mb-2"
                style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
              >
                Mirú Franco
              </h2>
              <p id="alert-desc" className="text-[0.9375rem] mb-6 whitespace-pre-line">
                {alertState.message}
              </p>
              <div className="flex justify-end">
                <Button onClick={handleAlertClose} autoFocus>
                  Aceptar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación (reemplaza window.confirm) */}
      {confirmState && (
        <div className="mf-velo fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div
            className="mf-dialogo max-w-md w-full"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
          >
            <div className="px-6 pt-5 pb-5">
              <h2
                id="confirm-title"
                className="text-lg font-bold mb-2"
                style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
              >
                {confirmState.title ?? 'Confirmar'}
              </h2>
              <p id="confirm-desc" className="text-[0.9375rem] mb-6 whitespace-pre-line">
                {confirmState.message}
              </p>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <Button variant="outline" onClick={() => handleConfirmResponse(false)}>
                  {confirmState.cancelText}
                </Button>
                <Button onClick={() => handleConfirmResponse(true)} autoFocus>
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
