import { redirect } from 'next/navigation';

/** Ya no hay envío a domicilio, así que no hay direcciones que administrar. Redirige por enlaces antiguos. */
export default function DireccionesRedirectPage() {
  redirect('/perfil');
}
