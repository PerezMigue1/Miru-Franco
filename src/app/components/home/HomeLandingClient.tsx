'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Card from '../ui/Card';
import ScrollArrows, { SCROLL_ARROW_PADDING_X } from '../ui/ScrollArrows';
import { ProductoImagenCarruselTarjeta } from '../tienda/ProductoImagenCarruselTarjeta';
import { urlsGaleriaProductoCatalogo, type Producto } from '../../services/productos';
import type { Servicio } from '../../services/servicios';
import { useReveal } from '../../hooks/useReveal';
import {
  Scissors,
  Sparkles,
  Droplets,
  Wind,
  Star,
  Calendar,
  Camera,
} from 'lucide-react';
import GalleryModal from '../ui/GalleryModal';

const CARD_WIDTH_PX = 288;
const SCROLL_STEP = CARD_WIDTH_PX + 24;

const SERVICIOS_FALLBACK = [
  { id: 1, nombre: 'Corte y Estilo', descripcion: 'Cortes modernos y clásicos adaptados a tu rostro y personalidad.', icono: Scissors },
  { id: 2, nombre: 'Coloración', descripcion: 'Coloración profesional con productos de alta calidad.', icono: Sparkles },
  { id: 3, nombre: 'Tratamientos', descripcion: 'Tratamientos reparadores y nutritivos para cabello dañado.', icono: Droplets },
  { id: 4, nombre: 'Alaciado', descripcion: 'Alaciado permanente y semipermanente de larga duración.', icono: Wind },
  { id: 5, nombre: 'Nanoplastía', descripcion: 'Tratamiento de nanoplastía para cabello liso y brillante.', icono: Star },
  { id: 6, nombre: 'Peinados de Evento', descripcion: 'Peinados especiales para bodas, quinceañeras y eventos.', icono: Calendar },
];

const GALERIA_ITEMS = [
  { id: 1, categoria: 'Corte', descripcion: 'Corte moderno y elegante' },
  { id: 2, categoria: 'Coloración', descripcion: 'Coloración profesional' },
  { id: 3, categoria: 'Alaciado', descripcion: 'Alaciado perfecto' },
  { id: 4, categoria: 'Nanoplastía', descripcion: 'Tratamiento de nanoplastía' },
  { id: 5, categoria: 'Peinado', descripcion: 'Peinado para evento especial' },
  { id: 6, categoria: 'Tratamiento', descripcion: 'Tratamiento reparador' },
  { id: 7, categoria: 'Corte', descripcion: 'Corte clásico' },
  { id: 8, categoria: 'Mechas', descripcion: 'Mechas profesionales' },
];

interface Props {
  initialProductos: Producto[];
  initialServicios: Servicio[];
}

function SectionHeader({ eyebrow, title, light = false }: { eyebrow: string; title: string; light?: boolean }) {
  return (
    <div className="text-center mb-12 md:mb-16" data-reveal>
      <p
        className="text-xs font-semibold uppercase tracking-[0.25em] mb-3"
        style={{ color: light ? 'var(--iconografia)' : 'var(--logo-branding)' }}
      >
        {eyebrow}
      </p>
      <h2
        className="text-elegant-title hyphens-none"
        style={{ color: light ? 'var(--texto-fondo-oscuro)' : 'var(--encabezados-alterno)' }}
      >
        {title}
      </h2>
      <div className="flex items-center justify-center gap-3 mt-4">
        <span className="h-px w-12 opacity-40" style={{ backgroundColor: light ? 'var(--iconografia)' : 'var(--logo-branding)' }} />
        <span className="w-1.5 h-1.5 rounded-full opacity-60" style={{ backgroundColor: light ? 'var(--iconografia)' : 'var(--logo-branding)' }} />
        <span className="h-px w-12 opacity-40" style={{ backgroundColor: light ? 'var(--iconografia)' : 'var(--logo-branding)' }} />
      </div>
    </div>
  );
}

type FallbackServicio = {
  id: number;
  nombre: string;
  descripcion: string;
  icono: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
};

export default function HomeLandingClient({ initialProductos, initialServicios }: Props) {
  useReveal();
  const router = useRouter();
  const productosScrollRef = useRef<HTMLDivElement>(null);
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    ref.current?.scrollBy({ left: dir === 'left' ? -SCROLL_STEP : SCROLL_STEP, behavior: 'smooth' });
  };

  const serviciosParaMostrar: (Servicio | FallbackServicio)[] =
    initialServicios.length > 0 ? initialServicios.slice(0, 6) : SERVICIOS_FALLBACK;

  return (
    <>
      {/* ── Productos ── */}
      <section className="section-padding" style={{ backgroundColor: 'var(--fondo-general)' }}>
        <div className="container-max">
          <SectionHeader eyebrow="Tienda en línea" title="Nuestros Productos" />

          {initialProductos.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
              No hay productos disponibles por el momento.
            </p>
          ) : (
            <div className="relative" data-reveal>
              <ScrollArrows
                onPrev={() => scroll(productosScrollRef, 'left')}
                onNext={() => scroll(productosScrollRef, 'right')}
                prevAriaLabel="Ver productos anteriores"
                nextAriaLabel="Ver más productos"
              />
              <div
                ref={productosScrollRef}
                className={`w-full overflow-x-auto overflow-y-hidden pb-4 scroll-smooth scrollbar-hide ${SCROLL_ARROW_PADDING_X}`}
              >
                <div className="flex gap-6 min-w-max">
                  {initialProductos.map((producto) => {
                    const galeria = urlsGaleriaProductoCatalogo(producto);
                    return (
                      <Card
                        key={producto.id}
                        variant="elevated"
                        className="flex-shrink-0 w-72 min-w-[288px] max-w-[288px] p-0 overflow-hidden cursor-pointer text-left group"
                        onClick={() => router.push('/cliente/tienda-online')}
                      >
                        <div className="aspect-square relative w-full overflow-hidden">
                          {galeria.length > 0 ? (
                            <ProductoImagenCarruselTarjeta
                              urls={galeria}
                              alt={producto.nombre}
                              imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center text-5xl"
                              style={{ backgroundColor: 'var(--fondos-suaves)' }}
                            >
                              🧴
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-base line-clamp-1 mb-1" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                            {producto.nombre}
                          </h3>
                          <p className="text-sm line-clamp-2 opacity-75" style={{ color: 'var(--texto-fondo-oscuro)' }}>
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

          <div className="text-center mt-10" data-reveal>
            <button
              type="button"
              onClick={() => router.push('/cliente/tienda-online')}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm uppercase tracking-wider transition-all duration-200 hover:shadow-lg"
              style={{
                backgroundColor: 'var(--botones-principales)',
                color: 'var(--texto-fondo-oscuro)',
                boxShadow: '0 4px 24px -4px rgba(113,0,20,0.25)',
                minHeight: '44px',
                transition: 'background-color 200ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--botones-principales)'; }}
            >
              Ver tienda completa →
            </button>
          </div>
        </div>
      </section>

      {/* ── Servicios ── */}
      <section className="section-padding" style={{ backgroundColor: 'var(--tarjetas-paneles)' }}>
        <div className="container-max">
          <SectionHeader eyebrow="Lo que ofrecemos" title="Nuestros Servicios" light />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviciosParaMostrar.map((s) => {
              const isFallback = 'icono' in s;
              const IconComp = isFallback ? (s as FallbackServicio).icono : null;
              const apiS = !isFallback ? (s as Servicio) : null;
              const imgSrc = apiS?.imagen ?? apiS?.imagenes?.[0];
              const isValidSrc = typeof imgSrc === 'string' && (imgSrc.startsWith('http') || imgSrc.startsWith('/'));

              return (
                <div
                  key={s.id}
                  data-reveal
                  className="rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
                  onClick={() => router.push('/servicios')}
                >
                  {isValidSrc ? (
                    <div className="aspect-[4/3] relative w-full">
                      <Image
                        src={imgSrc!}
                        alt={s.nombre}
                        fill
                        className="object-cover"
                        sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
                      />
                    </div>
                  ) : (
                    <div
                      className="aspect-[4/3] flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(159,109,31,0.1)' }}
                    >
                      {IconComp ? (
                        <IconComp className="w-14 h-14 opacity-70" style={{ color: 'var(--iconografia)' }} strokeWidth={1.25} />
                      ) : (
                        <Scissors className="w-14 h-14 opacity-70" style={{ color: 'var(--iconografia)' }} strokeWidth={1.25} />
                      )}
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                      {s.nombre}
                    </h3>
                    <p className="text-sm leading-relaxed opacity-70" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                      {isFallback
                        ? (s as FallbackServicio).descripcion
                        : (apiS?.descripcion ?? apiS?.duracion ?? '')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10" data-reveal>
            <button
              type="button"
              onClick={() => router.push('/cliente/servicios-citas')}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm uppercase tracking-wider border transition-all duration-200"
              style={{ borderColor: 'var(--logo-branding)', color: 'var(--logo-branding)', minHeight: '44px', transition: 'background-color 200ms ease, border-color 200ms ease, color 200ms ease' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover)';
                e.currentTarget.style.borderColor = 'var(--hover)';
                e.currentTarget.style.color = 'var(--texto-fondo-oscuro)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'var(--logo-branding)';
                e.currentTarget.style.color = 'var(--logo-branding)';
              }}
            >
              Agendar cita →
            </button>
          </div>
        </div>
      </section>

      {/* ── Galería ── */}
      <section className="section-padding" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
        <div className="container-max">
          <SectionHeader eyebrow="Nuestro trabajo" title="Galería" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GALERIA_ITEMS.slice(0, 6).map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGalleryIdx(idx)}
                className="group relative overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 w-full"
                aria-label={`Ver ${item.categoria}`}
                data-reveal
              >
                <div
                  className="aspect-[4/5] w-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundColor: 'var(--tarjetas-paneles)' }}
                >
                  <Camera size={40} aria-hidden style={{ color: 'var(--iconografia)', opacity: 0.5 }} />
                </div>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-end pb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: 'rgba(113,0,20,0.6)' }}
                >
                  <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                    {item.categoria}
                  </p>
                  <p className="text-xs opacity-80 mt-1" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                    {item.descripcion}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="text-center mt-10" data-reveal>
            <button
              type="button"
              onClick={() => router.push('/cliente/galeria')}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm uppercase tracking-wider"
              style={{
                backgroundColor: 'var(--botones-principales)',
                color: 'var(--texto-fondo-oscuro)',
                minHeight: '44px',
                transition: 'background-color 200ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--botones-principales)'; }}
            >
              Ver galería completa →
            </button>
          </div>
        </div>
      </section>

      {/* ── Sobre Nosotros ── */}
      <section className="section-padding" style={{ backgroundColor: 'var(--fondo-general)' }}>
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.25em] mb-3"
                style={{ color: 'var(--logo-branding)' }}
                data-reveal
              >
                Quiénes somos
              </p>
              <h2 className="text-elegant-title mb-6 hyphens-none" style={{ color: 'var(--encabezados-alterno)' }} data-reveal>
                Sobre Nosotros
              </h2>
              <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--encabezados-alterno)' }} data-reveal>
                En Mirú Franco, nos dedicamos a realzar tu belleza natural con productos y servicios de la más alta calidad. Nuestro equipo de profesionales está comprometido a brindarte una experiencia excepcional en cada visita.
              </p>
              <p
                className="text-base leading-relaxed mb-10"
                style={{ color: 'var(--encabezados-alterno)', opacity: 0.75 }}
                data-reveal
              >
                Con años de experiencia en el cuidado capilar, combinamos técnicas tradicionales con innovaciones modernas para ofrecerte resultados que superen tus expectativas.
              </p>
              <div className="grid grid-cols-3 gap-6" data-reveal>
                {[
                  { num: '5+', label: 'Años de experiencia' },
                  { num: '500+', label: 'Clientes satisfechos' },
                  { num: '15+', label: 'Servicios disponibles' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p
                      className="text-4xl font-bold leading-none mb-1"
                      style={{ color: 'var(--botones-principales)', fontFamily: 'var(--font-family-serif)' }}
                    >
                      {stat.num}
                    </p>
                    <p className="text-xs leading-snug" style={{ color: 'var(--encabezados-alterno)', opacity: 0.65 }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center" data-reveal>
              <div
                className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full overflow-hidden shadow-2xl"
                style={{ outline: '3px solid var(--logo-branding)', outlineOffset: '6px' }}
              >
                <Image
                  src="/logo-miru.jpg"
                  alt="Mirú Franco"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 288px, 384px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="section-padding" style={{ backgroundColor: 'var(--tarjetas-paneles)' }}>
        <div className="container-max">
          <div
            className="max-w-3xl mx-auto text-center rounded-3xl p-10 sm:p-14 border"
            style={{ backgroundColor: 'rgba(159,109,31,0.08)', borderColor: 'rgba(159,109,31,0.2)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-[0.25em] mb-3"
              style={{ color: 'var(--iconografia)' }}
              data-reveal
            >
              Da el siguiente paso
            </p>
            <h2 className="text-hero-light mb-4 hyphens-none" style={{ color: 'var(--texto-fondo-oscuro)' }} data-reveal>
              ¿Lista para tu cambio de look?
            </h2>
            <p
              className="text-base mb-10 leading-relaxed"
              style={{ color: 'var(--texto-fondo-oscuro-70)' }}
              data-reveal
            >
              Agenda una cita con nosotros y descubre la diferencia que hace la calidad profesional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center" data-reveal>
              <button
                type="button"
                onClick={() => router.push('/cliente/servicios-citas/crear-cita')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-sm uppercase tracking-wider hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--botones-principales)',
                  color: 'var(--texto-fondo-oscuro)',
                  minHeight: '44px',
                  transition: 'background-color 200ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--botones-principales)'; }}
              >
                Agendar Cita
              </button>
              <button
                type="button"
                onClick={() => router.push('/servicios')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-sm uppercase tracking-wider border"
                style={{
                  borderColor: 'rgba(159,109,31,0.5)',
                  color: 'var(--logo-branding)',
                  minHeight: '44px',
                  transition: 'background-color 200ms ease, border-color 200ms ease, color 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover)';
                  e.currentTarget.style.borderColor = 'var(--hover)';
                  e.currentTarget.style.color = 'var(--texto-fondo-oscuro)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(159,109,31,0.5)';
                  e.currentTarget.style.color = 'var(--logo-branding)';
                }}
              >
                Ver Servicios
              </button>
            </div>
          </div>
        </div>
      </section>
      <GalleryModal
        items={GALERIA_ITEMS}
        currentIndex={galleryIdx}
        onClose={() => setGalleryIdx(null)}
        onNavigate={setGalleryIdx}
      />
    </>
  );
}
