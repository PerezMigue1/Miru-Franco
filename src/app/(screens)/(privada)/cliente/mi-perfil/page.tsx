import { redirect } from 'next/navigation';

/** Una sola pantalla de perfil: `/perfil`. Esta ruta solo redirige por compatibilidad con enlaces antiguos. */
export default function MiPerfilRedirectPage() {
  redirect('/perfil');
}
