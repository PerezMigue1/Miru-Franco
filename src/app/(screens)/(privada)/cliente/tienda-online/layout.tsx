import type { ReactNode } from 'react';
import { metadataPublica } from '../../../../utils/seo';

/**
 * Metadata del catálogo. Vive en un layout porque tienda-online/page.tsx debe seguir siendo
 * 'use client' (ver CLAUDE.md). Las subrutas privadas (carrito, checkout, mis-pedidos…) la
 * heredan, pero están excluidas en robots.txt; el detalle de producto define la suya.
 */
export const metadata = metadataPublica({
  title: 'Tienda en línea',
  description:
    'Compra productos profesionales para el cuidado del cabello en la tienda en línea de Mirú Franco Beauty Salón: shampoos, tratamientos, coloración y más.',
  path: '/cliente/tienda-online',
});

export default function TiendaOnlineLayout({ children }: { children: ReactNode }) {
  return children;
}
