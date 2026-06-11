'use client';

import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';

export interface GalleryItem {
  id: number;
  categoria: string;
  descripcion: string;
}

interface GalleryModalProps {
  items: GalleryItem[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (idx: number) => void;
}

export default function GalleryModal({
  items,
  currentIndex,
  onClose,
  onNavigate,
}: GalleryModalProps) {
  const isOpen = currentIndex !== null;
  const item = currentIndex !== null ? items[currentIndex] : null;
  const hasPrev = currentIndex !== null && currentIndex > 0;
  const hasNext = currentIndex !== null && currentIndex < items.length - 1;

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate((currentIndex as number) - 1);
      if (e.key === 'ArrowRight' && hasNext) onNavigate((currentIndex as number) + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, currentIndex, hasPrev, hasNext, onClose, onNavigate]);

  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(22,22,22,0.92)' }}
      onClick={onClose}
    >
      {/* Cerrar */}
      <button
        onClick={onClose}
        aria-label="Cerrar galería"
        className="absolute top-4 right-4 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
        style={{ color: 'var(--texto-fondo-oscuro)', minHeight: '44px', minWidth: '44px' }}
      >
        <X size={22} aria-hidden />
      </button>

      {/* Anterior */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex as number) - 1); }}
          aria-label="Imagen anterior"
          className="absolute left-2 sm:left-4 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
          style={{
            color: 'var(--texto-fondo-oscuro)',
            minHeight: '44px',
            minWidth: '44px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <ChevronLeft size={28} aria-hidden />
        </button>
      )}

      {/* Contenido */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl w-full mx-10 sm:mx-20"
        style={{ maxWidth: '400px', backgroundColor: 'var(--tarjetas-paneles)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full flex items-center justify-center"
          style={{ aspectRatio: '4/5', maxHeight: '65vh' }}
        >
          <Camera size={64} aria-hidden style={{ color: 'var(--iconografia)', opacity: 0.35 }} />
        </div>
        <div className="px-6 py-5 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-1"
            style={{ color: 'var(--iconografia)' }}
          >
            {item.categoria}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
            {item.descripcion}
          </p>
          <p
            className="text-xs mt-3 tabular-nums"
            style={{ color: 'var(--texto-fondo-oscuro)', opacity: 0.35 }}
          >
            {(currentIndex as number) + 1} / {items.length}
          </p>
        </div>
      </div>

      {/* Siguiente */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex as number) + 1); }}
          aria-label="Imagen siguiente"
          className="absolute right-2 sm:right-4 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
          style={{
            color: 'var(--texto-fondo-oscuro)',
            minHeight: '44px',
            minWidth: '44px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <ChevronRight size={28} aria-hidden />
        </button>
      )}
    </div>
  );
}
