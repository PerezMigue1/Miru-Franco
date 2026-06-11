import Image from 'next/image';
import Link from 'next/link';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import { ChevronDown } from 'lucide-react';
import { getProductosSinRedirigir } from '../services/productos';
import { getServicios } from '../services/servicios';
import HomeLandingClient from '../components/home/HomeLandingClient';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export default async function Home() {
  const [{ data: productos }, { data: servicios }] = await Promise.all([
    getProductosSinRedirigir(),
    getServicios(),
  ]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Header />

      <main className="flex-1">
        {/* Hero — completamente estático, sin JS */}
        <section
          className="hero-bg-gradient relative flex flex-col items-center justify-center w-full layout-gutter-x overflow-hidden"
          style={{ marginTop: '104px', height: 'calc(100vh - 104px)' }}
        >
          <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 lg:gap-6 py-0 md:items-center flex-1 min-h-0 h-full">
            <div className="w-full md:w-1/2 h-full md:flex md:items-center md:justify-center md:pr-2 lg:pr-4 min-h-0 flex-1 flex justify-center" data-reveal style={{ transitionDelay: '0ms' }}>
              <div
                className="relative flex-shrink-0 aspect-square mx-auto"
                style={{ width: 'min(90vw, calc(100vh - 130px))', height: 'min(90vw, calc(100vh - 130px))' }}
              >
                <Image src="/logo-miru.jpg" alt="Mirú Franco" fill className="object-contain" sizes="(max-width: 768px) 85vw, 50vw" priority />
              </div>
            </div>
            <div className="w-full md:w-1/2 md:flex md:flex-col md:justify-center md:items-start md:pl-4 lg:pl-6 md:-mt-26 flex flex-col items-center md:items-start text-center md:text-left min-h-0 flex-1 overflow-hidden" data-reveal style={{ transitionDelay: '200ms' }}>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <span className="hero-flourish" />
                <span className="hero-ornament" />
                <span className="hero-flourish" />
              </div>
              <div className="relative space-y-1">
                <h1 className="text-brand-miru text-brand-gold tracking-tight leading-none">MIRÚ</h1>
                <span className="text-brand-franco text-brand-gold block -mt-0.5 md:ml-8 ml-5">FRANCO</span>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
                  <span className="w-6 h-px shrink-0 opacity-70" style={{ backgroundColor: 'var(--logo-branding)' }} />
                  <p className="text-brand-tagline tracking-[0.2em] px-2" style={{ color: 'var(--hero-tagline-color)' }}>BEAUTY SALON</p>
                  <span className="w-6 h-px shrink-0 opacity-70" style={{ backgroundColor: 'var(--logo-branding)' }} />
                </div>
              </div>
              <p className="mt-5 md:mt-6 max-w-md text-sm md:text-base leading-relaxed" style={{ color: 'var(--hero-tagline-color)', opacity: 0.95 }}>
                Realza tu belleza natural con productos y servicios profesionales. Agenda tu cita, explora nuestra tienda y descubre la experiencia Mirú Franco.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-7" data-reveal style={{ transitionDelay: '400ms' }}>
                <Link
                  href="/cliente/servicios-citas/crear-cita"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full font-semibold text-sm uppercase tracking-wider bg-[var(--botones-principales)] hover:bg-[var(--hover)] hover:shadow-lg transition-all duration-200"
                  style={{
                    color: 'var(--texto-fondo-oscuro)',
                    minHeight: '44px',
                  }}
                >
                  Agendar Cita
                </Link>
                <Link
                  href="/servicios"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full font-semibold text-sm uppercase tracking-wider border hover:bg-[var(--hover)] hover:border-[var(--hover)] hover:text-[var(--texto-fondo-oscuro)] transition-all duration-200"
                  style={{
                    borderColor: 'var(--logo-branding)',
                    color: 'var(--hero-tagline-color)',
                    minHeight: '44px',
                  }}
                >
                  Ver Servicios
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce z-10" style={{ animationDuration: '2.5s' }}>
            <span className="text-xs tracking-[0.3em] uppercase opacity-60" style={{ color: 'var(--iconografia)' }}>Descubre</span>
            <ChevronDown size={24} aria-hidden style={{ color: 'var(--iconografia)', opacity: 0.75 }} />
          </div>
        </section>

        <HomeLandingClient
          initialProductos={shuffle(productos)}
          initialServicios={shuffle(servicios)}
        />
      </main>

      <Footer />
    </div>
  );
}
