'use client';

import { useEffect, useId, type ReactNode } from 'react';

type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Vista superpuesta centrada (modal) sobre la pantalla actual, no panel lateral.
 * Misma API que antes para no romper usos; Escape y clic fuera cierran.
 */
export function Drawer({ open, title, onClose, children }: DrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-black/50"
        aria-label="Cerrar vista superpuesta"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
        <div
          className="pointer-events-auto relative my-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl max-h-[min(92dvh,920px)] sm:max-h-[90dvh]"
          style={{
            backgroundColor: 'var(--fondos-suaves)',
            borderColor: 'var(--encabezados-alterno)',
          }}
        >
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
            style={{ borderColor: 'var(--encabezados-alterno)' }}
          >
            <h2
              id={titleId}
              className="text-base sm:text-lg font-semibold pr-2 leading-snug"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium shrink-0"
              style={{ color: 'var(--menu-texto-principal)', border: '1px solid var(--encabezados-alterno)' }}
            >
              Cerrar
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
