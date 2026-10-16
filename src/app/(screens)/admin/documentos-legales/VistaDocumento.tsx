'use client';

import type { CSSProperties } from 'react';
import { htmlPublicadoEsSeguro } from '../../../services/documentosLegales';

/** El <main> del documento como bloque dentro del panel (el panel ya tiene su propio <main>). */
function comoBloque(html: string): string {
  return html.replace(/^<main /, '<div ').replace(/<\/main>$/, '</div>');
}

/**
 * Vista previa de un documento legal tal como se verá en su página: el html lo arma y lo limpia el backend (lista
 * blanca), aquí se vuelve a revisar antes de pintarlo. Con las clases de la página (mf-terminos), sin el margen del
 * encabezado del sitio y con desplazamiento propio.
 */
export default function VistaDocumento({ html, etiqueta }: { html: string; etiqueta: string }) {
  if (!htmlPublicadoEsSeguro(html)) {
    return (
      <p role="alert" className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>
        No se puede mostrar este texto: no tiene la forma de un documento legal publicado.
      </p>
    );
  }
  const estilo = { minHeight: 0, '--mf-header-offset': '0px' } as CSSProperties;
  return (
    <section
      aria-label={etiqueta}
      tabIndex={0}
      className="max-h-[70vh] overflow-auto overscroll-contain rounded-[10px] border"
      style={{ borderColor: 'var(--mf-linea-fuerte)' }}
    >
      <div className="mf-terminos-pagina" style={estilo} dangerouslySetInnerHTML={{ __html: comoBloque(html) }} />
    </section>
  );
}
