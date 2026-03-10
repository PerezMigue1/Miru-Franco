'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variants = {
    default: {
      bg: 'var(--logo-branding)',
      text: 'var(--texto-fondo-oscuro)',
    },
    success: {
      bg: 'var(--success)',
      text: 'var(--texto-fondo-oscuro)',
    },
    warning: {
      bg: 'var(--warning)',
      text: 'var(--texto-fondo-oscuro)',
    },
    danger: {
      bg: 'var(--danger)',
      text: 'var(--texto-fondo-oscuro)',
    },
    info: {
      bg: 'var(--enlaces-textos-interactivos)',
      text: 'var(--texto-fondo-oscuro)',
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
      className={`inline-flex items-center rounded-full font-medium ${sizes[size]} ${className}`}
      style={{
        backgroundColor: variantStyle.bg,
        color: variantStyle.text,
      }}
    >
      {children}
    </span>
  );
}

