'use client';

import { ReactNode } from 'react';
import { colors } from '../../utils/colors';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
}: BadgeProps) {
  const variants = {
    default: {
      bg: colors.tarjetasPaneles,
      text: colors.textoFondoOscuro,
    },
    success: {
      bg: colors.success,
      text: colors.textoFondoOscuro,
    },
    warning: {
      bg: colors.warning,
      text: colors.textoFondoOscuro,
    },
    danger: {
      bg: colors.danger,
      text: colors.textoFondoOscuro,
    },
    info: {
      bg: colors.enlacesTextosInteractivos,
      text: colors.textoFondoOscuro,
    },
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const variantStyle = variants[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizes[size]}`}
      style={{
        backgroundColor: variantStyle.bg,
        color: variantStyle.text,
      }}
    >
      {children}
    </span>
  );
}

