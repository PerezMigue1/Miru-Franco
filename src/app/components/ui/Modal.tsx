'use client';

import { ReactNode, useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}: ModalProps) {
  const idTitulo = useId();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Superficie del sistema (--superficie-modal): lino en claro, carbón en oscuro. La terracota
  // anterior con texto claro daba 2.3:1 en modo claro.
  return (
    <div
      className="mf-velo fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? idTitulo : undefined}
        className={`mf-dialogo ${sizes[size]} w-full max-h-[92dvh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0"
            style={{ borderColor: 'var(--mf-linea-fuerte)' }}
          >
            <h2
              id={idTitulo}
              className="text-lg sm:text-xl font-bold"
              style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="mf-btn mf-btn-color -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-[10px]"
              style={{
                ['--btn-bg' as string]: 'transparent',
                ['--btn-texto' as string]: 'var(--menu-texto-principal)',
                ['--btn-bg-hover' as string]: 'var(--nav-hover-bg)',
              }}
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        )}

        <div className="px-4 sm:px-6 py-4 overflow-y-auto grow">{children}</div>

        {footer && (
          <div
            className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t shrink-0 flex-wrap"
            style={{ borderColor: 'var(--mf-linea-fuerte)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
