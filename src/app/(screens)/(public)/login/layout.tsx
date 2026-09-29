import type { ReactNode } from 'react';
import { metadataPublica } from '../../../utils/seo';

export const metadata = metadataPublica({
  title: 'Iniciar sesión',
  description:
    'Inicia sesión en Mirú Franco Beauty Salón para agendar citas, dar seguimiento a tus pedidos y administrar tu perfil.',
  path: '/login',
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
