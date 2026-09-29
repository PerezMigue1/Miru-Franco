import { Suspense } from 'react';
import Link from 'next/link';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import { ArrowRight } from 'lucide-react';
import { getProductosSinRedirigir } from '../services/productos';
import { getServicios } from '../services/servicios';
import HomeLandingClient from '../components/home/HomeLandingClient';
import HeroEscena from '../components/home/HeroEscena';
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

/** Carga productos/servicios en streaming: el hero no espera al backend (mejora TTFB/FCP/LCP). */
async function HomeDataSections() {
  const [{ data: productos }, { data: servicios }] = await Promise.all([
    getProductosSinRedirigir(),
    getServicios(),
  ]);
  return (
    <HomeLandingClient
      initialProductos={shuffle(productos).slice(0, 10)}
      initialServicios={shuffle(servicios)}
    />
  );
}

export default function Home() {
  return (
    <SuperficieCliente className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Header />

      <main className="flex-1">
        {/* Hero: escena de profundidad (HeroEscena) + tipografía de marca. Un solo CTA primario;
            reservar empieza eligiendo el servicio (crear-cita sin servicio/horario no se puede
            completar). Sin flecha "Descubre": el contenido tira del scroll por sí mismo. */}
        <section
          className="mf-hero hero-bg-gradient relative w-full overflow-hidden layout-gutter-x flex items-center"
          style={{ marginTop: 'var(--mf-header-offset, 104px)' }}
        >
          <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[1.05fr_1fr] items-center gap-6 md:gap-12 py-10 md:py-12">
            <div className="flex justify-center md:justify-end">
              <HeroEscena />
            </div>
            <div className="mf-hero-texto flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-3 mb-3 md:mb-4" style={{ ['--i' as string]: 0 }}>
                <span className="hero-flourish" />
                <span className="hero-ornament" />
                <span className="hero-flourish" />
              </div>
              <div className="relative" style={{ ['--i' as string]: 1 }}>
                <h1 className="text-brand-miru text-brand-gold tracking-tight leading-none">MIRÚ</h1>
                <span className="text-brand-franco text-brand-gold block -mt-1 md:ml-10 ml-6">Franco</span>
              </div>
              <div
                className="flex items-center justify-center md:justify-start gap-2 mt-3 md:mt-4"
                style={{ ['--i' as string]: 2 }}
              >
                <span className="w-6 h-px shrink-0 opacity-70" style={{ backgroundColor: 'var(--logo-branding)' }} />
                <p className="text-brand-tagline tracking-[0.2em] px-2" style={{ color: 'var(--hero-tagline-color)' }}>BEAUTY SALON</p>
                <span className="w-6 h-px shrink-0 opacity-70" style={{ backgroundColor: 'var(--logo-branding)' }} />
              </div>
              <p
                className="mt-5 md:mt-7 max-w-md text-base md:text-lg leading-relaxed"
                style={{ color: 'var(--hero-tagline-color)', ['--i' as string]: 3 }}
              >
                Realza tu belleza natural con productos y servicios profesionales. Agenda tu cita, explora nuestra tienda y descubre la experiencia Mirú Franco.
              </p>
              <div
                className="flex flex-wrap items-center justify-center md:justify-start gap-x-7 gap-y-3 mt-7 md:mt-9"
                style={{ ['--i' as string]: 4 }}
              >
                <Link
                  href="/cliente/servicios-citas"
                  className="mf-btn inline-flex items-center justify-center gap-2 px-7 rounded-full font-semibold text-sm uppercase tracking-wider bg-[var(--botones-principales)] hover:bg-[var(--hover)]"
                  style={{
                    color: 'var(--texto-fondo-oscuro)',
                    minHeight: '48px',
                    boxShadow: '0 10px 24px -10px rgba(113, 0, 20, 0.55)',
                  }}
                >
                  Agendar cita
                  <ArrowRight size={16} aria-hidden />
                </Link>
                <Link
                  href="/cliente/tienda-online"
                  className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider underline-offset-4 hover:underline"
                  style={{ color: 'var(--hero-tagline-color)', minHeight: '44px' }}
                >
                  Ver la tienda
                  <ArrowRight size={15} aria-hidden className="transition-transform duration-200 group-hover:translate-x-1" style={{ color: 'var(--logo-branding)' }} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Suspense fallback={<div aria-hidden style={{ minHeight: '100vh' }} />}>
          <HomeDataSections />
        </Suspense>
      </main>

      <Footer />
    </SuperficieCliente>
  );
}
