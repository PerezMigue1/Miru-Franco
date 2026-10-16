import type { ReactNode } from 'react';
import Header from '../../layouts/Header';
import Footer from '../../layouts/Footer';
import SuperficieCliente from '../cliente/SuperficieCliente';
import { obtenerDocumentoPublicado } from '../../services/documentosLegales';
import type { SlugDocumentoLegal } from '../../utils/documentosLegales';

/**
 * Página legal con el texto vigente publicado en la base (Admin > Documentos legales). Componente de servidor: el html
 * llega del backend ya limpio con su lista blanca, se vuelve a revisar y solo se muestra si su texto da el hash
 * publicado (services/documentosLegales.ts). El armazón (Header, Footer y el <main> de DocumentoLegal) es el mismo, así
 * que la página se ve y se lee igual.
 * `children` es el texto escrito en la página (el JSX de page.tsx): se muestra si el backend no responde o no hay
 * texto publicado en la base. La metadata sigue en cada page.tsx.
 */
export default async function DocumentoVigente({ slug, children }: { slug: SlugDocumentoLegal; children: ReactNode }) {
  const publicado = await obtenerDocumentoPublicado(slug);
  if (!publicado) return <>{children}</>;
  return (
    <SuperficieCliente className="mf-terminos-pagina">
      <Header />
      {/* display: contents: el <main> publicado queda como hijo directo del contenedor flexible, como en DocumentoLegal. */}
      <div className="contents" data-documento-version={publicado.version} dangerouslySetInnerHTML={{ __html: publicado.html }} />
      <Footer />
    </SuperficieCliente>
  );
}
