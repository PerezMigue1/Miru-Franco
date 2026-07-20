'use client';

import { ReactNode, useEffect } from 'react';

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

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className={`${sizes[size]} w-full max-h-[92vh] rounded-lg shadow-xl flex flex-col`}
        style={{ backgroundColor: 'var(--tarjetas-paneles)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0"
            style={{ borderColor: 'var(--borde-visible)' }}
          >
            <h2
              className="text-lg sm:text-xl font-bold"
              style={{ color: 'var(--texto-fondo-oscuro)' }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:opacity-80 transition-opacity shrink-0"
              style={{ color: 'var(--texto-fondo-oscuro)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto grow" style={{ color: 'var(--texto-fondo-oscuro)' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t shrink-0 flex-wrap"
            style={{ borderColor: 'var(--borde-visible)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

