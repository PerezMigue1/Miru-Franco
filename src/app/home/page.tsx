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
          style={{
            marginTop: 'var(--mf-header-offset, 104px)',
            height: 'calc(100vh - var(--mf-header-offset, 104px))',
          }}
        >
          {/* `h-full` solo desde md: (igual que el original en escritorio) — en móvil se deja
              `flex-1` sin forzar el 100%, para que comparta la altura real con "Descubre" de
              abajo (que en móvil ya no es `absolute`) en vez de reclamarla toda como si nada
              más existiera debajo. */}
          <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 lg:gap-6 py-0 md:items-center flex-1 min-h-0 md:h-full">
            <div className="w-full md:w-1/2 items-center md:h-full md:flex md:items-center md:justify-center md:pr-2 lg:pr-4 min-h-0 md:flex-1 flex justify-center" data-reveal style={{ transitionDelay: '0ms' }}>
              {/* En móvil la imagen comparte columna (apilada) con título + descripción + botones +
                  "Descubre" debajo — no puede pedir casi toda la altura de pantalla como si fuera
                  lo único ahí, o no queda aire para el resto y se recorta. De md: en adelante el
                  layout es lado a lado (imagen a la izquierda, texto a la derecha) exactamente
                  como en el diseño original de escritorio, sin ningún cambio. */}
              <div className="hero-logo-circle relative flex-shrink-0 aspect-square mx-auto">
                <Image src="/logo-miru.jpg" alt="Mirú Franco" fill className="object-contain" sizes="(max-width: 768px) 85vw, 50vw" priority />
              </div>
            </div>
            <div className="w-full md:w-1/2 md:flex md:flex-col md:justify-center md:items-start md:pl-4 lg:pl-6 md:-mt-26 flex flex-col items-center md:items-start text-center md:text-left min-h-0 flex-1 overflow-hidden" data-reveal style={{ transitionDelay: '200ms' }}>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2 md:mb-3">
                <span className="hero-flourish" />
                <span className="hero-ornament" />
                <span className="hero-flourish" />
              </div>
              <div className="relative space-y-1">
                <h1 className="text-brand-miru text-brand-gold tracking-tight leading-none">MIRÚ</h1>
                <span className="text-brand-franco text-brand-gold block -mt-0.5 md:ml-8 ml-5">FRANCO</span>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2 md:mt-4">
                  <span className="w-6 h-px shrink-0 opacity-70" style={{ backgroundColor: 'var(--logo-branding)' }} />
                  <p className="text-brand-tagline tracking-[0.2em] px-2" style={{ color: 'var(--hero-tagline-color)' }}>BEAUTY SALON</p>
                  <span className="w-6 h-px shrink-0 opacity-70" style={{ backgroundColor: 'var(--logo-branding)' }} />
                </div>
              </div>
              <p className="mt-3 md:mt-6 max-w-md text-sm md:text-base leading-relaxed" style={{ color: 'var(--hero-tagline-color)', opacity: 0.95 }}>
                Realza tu belleza natural con productos y servicios profesionales. Agenda tu cita, explora nuestra tienda y descubre la experiencia Mirú Franco.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4 md:mt-7" data-reveal style={{ transitionDelay: '400ms' }}>
                <Link
                  href="/cliente/servicios-citas/crear-cita"
                  className="inline-flex items-center justify-center px-6 py-2.5 sm:px-7 sm:py-3.5 rounded-full font-semibold text-sm uppercase tracking-wider bg-[var(--botones-principales)] hover:bg-[var(--hover)] hover:shadow-lg transition-all duration-200"
                  style={{
                    color: 'var(--texto-fondo-oscuro)',
                    minHeight: '44px',
                  }}
                >
                  Agendar Cita
                </Link>
                <Link
                  href="/servicios"
                  className="inline-flex items-center justify-center px-6 py-2.5 sm:px-7 sm:py-3.5 rounded-full font-semibold text-sm uppercase tracking-wider border hover:bg-[var(--hover)] hover:border-[var(--hover)] hover:text-[var(--texto-fondo-oscuro)] transition-all duration-200"
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
          {/* Solo en móvil pasa a flujo normal (no absolute), para que nunca quede encimado
              sobre los botones — reserva su propio espacio real en vez de flotar por arriba.
              De md: en adelante vuelve a ser exactamente el `absolute` original de escritorio,
              sin ningún cambio. */}
          <div
            className="shrink-0 w-full flex flex-col items-center gap-1.5 pt-2 pb-3 animate-bounce md:absolute md:w-auto md:pt-0 md:pb-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:z-10"
            style={{ animationDuration: '2.5s' }}
          >
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
