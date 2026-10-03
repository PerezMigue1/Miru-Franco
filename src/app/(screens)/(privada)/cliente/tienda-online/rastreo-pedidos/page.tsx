import { redirect } from 'next/navigation';

/** Sin envíos no hay rastreo: el estado del pedido (incluido "Listo para recoger") está en Mis pedidos. */
export default function RastreoPedidosRedirectPage() {
  redirect('/cliente/tienda-online/mis-pedidos');
}
