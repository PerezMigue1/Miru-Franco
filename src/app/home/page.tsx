'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Header from '../layouts/Header';
import ScrollArrows, { SCROLL_ARROW_PADDING_X } from '../components/ui/ScrollArrows';
import Card from '../components/ui/Card';
import Footer from '../layouts/Footer';
import { getProductosSinRedirigir, urlsGaleriaProductoCatalogo } from '../services/productos';
import type { Producto } from '../services/productos';
import { ProductoImagenCarruselTarjeta } from '../components/tienda/ProductoImagenCarruselTarjeta';
import { getServicios } from '../services/servicios';
import type { Servicio } from '../services/servicios';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Items de galería para la sección con scroll lateral (mismo estilo que /cliente/galeria)
const galeriaItems = [
  { id: 1, categoria: 'Corte', descripcion: 'Corte moderno y elegante' },
  { id: 2, categoria: 'Coloración', descripcion: 'Coloración profesional' },
  { id: 3, categoria: 'Alaciado', descripcion: 'Alaciado perfecto' },
  { id: 4, categoria: 'Nanoplastía', descripcion: 'Tratamiento de nanoplastía' },
  { id: 5, categoria: 'Peinado', descripcion: 'Peinado para evento especial' },
  { id: 6, categoria: 'Tratamiento', descripcion: 'Tratamiento reparador' },
  { id: 7, categoria: 'Corte', descripcion: 'Corte clásico' },
  { id: 8, categoria: 'Mechas', descripcion: 'Mechas profesionales' },
];

export default function Home() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const galeriaScrollRef = useRef<HTMLDivElement>(null);
  const productosScrollRef = useRef<HTMLDivElement>(null);
  const serviciosScrollRef = useRef<HTMLDivElement>(null);

  // Ancho fijo de tarjetas: productos/servicios y galería (w-72 = 288px), gap-6 = 24px
  const CARD_WIDTH_PX = 288;
  const SCROLL_STEP = CARD_WIDTH_PX + 24;

  const scrollProductos = (dir: 'left' | 'right') => {
    const el = productosScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -SCROLL_STEP : SCROLL_STEP, behavior: 'smooth' });
  };

  const scrollGaleria = (dir: 'left' | 'right') => {
    const el = galeriaScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -SCROLL_STEP : SCROLL_STEP, behavior: 'smooth' });
  };

  const scrollServicios = (dir: 'left' | 'right') => {
    const el = serviciosScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -SCROLL_STEP : SCROLL_STEP, behavior: 'smooth' });
  };

  // Productos desde GET /api/productos (backend)
  useEffect(() => {
    getProductosSinRedirigir().then(({ data }) => {
      setProductos(shuffle(data));
      setLoadingProductos(false);
    });
  }, []);

  // Servicios desde GET /api/servicios (backend)
  useEffect(() => {
    getServicios().then(({ data }) => {
      setServicios(shuffle(data));
      setLoadingServicios(false);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Header />
      
      <main className="flex-1">
        {/* Hero con tipografía marca MIRÚ Franco */}
        <section
          className="hero-bg-gradient relative flex flex-col items-center justify-center w-full px-4 overflow-hidden"
          style={{ marginTop: '104px', height: 'calc(100vh - 104px)' }}
        >
          <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 lg:gap-6 py-0 md:items-center flex-1 min-h-0 h-full">
            {/* Logo MIRÚ Franco - máximo tamaño, centrado en parte izquierda */}
            <div className="w-full md:w-1/2 h-full md:flex md:items-center md:justify-center md:pr-2 lg:pr-4 min-h-0 flex-1 flex justify-center">
              <div
                className="relative flex-shrink-0 aspect-square mx-auto"
                style={{
                  width: 'min(90vw, calc(100vh - 130px))',
                  height: 'min(90vw, calc(100vh - 130px))',
                }}
              >
                <Image
                  src="/logo-miru.jpg"
                  alt="Mirú Franco"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 85vw, 50vw"
                  priority
                />
              </div>
            </div>

            {/* Bloque de texto - alineado al logo */}
            <div className="w-full md:w-1/2 md:flex md:flex-col md:justify-center md:items-start md:pl-4 lg:pl-6 md:-mt-26 flex flex-col items-center md:items-start text-center md:text-left min-h-0 flex-1 overflow-hidden">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <span className="hero-flourish" />
                <span className="hero-ornament" />
                <span className="hero-flourish" />
              </div>

              <div className="relative space-y-1">
                <h1 className="text-brand-miru text-brand-gold tracking-tight leading-none">
                  MIRÚ
                </h1>
                <span className="text-brand-franco text-brand-gold block -mt-0.5 md:ml-8 ml-5">
                  FRANCO
                </span>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
                  <span className="w-6 h-px shrink-0 opacity-70" style={{ backgroundColor: 'var(--logo-branding)' }} />
                  <p
                    className="text-brand-tagline tracking-[0.2em] px-2"
                    style={{ color: 'var(--hero-tagline-color)' }}
                  >
                    BEAUTY SALON
                  </p>
                  <span className="w-6 h-px shrink-0 opacity-70" style={{ backgroundColor: 'var(--logo-branding)' }} />
                </div>
              </div>

              {/* Texto descriptivo del sitio */}
              <p
                className="mt-5 md:mt-6 max-w-md text-sm md:text-base leading-relaxed"
                style={{ color: 'var(--hero-tagline-color)', opacity: 0.95 }}
              >
                Realza tu belleza natural con productos y servicios profesionales.
                Agenda tu cita, explora nuestra tienda y descubre la experiencia Mirú Franco.
              </p>

              <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
                <span className="hero-flourish" />
                <span className="hero-ornament" />
                <span className="hero-flourish" />
              </div>
            </div>
          </div>

          {/* Indicador scroll */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce z-10" style={{ animationDuration: '2.5s' }}>
            <span className="text-xs tracking-[0.3em] uppercase opacity-70" style={{ color: 'var(--hero-tagline-color)' }}>
              Descubre
            </span>
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="opacity-60" style={{ color: 'var(--logo-branding)' }} aria-hidden>
              <path d="M2 2l8 8 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </section>

        {/* Sección 1: Productos (API, orden aleatorio) */}
        <section className="py-20" style={{ backgroundColor: 'var(--fondo-general)' }}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-hero mb-4" style={{ color: '#161616' }}>
                Nuestros Productos
              </h2>
              <p className="text-lead" style={{ color: '#161616' }}>
                Descubre nuestra amplia gama de productos capilares de alta calidad.
              </p>
            </div>
            {loadingProductos ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-menu-texto-principal" />
              </div>
            ) : productos.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--hero-tagline-color)' }}>
                No hay productos disponibles por el momento.
              </p>
            ) : (
              <div className="relative">
                <ScrollArrows
                  onPrev={() => scrollProductos('left')}
                  onNext={() => scrollProductos('right')}
                  prevAriaLabel="Ver productos anteriores"
                  nextAriaLabel="Ver más productos"
                />
                <div
                  ref={productosScrollRef}
                  className={`w-full overflow-x-auto overflow-y-hidden pb-4 scroll-smooth scrollbar-hide ${SCROLL_ARROW_PADDING_X}`}
                >
                  <div className="flex gap-6 min-w-max">
                  {productos.map((producto) => {
                    const galeriaInicio = urlsGaleriaProductoCatalogo(producto);
                    return (
                    <Card
                      key={producto.id}
                      variant="elevated"
                      className="flex-shrink-0 w-72 min-w-[288px] max-w-[288px] p-0 overflow-hidden cursor-pointer text-left"
                      onClick={() => router.push('/cliente/tienda-online')}
                    >
                      <div className="aspect-square relative w-full bg-black/10">
                        {galeriaInicio.length > 0 ? (
                          <ProductoImagenCarruselTarjeta
                            urls={galeriaInicio}
                            alt={producto.nombre}
                            imageClassName="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl">🧴</div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-subtitle mb-0.5 font-semibold line-clamp-1" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                          {producto.nombre}
                        </h3>
                        <p className="text-sm line-clamp-2" style={{ color: 'rgba(242,241,237,0.8)' }}>
                          {producto.descripcion || producto.precio}
                        </p>
                      </div>
                    </Card>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}
            <div className="text-center mt-8">
              <button
                type="button"
                onClick={() => router.push('/cliente/tienda-online')}
                className="px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                style={{ backgroundColor: 'var(--botones-principales)', color: 'var(--texto-fondo-oscuro)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--botones-principales)'; }}
              >
                Ver tienda en línea →
              </button>
            </div>
          </div>
        </section>

        {/* Sección 2: Servicios (API, orden aleatorio) */}
        <section className="py-20" style={{ backgroundColor: '#2A2A2A' }}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-hero-light mb-4" style={{ color: '#F2F1ED' }}>
                Nuestros Servicios
              </h2>
              <p className="text-lead" style={{ color: '#F2F1ED' }}>
                Ofrecemos servicios profesionales para el cuidado de tu cabello.
              </p>
            </div>
            {loadingServicios ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
              </div>
            ) : servicios.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'rgba(242,241,237,0.8)' }}>
                No hay servicios disponibles por el momento.
              </p>
            ) : (
              <div className="relative">
                <ScrollArrows
                  onPrev={() => scrollServicios('left')}
                  onNext={() => scrollServicios('right')}
                  prevAriaLabel="Ver servicios anteriores"
                  nextAriaLabel="Ver más servicios"
                />
                <div
                  ref={serviciosScrollRef}
                  className={`w-full overflow-x-auto overflow-y-hidden pb-4 scroll-smooth scrollbar-hide ${SCROLL_ARROW_PADDING_X}`}
                >
                  <div className="flex gap-6 min-w-max">
                    {servicios.map((servicio) => (
                      <Card
                        key={servicio.id}
                        variant="elevated"
                        className="flex-shrink-0 w-72 min-w-[288px] max-w-[288px] p-0 overflow-hidden cursor-pointer text-left"
                        onClick={() => router.push('/cliente/servicios-citas')}
                      >
                        {(() => {
                          const imgSrc = servicio.imagen ?? servicio.imagenes?.[0];
                          const isValidSrc = typeof imgSrc === 'string' && (imgSrc.startsWith('http') || imgSrc.startsWith('/'));
                          return isValidSrc ? (
                            <div className="aspect-square relative w-full bg-black/10">
                              <Image
                                src={imgSrc}
                                alt={servicio.nombre}
                                fill
                                className="object-cover"
                                sizes="288px"
                              />
                            </div>
                          ) : (
                            <div className="aspect-square w-full flex items-center justify-center text-5xl" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>✂️</div>
                          );
                        })()}
                        <div className="p-4">
                          <h3 className="text-subtitle mb-0.5 font-semibold line-clamp-1" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                            {servicio.nombre}
                          </h3>
                          <p className="text-sm line-clamp-2" style={{ color: 'rgba(242,241,237,0.7)' }}>
                            {servicio.descripcion || servicio.duracion || servicio.precio}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sección 3: Galería (scroll lateral con flechas) — mismo fondo que Productos */}
        <section className="py-20 overflow-hidden" style={{ backgroundColor: 'var(--fondo-general)' }}>
          <div className="container mx-auto px-4 mb-8">
            <div className="text-center">
              <h2 className="text-hero mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Galería
              </h2>
              <p className="text-lead max-w-2xl mx-auto" style={{ color: 'var(--hero-tagline-color)' }}>
                Algunos de nuestros trabajos realizados.
              </p>
            </div>
          </div>
          <div className="relative">
            <ScrollArrows
              onPrev={() => scrollGaleria('left')}
              onNext={() => scrollGaleria('right')}
              prevAriaLabel="Ver galería anterior"
              nextAriaLabel="Ver más galería"
            />
            <div
              ref={galeriaScrollRef}
              className={`w-full overflow-x-auto overflow-y-hidden pb-4 scroll-smooth scrollbar-hide ${SCROLL_ARROW_PADDING_X}`}
            >
              <div className="flex gap-6 min-w-max">
                {galeriaItems.map((item) => (
                  <Card
                    key={item.id}
                    variant="elevated"
                    className="flex-shrink-0 w-72 min-w-[288px] max-w-[288px] p-0 overflow-hidden cursor-pointer text-left"
                    onClick={() => router.push('/cliente/galeria')}
                  >
                    <div
                      className="aspect-square w-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--fondos-suaves)' }}
                    >
                      <span className="text-6xl">📸</span>
                    </div>
                    <div className="p-4">
                      <p className="font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                        {item.categoria}
                      </p>
                      <p className="text-sm line-clamp-2" style={{ color: 'var(--hero-tagline-color)' }}>
                        {item.descripcion}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <div className="container mx-auto px-4 text-center mt-6">
            <button
              type="button"
              onClick={() => router.push('/cliente/galeria')}
              className="px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              style={{ backgroundColor: 'var(--botones-principales)', color: 'var(--texto-fondo-oscuro)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--botones-principales)'; }}
            >
              Ver galería completa →
            </button>
          </div>
        </section>

        {/* Sección 4: Sobre Nosotros */}
        <section className="py-20" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="rounded-lg shadow-lg p-8 border text-center" style={{ backgroundColor: '#B38E6F', borderColor: 'rgba(255,255,255,0.1)' }}>
                <h2 className="text-elegant-title mb-4" style={{ color: '#F2F1ED' }}>
                  Sobre Nosotros
                </h2>
                <p className="text-lead mb-6" style={{ color: '#F2F1ED' }}>
                  En Miru Franco, nos dedicamos a realzar tu belleza natural con productos y servicios de la más alta calidad. 
                  Nuestro equipo de profesionales está comprometido a brindarte una experiencia excepcional.
                </p>
                <p className="text-elegant-quote mb-8" style={{ color: 'rgba(242,241,237,0.9)' }}>
                  Con años de experiencia en el cuidado capilar, combinamos técnicas tradicionales con innovaciones modernas 
                  para ofrecerte resultados que superen tus expectativas.
                </p>
                <button
                  type="button"
                  className="px-8 py-3 rounded-lg font-semibold text-lg transition-colors duration-200"
                  style={{ backgroundColor: 'var(--botones-principales)', color: 'var(--texto-fondo-oscuro)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--botones-principales)'; }}
                >
                  Conoce Más
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Sección 5: CTA */}
        <section className="py-20" style={{ backgroundColor: '#2A2A2A' }}>
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center rounded-lg shadow-lg p-8 border" style={{ backgroundColor: 'rgba(242,241,237,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
              <h2 className="text-hero-light mb-4" style={{ color: '#F2F1ED' }}>
                ¿Listo para Transformar tu Look?
              </h2>
              <p className="text-lead mb-8" style={{ color: 'rgba(242,241,237,0.8)' }}>
                Agenda una cita con nosotros y descubre la diferencia que hace la calidad profesional.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  type="button"
                  className="px-8 py-3 rounded-lg font-semibold text-lg transition-colors duration-200"
                  style={{ backgroundColor: 'var(--botones-principales)', color: 'var(--texto-fondo-oscuro)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--botones-principales)'; }}
                >
                  Agendar Cita
                </button>
                <button
                  type="button"
                  className="px-8 py-3 rounded-lg font-semibold text-lg transition-colors duration-200 border"
                  style={{ borderColor: 'var(--borde-secundario)', color: 'var(--texto-fondo-oscuro)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  Ver Catálogo
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
