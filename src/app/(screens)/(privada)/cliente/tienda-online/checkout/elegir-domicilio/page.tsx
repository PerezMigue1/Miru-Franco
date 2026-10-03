import { redirect } from 'next/navigation';

/** Ya no hay envío a domicilio: todo pedido se recoge en el salón. Esta ruta solo redirige por enlaces antiguos. */
export default function ElegirDomicilioRedirectPage() {
  redirect('/cliente/tienda-online/checkout');
}
