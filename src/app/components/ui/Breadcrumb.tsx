'use client';

import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav
      className="flex items-center gap-1 text-xs mb-1.5 flex-wrap"
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isFirst = index === 0;
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <span
                className="select-none opacity-50"
                style={{ color: 'var(--encabezados-alterno)' }}
                aria-hidden
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            )}
            {!isLast && item.href ? (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-all hover:opacity-90 hover:shadow-sm"
                style={{
                  color: 'var(--enlaces-textos-interactivos)',
                  borderColor: 'rgba(74, 123, 167, 0.4)',
                  backgroundColor: 'rgba(74, 123, 167, 0.06)',
                }}
              >
                {isFirst && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                )}
                {item.label}
              </Link>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium"
                style={{
                  color: isLast ? 'var(--menu-texto-principal)' : 'var(--encabezados-alterno)',
                  borderColor: isLast ? 'rgba(113, 0, 20, 0.35)' : 'rgba(42, 42, 42, 0.25)',
                  backgroundColor: isLast ? 'rgba(113, 0, 20, 0.08)' : 'transparent',
                }}
              >
                {isFirst && !item.href && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                )}
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
