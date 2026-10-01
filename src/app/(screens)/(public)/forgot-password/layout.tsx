import type { ReactNode } from 'react';
import { metadataPublica } from '../../../utils/seo';

export const metadata = metadataPublica({
  title: 'Recuperar contraseña',
  description: 'Recupera el acceso a tu cuenta de Mirú Franco Beauty Salón por correo, SMS o pregunta de seguridad.',
  path: '/forgot-password',
  noIndex: true,
});

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
