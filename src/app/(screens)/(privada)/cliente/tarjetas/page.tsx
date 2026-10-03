import { redirect } from 'next/navigation';

/** El sitio ya no guarda tarjetas: el pago en línea se hace en la página de Mercado Pago. Redirige por enlaces antiguos. */
export default function TarjetasRedirectPage() {
  redirect('/perfil');
}
