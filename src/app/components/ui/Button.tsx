'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { colors } from '../../utils/colors';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline';
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
      bg: colors.botonesPrincipales,
      text: colors.textoFondoOscuro,
      hover: colors.hover,
    },
    secondary: {
      bg: colors.tarjetasPaneles,
      text: colors.textoFondoOscuro,
      hover: colors.fondosSuaves,
    },
    danger: {
      bg: colors.danger,
      text: colors.textoFondoOscuro,
      hover: '#7A0F0F',
    },
    success: {
      bg: colors.success,
      text: colors.textoFondoOscuro,
      hover: '#7E8F65',
    },
    warning: {
      bg: colors.warning,
      text: colors.textoFondoOscuro,
      hover: '#E5A015',
    },
    outline: {
      bg: 'transparent',
      text: colors.menuTextoPrincipal,
      hover: colors.hover,
      border: colors.menuTextoPrincipal,
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
        backgroundColor: variant === 'outline' ? variantStyle.bg : variantStyle.bg,
        color: variantStyle.text,
        border: variant === 'outline' && 'border' in variantStyle ? `2px solid ${variantStyle.border}` : 'none',
      }}
      onMouseEnter={(e) => {
        if (!props.disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!props.disabled) {
          e.currentTarget.style.backgroundColor = variant === 'outline' ? 'transparent' : variantStyle.bg;
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

