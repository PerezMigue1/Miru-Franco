import { redirect } from 'next/navigation';

/** "Entregas y envíos" ahora es "Pedidos por recoger": ya no hay envío a domicilio. Redirige por enlaces antiguos. */
export default function EntregasEnviosRedirectPage() {
  redirect('/admin/pedidos-por-recoger');
}
