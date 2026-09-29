import type { ReactNode } from 'react';
import { metadataPublica } from '../../../utils/seo';

export const metadata = metadataPublica({
  title: 'Restablecer contraseña',
  description: 'Define una nueva contraseña para tu cuenta de Mirú Franco Beauty Salón.',
  path: '/reset-password',
  noIndex: true,
});

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
