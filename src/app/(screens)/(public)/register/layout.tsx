import type { ReactNode } from 'react';
import { metadataPublica } from '../../../utils/seo';

export const metadata = metadataPublica({
  title: 'Crear cuenta',
  description:
    'Crea tu cuenta en Mirú Franco Beauty Salón para reservar citas en línea, comprar productos profesionales y recibir promociones.',
  path: '/register',
});

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
