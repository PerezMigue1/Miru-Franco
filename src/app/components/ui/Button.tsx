'use client';

import type { CSSProperties } from 'react';
import {
  ButtonHTMLAttributes,
  cloneElement,
  isValidElement,
  MouseEvent,
  ReactElement,
  ReactNode,
} from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'chip';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
  /** Si es true, el hijo único recibe los estilos del botón (p. ej. `<Link>`). */
  asChild?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  asChild = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: {
      bg: 'var(--botones-principales)',
      text: 'var(--texto-fondo-oscuro)',
      hover: 'var(--hover)',
    },
    secondary: {
      bg: 'var(--tarjetas-paneles)',
      text: 'var(--texto-fondo-oscuro)',
      hover: 'var(--hover)',
    },
    danger: {
      bg: 'var(--danger)',
      text: 'var(--texto-fondo-oscuro)',
      hover: 'var(--hover)',
    },
    success: {
      // --success (#6E7D57) con texto claro no cumple AA (auditoría de contraste): fondo
      // aclarado a --boton-acento-bg + texto oscuro --texto-sobre-acento sí cumple.
      bg: 'var(--boton-acento-bg)',
      text: 'var(--texto-sobre-acento)',
      hover: 'var(--hover)',
    },
    warning: {
      // --warning (#D98E04) con texto claro fallaba AA (auditoría de contraste): texto
      // oscuro --texto-sobre-acento sí cumple; el fondo no necesitó cambiar.
      bg: 'var(--warning)',
      text: 'var(--texto-sobre-acento)',
      hover: 'var(--hover)',
    },
    outline: {
      bg: 'transparent',
      text: 'var(--menu-texto-principal)',
      hover: 'var(--hover)',
      border: 'var(--menu-texto-principal)',
    },
    chip: {
      bg: 'var(--hover)',
      text: 'var(--texto-fondo-oscuro)',
      hover: 'var(--hover)',
    },
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  };
  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];
  const widthStyle = fullWidth ? 'w-full' : '';

  const mergedClassName = `${baseStyles} ${sizeStyle} ${widthStyle} ${className}`.trim();

  const baseInlineStyle: CSSProperties = {
    backgroundColor: variantStyle.bg,
    color: variantStyle.text,
    border: variant === 'outline' && 'border' in variantStyle ? `2px solid ${variantStyle.border}` : 'none',
  };

  const applyHoverEnter = (el: HTMLElement) => {
    if (!props.disabled) {
      el.style.backgroundColor = variantStyle.hover;
      if (variant === 'outline') {
        if ('border' in variantStyle && variantStyle.border) {
          el.style.borderColor = variantStyle.hover;
        }
        el.style.color = 'var(--texto-fondo-oscuro)';
      }
    }
  };

  const applyHoverLeave = (el: HTMLElement) => {
    if (!props.disabled) {
      el.style.backgroundColor = variantStyle.bg;
      if (variant === 'outline') {
        if ('border' in variantStyle && variantStyle.border) {
          el.style.borderColor = variantStyle.border;
        }
        el.style.color = variantStyle.text;
      }
    }
  };

  if (asChild) {
    if (!isValidElement(children)) {
      console.warn('Button asChild requiere un único elemento React como hijo.');
      return null;
    }
    const child = children as ReactElement<{
      className?: string;
      style?: CSSProperties;
      onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
      onMouseLeave?: (e: MouseEvent<HTMLElement>) => void;
    }>;
    const childClass = [mergedClassName, child.props.className].filter(Boolean).join(' ');
    const childStyle = { ...baseInlineStyle, ...child.props.style };

    return cloneElement(child, {
      className: childClass,
      style: childStyle,
      onMouseEnter: (e: MouseEvent<HTMLElement>) => {
        applyHoverEnter(e.currentTarget);
        child.props.onMouseEnter?.(e);
      },
      onMouseLeave: (e: MouseEvent<HTMLElement>) => {
        applyHoverLeave(e.currentTarget);
        child.props.onMouseLeave?.(e);
      },
    });
  }

  return (
    <button
      type={type}
      className={mergedClassName}
      style={baseInlineStyle}
      onMouseEnter={(e) => {
        applyHoverEnter(e.currentTarget);
      }}
      onMouseLeave={(e) => {
        applyHoverLeave(e.currentTarget);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

