'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined';
  style?: CSSProperties;
}

export default function Card({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  style,
  ...props
}: CardProps) {
  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variants = {
    default: {
      bg: 'var(--tarjetas-paneles)',
      border: 'none',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
    elevated: {
      bg: 'var(--tarjetas-paneles)',
      border: 'none',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    outlined: {
      bg: 'transparent',
      border: '1px solid var(--encabezados-alterno)',
      shadow: 'none',
    },
  };

  const variantStyle = variants[variant];

  return (
    <div
      className={`rounded-lg ${paddingStyles[padding]} ${className}`}
      style={{
        backgroundColor: variantStyle.bg,
        border: variantStyle.border,
        boxShadow: variantStyle.shadow,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

