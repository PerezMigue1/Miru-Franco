import type { ReactNode } from 'react';
import { metadataPublica } from '../../../../utils/seo';

/**
 * Metadata del listado de servicios (la página es 'use client'). Las subrutas privadas
 * (crear-cita, mis-citas…) la heredan, pero están excluidas en robots.txt; el detalle de
 * servicio define la suya.
 */
export const metadata = metadataPublica({
  title: 'Servicios y citas',
  description:
    'Conoce los servicios de Mirú Franco Beauty Salón —cortes, coloración, alaciado, nanoplastía y tratamientos capilares— y agenda tu cita en línea.',
  path: '/cliente/servicios-citas',
});

export default function ServiciosCitasLayout({ children }: { children: ReactNode }) {
  return children;
}
