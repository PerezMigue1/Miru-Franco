import { Suspense } from 'react';
import { preload } from 'react-dom';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import { getProductosSinRedirigir, urlsGaleriaProductoCatalogo, type Producto } from '../services/productos';
import { getServicios } from '../services/servicios';
import SeccionesHome from '../components/home/SeccionesHome';
import HeroFluidos from '../components/home/HeroFluidos';
import IntroGrieta from '../components/home/IntroGrieta';
import { SRCSET_GOJI_AVIF, TAMANO_GOJI, seleccionarFluidos } from '../utils/fluidosHero';
import SuperficieCliente from '../components/cliente/SuperficieCliente';
import { metadataPublica } from '../utils/seo';

export const metadata = metadataPublica({
  title: 'Mirú Franco — Beauty Salón en Huejutla de Reyes',
  description:
    'Salón de belleza profesional en Huejutla de Reyes: cortes, coloración, tratamientos capilares, alaciado y nanoplastía. Agenda tu cita en línea y compra productos profesionales.',
  path: '/home',
  absoluteTitle: true,
});

/**
 * Página pública y no personalizada: se prerenderiza y se regenera por ISR (los fetch de
 * productos/servicios ya usan `revalidate: 60`), para que el CDN pueda cachear el HTML.
 * `force-static` hace que el `headers()` del layout raíz devuelva vacío aquí (sin nonce):
 * esta ruta figura en RUTAS_PUBLICAS_ESTATICAS (utils/rutasPublicasEstaticas.ts), que le aplica una CSP sin nonce.
 */
export const dynamic = 'force-static';
export const revalidate = 300;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Productos con foto antes que los que solo tendrían el placeholder (orden estable dentro de cada grupo). */
function conFotoPrimero(productos: Producto[]): Producto[] {
  const tieneFoto = (p: Producto) => urlsGaleriaProductoCatalogo(p).length > 0;
  return [...productos.filter(tieneFoto), ...productos.filter((p) => !tieneFoto(p))];
}

/** Carga productos/servicios en streaming: el hero no espera al backend (mejora TTFB/FCP/LCP). */
async function HomeDataSections() {
  const [{ data: productos }, { data: servicios }] = await Promise.all([
    getProductosSinRedirigir(),
    getServicios(),
  ]);
  return (
    <SeccionesHome
      initialProductos={conFotoPrimero(shuffle(productos)).slice(0, 10)}
      initialServicios={shuffle(servicios)}
    />
  );
}

export default async function Home() {
  // El Goji del hero es el LCP: su preload sale como hint al inicio del stream, antes que los
  // preloads automáticos de imágenes (mismo srcset/sizes que su <source> AVIF: una sola descarga).
  preload('/hero/web/goji-240.avif', {
    as: 'image',
    type: 'image/avif',
    imageSrcSet: SRCSET_GOJI_AVIF,
    imageSizes: TAMANO_GOJI,
    fetchPriority: 'high',
  });
  // Nombre y precio de los fluidos del hero: mismo fetch que la tienda (Next lo deduplica).
  const { data: catalogo } = await getProductosSinRedirigir();
  const fluidos = seleccionarFluidos(catalogo);

  return (
    <SuperficieCliente className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      {/* Cada bloque en su propio límite de hidratación (mismo HTML; React cede el hilo entre ellos) */}
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Intro de cada carga completa (grieta en el monograma). El script decide antes del primer
            pintado (layout raíz) si se muestra; la navegación interna no la repite. */}
        <Suspense fallback={null}>
          <IntroGrieta />
        </Suspense>

        {/* Hero 2.5D: los cuatro fluidos AVYNA del catálogo (nombre/precio del API, renders propios).
            Un solo CTA primario: reservar empieza eligiendo el servicio. */}
        <Suspense fallback={null}>
          <HeroFluidos fluidos={fluidos} />
        </Suspense>

        <Suspense fallback={<div aria-hidden style={{ minHeight: '100vh' }} />}>
          <HomeDataSections />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </SuperficieCliente>
  );
}
