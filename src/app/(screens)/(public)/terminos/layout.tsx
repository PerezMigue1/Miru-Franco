import type { ReactNode } from 'react';
import { metadataPublica } from '../../../utils/seo';

export const metadata = metadataPublica({
  title: 'Términos y condiciones y política de privacidad',
  description:
    'Términos y condiciones de uso y política de privacidad de Mirú Franco Beauty Salón: tratamiento de datos personales, compras en línea y reservación de citas.',
  path: '/terminos',
});

/**
 * La página es 'use client' (no puede exportar segment config), así que el render estático se
 * declara aquí. Contenido público y no personalizado: HTML prerenderizado y cacheable en CDN
 * (ver RUTAS_PUBLICAS_ESTATICAS en utils/rutasPublicasEstaticas.ts).
 */
export const dynamic = 'force-static';

export default function TerminosLayout({ children }: { children: ReactNode }) {
  return children;
}
