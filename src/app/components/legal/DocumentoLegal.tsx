import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import Header from '../../layouts/Header';
import Footer from '../../layouts/Footer';
import SuperficieCliente from '../cliente/SuperficieCliente';

/**
 * Armazón de las cuatro páginas legales: cabecera con el título, índice con anclas (fijo al costado en
 * escritorio, plegable en móvil, sin JavaScript) y texto de lectura. La fecha no va aquí: cada página la
 * muestra una sola vez en su encabezado de versión (EncabezadoVersion, "Versión X. Vigente desde el …").
 * Las clases `mf-terminos*` viven en cliente.css.
 */
export interface SeccionLegal {
  id: string;
  titulo: string;
}

/** Sección numerada: id y título salen de la misma lista que el índice, así las anclas no se desfasan. */
export function SeccionDocumento({
  secciones,
  n,
  children,
}: {
  secciones: readonly SeccionLegal[];
  n: number;
  children: ReactNode;
}) {
  const { id, titulo } = secciones[n - 1];
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="mf-terminos__seccion">
      <h2 id={`${id}-titulo`}>
        <span className="mf-terminos__num">{n}.</span> {titulo}
      </h2>
      {children}
    </section>
  );
}

function ListaIndice({ secciones }: { secciones: readonly SeccionLegal[] }) {
  return (
    <ol className="mf-terminos__indice-lista">
      {secciones.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`}>
            <span className="mf-terminos__num">{i + 1}.</span> {s.titulo}
          </a>
        </li>
      ))}
    </ol>
  );
}

export default function DocumentoLegal({
  titulo,
  secciones,
  etiquetaIndice,
  children,
}: {
  titulo: string;
  secciones: readonly SeccionLegal[];
  /** aria-label del índice, p. ej. "Índice de los términos". */
  etiquetaIndice: string;
  /** Contenido del <article>: intro y secciones. */
  children: ReactNode;
}) {
  return (
    <SuperficieCliente className="mf-terminos-pagina">
      <Header />
      <main className="mf-terminos">
        <div className="mf-terminos__marco layout-gutter-x">
          <header className="mf-terminos__cabecera">
            <h1 className="text-elegant-title">{titulo}</h1>
            <p className="mf-terminos__marca">Mirú Franco Salón Beauty</p>
          </header>

          <div className="mf-terminos__cuerpo">
            {/* Escritorio: índice fijo al costado. Móvil: plegable antes del texto (sin JavaScript). */}
            <nav aria-label={etiquetaIndice} className="mf-terminos__indice">
              <p className="mf-terminos__indice-titulo">En esta página</p>
              <ListaIndice secciones={secciones} />
            </nav>
            <details className="mf-terminos__plegable">
              <summary>
                <span>Índice de secciones</span>
                <ChevronDown size={18} aria-hidden className="mf-terminos__chevron" />
              </summary>
              <nav aria-label={etiquetaIndice}>
                <ListaIndice secciones={secciones} />
              </nav>
            </details>

            <article className="mf-legal mf-terminos__texto">{children}</article>
          </div>
        </div>
      </main>
      <Footer />
    </SuperficieCliente>
  );
}
