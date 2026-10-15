'use client';

import Link from 'next/link';
import { ChevronRight, House } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * Rastro de navegación sobrio: texto en el tono de la superficie y chevrones de lucide. Las
 * píldoras azules anteriores quedaban en 2.7:1 sobre lino. Cada miga mide 44 px de alto táctil.
 * El chevrón cierra cada miga (no abre la siguiente): si el rastro salta de línea en móvil, el
 * separador se queda al final de la primera y la segunda empieza con texto.
 */
export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Migas de pan" className="min-w-0 text-[0.8125rem]">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;
          const icono = isFirst ? <House size={13} aria-hidden className="shrink-0" /> : null;
          return (
            <li key={index} className="flex min-w-0 items-center gap-1">
              {!isLast && item.href ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center gap-1 rounded-md px-1 underline-offset-4 hover:underline"
                  style={{ color: 'var(--encabezados-alterno)' }}
                >
                  {icono}
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className="inline-flex min-h-11 items-center gap-1 px-1 font-semibold"
                  style={{ color: isLast ? 'var(--menu-texto-principal)' : 'var(--encabezados-alterno)' }}
                >
                  {icono}
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  size={14}
                  aria-hidden
                  className="shrink-0"
                  style={{ color: 'var(--campo-placeholder)' }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
