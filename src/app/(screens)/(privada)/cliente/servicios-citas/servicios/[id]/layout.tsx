import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getServicioPorId } from '../../../../../../services/servicios';
import { metadataPublica, recortarDescripcion } from '../../../../../../utils/seo';

/** Metadata por servicio (la página es 'use client' y carga el detalle en el navegador). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const path = `/cliente/servicios-citas/servicios/${encodeURIComponent(id)}`;
  const servicio = await getServicioPorId(id);
  if (!servicio) {
    return metadataPublica({
      title: 'Servicio',
      description: 'Detalle del servicio en Mirú Franco Beauty Salón. Agenda tu cita en línea.',
      path,
    });
  }
  const imagen = servicio.imagen ?? servicio.imagenes?.[0];
  return metadataPublica({
    title: servicio.nombre,
    description:
      recortarDescripcion(servicio.descripcion) ??
      `${servicio.nombre} en Mirú Franco Beauty Salón. Agenda tu cita en línea.`,
    path,
    image: imagen?.startsWith('http') ? { url: imagen, alt: servicio.nombre } : undefined,
  });
}

export default function ServicioDetalleLayout({ children }: { children: ReactNode }) {
  return children;
}
