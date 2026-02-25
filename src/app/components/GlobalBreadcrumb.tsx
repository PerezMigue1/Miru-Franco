'use client';

import { usePathname } from 'next/navigation';
import Breadcrumb from './ui/Breadcrumb';
import { getBreadcrumbsForPath } from '../utils/breadcrumbs';

/**
 * Migaja de pan global: muestra el camino jerárquico completo desde "Inicio"
 * en todas las pantallas, aunque se entre por un enlace directo.
 */
export default function GlobalBreadcrumb() {
  const pathname = usePathname();
  const items = getBreadcrumbsForPath(pathname ?? '');

  if (!items.length) return null;

  return (
    <div className="w-full px-0 py-0.5 md:px-0 shrink-0">
      <Breadcrumb items={items} />
    </div>
  );
}
