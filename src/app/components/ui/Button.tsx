'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'chip';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  className = '',
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
      bg: 'var(--success)',
      text: 'var(--texto-fondo-oscuro)',
      hover: 'var(--hover)',
    },
    warning: {
      bg: 'var(--warning)',
      text: 'var(--texto-fondo-oscuro)',
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

  return (
    <button
      className={`${baseStyles} ${sizeStyle} ${widthStyle} ${className}`}
      style={{
        backgroundColor: variantStyle.bg,
        color: variantStyle.text,
        border: variant === 'outline' && 'border' in variantStyle ? `2px solid ${variantStyle.border}` : 'none',
      }}
      onMouseEnter={(e) => {
        if (!props.disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.hover;
          if (variant === 'outline') {
            if ('border' in variantStyle && variantStyle.border) {
              e.currentTarget.style.borderColor = variantStyle.hover;
            }
            e.currentTarget.style.color = 'var(--texto-fondo-oscuro)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!props.disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.bg;
          if (variant === 'outline') {
            if ('border' in variantStyle && variantStyle.border) {
              e.currentTarget.style.borderColor = variantStyle.border;
            }
            e.currentTarget.style.color = variantStyle.text;
          }
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

