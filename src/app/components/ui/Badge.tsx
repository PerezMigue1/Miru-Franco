'use client';

import type { CSSProperties, ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Insignia del sistema (`.mf-badge`, sistema.css): base clara opaca teñida del color de estado y
 * texto oscuro de la misma familia. Los rellenos sólidos anteriores (oro, verde, ámbar, azul con
 * texto claro) quedaban entre 2.3:1 y 3.9:1.
 */
const VARIANTES: Record<NonNullable<BadgeProps['variant']>, Record<string, string>> = {
  default: { '--badge-color': 'var(--logo-branding)', '--badge-texto': 'var(--oro-texto)' },
  success: { '--badge-color': 'var(--success)', '--badge-texto': 'var(--success-texto)' },
  warning: { '--badge-color': 'var(--warning)', '--badge-texto': 'var(--warning-texto)' },
  danger: { '--badge-color': 'var(--danger)', '--badge-texto': 'var(--danger-texto)' },
  info: { '--badge-color': 'var(--enlaces-textos-interactivos)', '--badge-texto': 'var(--info-texto)' },
};

const TAMANOS = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3.5 py-1.5 text-base',
};

export default function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  return (
    <span
      className={`mf-badge inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${TAMANOS[size]} ${className}`}
      style={VARIANTES[variant] as CSSProperties}
    >
      {children}
    </span>
  );
}
