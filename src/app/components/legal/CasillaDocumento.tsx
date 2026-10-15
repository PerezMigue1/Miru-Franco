'use client';

import type { InputHTMLAttributes, MouseEvent, ReactNode, Ref } from 'react';

interface CasillaDocumentoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id' | 'children'> {
  id: string;
  /** Texto de la etiqueta; puede llevar el enlace al documento (EnlaceDocumento). */
  children: ReactNode;
  /** Mensaje junto a la casilla cuando falta marcarla (role="alert"). */
  error?: string | null;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Casilla legal: input checkbox real con su etiqueta (htmlFor), sin marcar de inicio y con el error junto a
 * ella. Estilos del sistema (.mf-consentimiento): 44 px de alto, foco visible y ambos temas.
 */
export default function CasillaDocumento({ id, children, error, className = '', ...input }: CasillaDocumentoProps) {
  const idError = `${id}-error`;
  return (
    <div className={`mf-consentimiento ${className}`.trim()}>
      <label htmlFor={id}>
        <input
          type="checkbox"
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          {...input}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={idError} role="alert" className="mf-consentimiento__error">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Enlace a un documento legal dentro de una casilla: abre en otra pestaña para no perder lo capturado.
 * `className` permite, por ejemplo, darle objetivo de 44 px en móvil.
 */
export function EnlaceDocumento({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={(e: MouseEvent) => e.stopPropagation()}>
      {children}
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  );
}
