'use client';

import { ReactNode, HTMLAttributes } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined';
}

export default function Card({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  ...props
}: CardProps) {
  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variants = {
    default: {
      bg: colors.tarjetasPaneles,
      border: 'none',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
    elevated: {
      bg: colors.tarjetasPaneles,
      border: 'none',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    outlined: {
      bg: 'transparent',
      border: `1px solid ${colorsWithOpacity.bordeVisible}`,
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
      }}
      {...props}
    >
      {children}
    </div>
  );
}

