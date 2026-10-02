import type { ReactNode } from 'react';
import { metadataPublica } from '../../../utils/seo';

export const metadata = metadataPublica({
  title: 'Términos y condiciones y política de privacidad',
  description:
    'Términos y condiciones de uso y política de privacidad de Mirú Franco Beauty Salón: tratamiento de datos personales, compras en línea y reservación de citas.',
  path: '/terminos',
});

export default function TerminosLayout({ children }: { children: ReactNode }) {
  return children;
}
