'use client';

import type { CSSProperties } from 'react';
import { ButtonHTMLAttributes, cloneElement, isValidElement, ReactElement, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'chip';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
  /** Si es true, el hijo único recibe los estilos del botón (p. ej. `<Link>`). */
  asChild?: boolean;
}

type EstiloBoton = CSSProperties & Record<`--${string}`, string>;

/** Colores por variante como variables CSS: el hover lo resuelve `.mf-btn-color` (sistema.css), no JS. */
const VARIANTES: Record<NonNullable<ButtonProps['variant']>, Record<string, string>> = {
  primary: {
    '--btn-bg': 'var(--botones-principales)',
    '--btn-texto': 'var(--texto-fondo-oscuro)',
    '--btn-bg-hover': 'var(--hover)',
  },
  // Texto oscuro sobre terracota (el claro daba 2.3:1); en oscuro vuelve a claro.
  secondary: {
    '--btn-bg': 'var(--tarjetas-paneles)',
    '--btn-texto': 'var(--btn-secundario-texto)',
    '--btn-bg-hover': 'color-mix(in srgb, var(--tarjetas-paneles) 86%, var(--menu-texto-principal))',
  },
  danger: {
    '--btn-bg': 'var(--danger)',
    '--btn-texto': 'var(--texto-fondo-oscuro)',
    '--btn-bg-hover': 'var(--hover)',
  },
  // --success con texto claro no cumple AA: fondo aclarado + texto oscuro (auditoría de contraste).
  success: {
    '--btn-bg': 'var(--boton-acento-bg)',
    '--btn-texto': 'var(--texto-sobre-acento)',
    '--btn-bg-hover': 'color-mix(in srgb, var(--boton-acento-bg) 86%, #fff)',
  },
  warning: {
    '--btn-bg': 'var(--warning)',
    '--btn-texto': 'var(--texto-sobre-acento)',
    '--btn-bg-hover': 'color-mix(in srgb, var(--warning) 86%, #fff)',
  },
  outline: {
    '--btn-bg': 'transparent',
    '--btn-texto': 'var(--menu-texto-principal)',
    '--btn-borde': '1.5px solid var(--menu-texto-principal)',
    '--btn-bg-hover': 'var(--hover)',
    '--btn-texto-hover': 'var(--texto-fondo-oscuro)',
    '--btn-borde-hover': 'var(--hover)',
  },
  chip: {
    '--btn-bg': 'var(--hover)',
    '--btn-texto': 'var(--texto-fondo-oscuro)',
    '--btn-bg-hover': 'color-mix(in srgb, var(--hover) 85%, #000)',
  },
};

const TAMANOS = {
  sm: 'px-3 py-1.5 text-sm min-h-9',
  md: 'px-6 py-2.5 text-base min-h-11',
  lg: 'px-8 py-3.5 text-lg min-h-12',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  asChild = false,
  className = '',
  type = 'button',
  style,
  ...props
}: ButtonProps) {
  // Mismo botón en cliente, /operacion y /admin (DESIGN.md): presión táctil, hover solo con
  // puntero fino y transiciones por propiedad.
  const baseStyles =
    'mf-btn mf-btn-color font-semibold rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed';
  const widthStyle = fullWidth ? 'w-full' : '';
  const mergedClassName = `${baseStyles} ${TAMANOS[size]} ${widthStyle} ${className}`.trim();
  const estilo = { ...VARIANTES[variant], ...style } as EstiloBoton;

  if (asChild) {
    if (!isValidElement(children)) {
      console.warn('Button asChild requiere un único elemento React como hijo.');
      return null;
    }
    const child = children as ReactElement<{ className?: string; style?: CSSProperties }>;
    return cloneElement(child, {
      className: [mergedClassName, child.props.className].filter(Boolean).join(' '),
      style: { ...estilo, ...child.props.style },
    });
  }

  return (
    <button type={type} className={mergedClassName} style={estilo} {...props}>
      {children}
    </button>
  );
}
