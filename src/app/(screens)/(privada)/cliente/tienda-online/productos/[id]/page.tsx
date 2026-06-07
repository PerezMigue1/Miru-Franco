import DetalleProductoClient from './DetalleProductoClient';

export default async function DetalleProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalleProductoClient id={id} />;
}
