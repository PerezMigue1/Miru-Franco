import type { Metadata } from 'next';
import DetalleProductoClient from './DetalleProductoClient';
import { getProductoPorId } from '../../../../../../services/productos';
import { metadataPublica, recortarDescripcion } from '../../../../../../utils/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const path = `/cliente/tienda-online/productos/${encodeURIComponent(id)}`;
  const producto = await getProductoPorId(id).catch(() => null);
  if (!producto) {
    return metadataPublica({
      title: 'Producto',
      description: 'Detalle del producto en la tienda en línea de Mirú Franco Beauty Salón.',
      path,
    });
  }
  const titulo = producto.marca ? `${producto.nombre} — ${producto.marca}` : producto.nombre;
  const imagen = producto.imagenes?.[0] ?? producto.imagen;
  return metadataPublica({
    title: titulo,
    description:
      recortarDescripcion(producto.descripcion) ??
      `${producto.nombre} disponible en la tienda en línea de Mirú Franco Beauty Salón.`,
    path,
    image: imagen?.startsWith('http') ? { url: imagen, alt: producto.nombre } : undefined,
  });
}

export default async function DetalleProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalleProductoClient id={id} />;
}
