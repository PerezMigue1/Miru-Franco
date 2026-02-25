'use client';

import { colors } from '../../utils/colors';

/** Clase estándar para el padding horizontal del área de scroll (evita que el contenido quede bajo las flechas). */
export const SCROLL_ARROW_PADDING_X = 'px-12 sm:px-14';

interface ScrollArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  prevAriaLabel: string;
  nextAriaLabel: string;
}

/**
 * Flechas izquierda/derecha para carruseles horizontales.
 * Mismo aspecto y comportamiento en Productos, Servicios y Galería.
 * Responsive: botones e iconos más pequeños en móvil.
 */
export default function ScrollArrows({
  onPrev,
  onNext,
  prevAriaLabel,
  nextAriaLabel,
}: ScrollArrowsProps) {
  const btnClass =
    'absolute top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-colors duration-200 ' +
    'w-10 h-10 sm:w-12 sm:h-12';
  const iconClass = 'w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0';

  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        className={`left-0 ${btnClass}`}
        style={{ backgroundColor: colors.botonesPrincipales, color: colors.textoFondoOscuro }}
        aria-label={prevAriaLabel}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.botonesPrincipales; }}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onNext}
        className={`right-0 ${btnClass}`}
        style={{ backgroundColor: colors.botonesPrincipales, color: colors.textoFondoOscuro }}
        aria-label={nextAriaLabel}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.botonesPrincipales; }}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
}
