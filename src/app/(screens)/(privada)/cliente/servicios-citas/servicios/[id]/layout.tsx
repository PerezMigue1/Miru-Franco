import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getServicioPorId } from '../../../../../../services/servicios';
import { metadataPublica, recortarDescripcion } from '../../../../../../utils/seo';
import { esImagenGenerada, imagenServicioMostrable } from '../../../../../../utils/galeria';

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
  // Misma regla que la galería: solo fotos que subió el equipo y nunca imágenes generadas con IA ni
  // ilustrativas. Se toma la primera así entre `imagen` e `imagenes` (como el producto); si no hay, la vista
  // previa usa la imagen propia del salón (OG por defecto de metadataPublica).
  const imagen =
    [servicio.imagen, ...(servicio.imagenes ?? [])]
      .map((url) => imagenServicioMostrable(url))
      .find((url): url is string => Boolean(url) && !esImagenGenerada(url)) ?? null;
  return metadataPublica({
    title: servicio.nombre,
    description:
      recortarDescripcion(servicio.descripcion) ??
      `${servicio.nombre} en Mirú Franco Beauty Salón. Agenda tu cita en línea.`,
    path,
    image: imagen ? { url: imagen, alt: servicio.nombre } : undefined,
  });
}

export default function ServicioDetalleLayout({ children }: { children: ReactNode }) {
  return children;
}
