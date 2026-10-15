import { FileCheck2 } from 'lucide-react';
import { documentoLegal, fechaVigenciaTexto, type SlugDocumentoLegal } from '../../utils/documentosLegales';

/**
 * Encabezado visible de cada página legal: "Versión X. Vigente desde el 14 de octubre de 2026.", leído del
 * registro (utils/documentosLegales.ts). Va al inicio del texto, antes de la introducción.
 */
export default function EncabezadoVersion({ slug }: { slug: SlugDocumentoLegal }) {
  const { version, vigenteDesde } = documentoLegal(slug);
  return (
    <p className="mb-8 flex items-start gap-2 text-sm font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
      <FileCheck2 size={16} aria-hidden className="mt-1 shrink-0" style={{ color: 'var(--logo-branding)' }} />
      <span>
        Versión {version}. Vigente desde el <time dateTime={vigenteDesde}>{fechaVigenciaTexto(slug)}</time>.
      </span>
    </p>
  );
}
