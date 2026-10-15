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
import { obtenerConfiguracionPublica } from '../services/configuracionSitio';
import { aFotosGaleria, listarGaleriaPublica } from '../services/galeria';
import { listarPromocionesActivas } from '../services/contenido';

/** Título y descripción: nombre, ciudad y descripción de Configuración del sitio. */
export async function generateMetadata() {
  const { salon } = await obtenerConfiguracionPublica();
  const ciudad = salon.ciudad.split(',')[0].trim();
  return metadataPublica({
    title: ciudad ? `${salon.nombre} en ${ciudad}` : salon.nombre,
    description: salon.descripcionSeo,
    path: '/home',
    absoluteTitle: true,
  });
}

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
  const [{ data: productos }, { data: servicios }, config, galeria, promociones] = await Promise.all([
    getProductosSinRedirigir(),
    getServicios(),
    obtenerConfiguracionPublica(),
    listarGaleriaPublica(),
    listarPromocionesActivas(),
  ]);
  return (
    <SeccionesHome
      initialProductos={conFotoPrimero(shuffle(productos)).slice(0, 10)}
      initialServicios={shuffle(servicios)}
      contenido={config.contenido.inicio}
      // Galería de Operaciones > Galería; si su API falla, las fotos reales de los servicios como hasta ahora.
      fotosGaleria={galeria.error ? undefined : aFotosGaleria(galeria.data)}
      promocionDestacada={promociones.data.find((p) => p.destacada) ?? null}
    />
  );
}

/**
 * Se renderiza por request (el `headers()` del layout raíz lee el nonce de la CSP), así sus
 * scripts inline llevan nonce y la CSP no necesita 'unsafe-inline'. Los datos siguen en la caché
 * de fetch (`revalidate: 60` en productos/servicios).
 */
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
  const [{ data: catalogo }, config] = await Promise.all([getProductosSinRedirigir(), obtenerConfiguracionPublica()]);
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
          <HeroFluidos fluidos={fluidos} texto={config.contenido.inicio.heroTexto} destacado={config.contenido.inicio.heroDestacado} />
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
