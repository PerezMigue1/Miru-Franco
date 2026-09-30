'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { useSuperficie } from '../cliente/SuperficieCliente';

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
    default: { bg: 'var(--tarjetas-paneles)', border: 'none' },
    elevated: { bg: 'var(--tarjetas-paneles)', border: 'none' },
    outlined: { bg: 'transparent', border: '1px solid var(--mf-linea-fuerte)' },
  };

  const variantStyle = variants[variant];
  // Mismo sistema en cliente, /operacion y /admin (DESIGN.md): sombra tintada y radio de marca.
  // Solo cambia la escala: 14px en el portal de clientas, 12px en los paneles (más densos), y la
  // elevación al hover de las tarjetas clicables, que existe solo en el portal (cliente.css).
  const cliente = useSuperficie() === 'cliente';
  const forma = `mf-card${cliente ? '' : ' mf-card--panel'}${props.onClick ? ' mf-card--interactiva' : ''}`;
  const sombra = variant === 'outlined' ? 'none' : 'var(--mf-sombra-1)';

  return (
    <div
      className={`${forma} ${paddingStyles[padding]} ${className}`}
      style={{
        backgroundColor: variantStyle.bg,
        border: variantStyle.border,
        boxShadow: sombra,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

