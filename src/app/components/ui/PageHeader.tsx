'use client';

import { ReactNode } from 'react';
import { colors } from '../../utils/colors';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1
          className="text-section-title mb-2"
          style={{ color: colors.menuTextoPrincipal }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-lead"
            style={{ color: colors.encabezadosAlterno }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

