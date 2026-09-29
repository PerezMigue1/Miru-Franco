'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Encabezado de pantalla de cliente (solo lo usan pantallas de cliente): voz Playfair de la marca. */
export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 mb-8 md:mb-10 mf-entrada">
      <div className="max-w-2xl">
        <h1 className="mf-titulo-pagina" style={{ color: 'var(--menu-texto-principal)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-base md:text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

