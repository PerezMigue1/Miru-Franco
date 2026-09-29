'use client';

import { useRef, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ScrollArrows, { SCROLL_ARROW_PADDING_X } from '../ui/ScrollArrows';
import { ProductoImagenCarruselTarjeta } from '../tienda/ProductoImagenCarruselTarjeta';
import { urlsGaleriaProductoCatalogo, type Producto } from '../../services/productos';
import type { Servicio } from '../../services/servicios';
import { ArrowRight, Calendar, Clock3, Droplets, Scissors, Sparkles, Star, Wind } from 'lucide-react';
import ServicioImagen, { ServicioImagenPlaceholder } from '../servicios/ServicioImagen';
import { useInclinacion3D } from '../../hooks/useInclinacion3D';
import { formatearPrecioMXN } from '../../utils/formatoPrecio';

const CARD_WIDTH_PX = 288;
const SCROLL_STEP = CARD_WIDTH_PX + 24;

type FallbackServicio = {
  id: number;
  nombre: string;
  descripcion: string;
  icono: ComponentType<{ className?: string; strokeWidth?: number; style?: CSSProperties }>;
};

/** Se muestran solo si el backend no devolvió servicios (misma lista de siempre). */
const SERVICIOS_FALLBACK: FallbackServicio[] = [
  { id: 1, nombre: 'Corte y Estilo', descripcion: 'Cortes modernos y clásicos adaptados a tu rostro y personalidad.', icono: Scissors },
  { id: 2, nombre: 'Coloración', descripcion: 'Coloración profesional con productos de alta calidad.', icono: Sparkles },
  { id: 3, nombre: 'Tratamientos', descripcion: 'Tratamientos reparadores y nutritivos para cabello dañado.', icono: Droplets },
  { id: 4, nombre: 'Alaciado', descripcion: 'Alaciado permanente y semipermanente de larga duración.', icono: Wind },
  { id: 5, nombre: 'Nanoplastía', descripcion: 'Tratamiento de nanoplastía para cabello liso y brillante.', icono: Star },
  { id: 6, nombre: 'Peinados de Evento', descripcion: 'Peinados especiales para bodas, quinceañeras y eventos.', icono: Calendar },
];

interface Props {
  initialProductos: Producto[];
  initialServicios: Servicio[];
}

/** Encabezado de sección alineado a la izquierda con su acción a la derecha (sin eyebrow). */
function EncabezadoSeccion({
  titulo,
  descripcion,
  accion,
  sobreOscuro = false,
}: {
  titulo: string;
  descripcion?: string;
  accion?: { href: string; label: string };
  sobreOscuro?: boolean;
}) {
  const colorTitulo = sobreOscuro ? 'var(--texto-fondo-oscuro)' : 'var(--encabezados-alterno)';
  const colorTexto = sobreOscuro ? 'var(--texto-fondo-oscuro-70)' : 'var(--encabezados-alterno)';
  return (
    <div className="mf-revelar flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-10 md:mb-14">
      <div className="max-w-xl">
        <h2 className="text-elegant-title hyphens-none" style={{ color: colorTitulo, letterSpacing: '-0.02em' }}>
          {titulo}
        </h2>
        {descripcion && (
          <p className="mt-3 text-base md:text-lg" style={{ color: colorTexto, opacity: sobreOscuro ? 1 : 0.85 }}>
            {descripcion}
          </p>
        )}
      </div>
      {accion && (
        <Link
          href={accion.href}
          className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider underline-offset-4 hover:underline"
          style={{ color: sobreOscuro ? 'var(--texto-fondo-oscuro)' : 'var(--menu-texto-principal)', minHeight: 44 }}
        >
          {accion.label}
          <ArrowRight
            size={16}
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-1"
            style={{ color: 'var(--logo-branding)' }}
          />
        </Link>
      )}
    </div>
  );
}

function TarjetaProducto({ producto }: { producto: Producto }) {
  const ref = useInclinacion3D<HTMLAnchorElement>(5);
  const galeria = urlsGaleriaProductoCatalogo(producto);
  return (
    <Link
      ref={ref}
      href={`/cliente/tienda-online/productos/${encodeURIComponent(String(producto.id))}`}
      className="mf-inclinable group block flex-shrink-0 w-72 overflow-hidden text-left"
      style={{
        backgroundColor: 'var(--tarjetas-paneles)',
        borderRadius: 'var(--mf-radio)',
        boxShadow: 'var(--mf-sombra-1)',
      }}
    >
      <div className="aspect-square relative w-full overflow-hidden" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
        {galeria.length > 0 ? (
          <ProductoImagenCarruselTarjeta
            urls={galeria}
            alt={producto.nombre}
            imageClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <ServicioImagenPlaceholder />
        )}
      </div>
      <div className="mf-capa-frontal p-5">
        <h3 className="font-semibold text-base line-clamp-1" style={{ color: 'var(--menu-texto-principal)' }}>
          {producto.nombre}
        </h3>
        {producto.marca && (
          <p className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {producto.marca}
          </p>
        )}
        <p className="mf-cifras mt-3 text-lg font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
          {formatearPrecioMXN(producto.precio)}
        </p>
      </div>
    </Link>
  );
}

function TarjetaServicio({ servicio, destacada }: { servicio: Servicio; destacada: boolean }) {
  const ref = useInclinacion3D<HTMLAnchorElement>(destacada ? 3 : 5);
  const meta = [servicio.duracion ?? (servicio.duracionMinutos ? `${servicio.duracionMinutos} min` : ''), formatearPrecioMXN(servicio.precio)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Link
      ref={ref}
      href={`/cliente/servicios-citas/servicios/${encodeURIComponent(String(servicio.id))}`}
      className={`mf-inclinable mf-revelar group flex flex-col overflow-hidden ${destacada ? 'lg:col-span-2 lg:row-span-2' : ''}`}
      style={{ borderRadius: 'var(--mf-radio)', backgroundColor: 'rgba(255, 255, 255, 0.04)', boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.07)' }}
    >
      <div className={`relative w-full overflow-hidden ${destacada ? 'aspect-[4/3] lg:aspect-auto lg:flex-1 lg:min-h-[22rem]' : 'aspect-[4/3]'}`}>
        <ServicioImagen
          src={servicio.imagen ?? servicio.imagenes?.[0]}
          alt={servicio.nombre}
          sizes={destacada ? '(max-width:1024px) 100vw, 50vw' : '(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw'}
        />
      </div>
      <div className="mf-capa-frontal p-5">
        <h3
          className={destacada ? 'text-2xl font-semibold' : 'text-base font-semibold'}
          style={{ color: 'var(--texto-fondo-oscuro)', fontFamily: destacada ? 'var(--font-family-serif)' : undefined }}
        >
          {servicio.nombre}
        </h3>
        {destacada && servicio.descripcion && (
          <p className="mt-2 text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
            {servicio.descripcion}
          </p>
        )}
        {meta && (
          <p className="mf-cifras mt-2 flex items-center gap-1.5 text-sm" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
            <Clock3 size={14} aria-hidden style={{ color: 'var(--logo-branding)' }} />
            {meta}
          </p>
        )}
      </div>
    </Link>
  );
}

function BotonPrimario({ href, children, claro = false }: { href: string; children: ReactNode; claro?: boolean }) {
  return (
    <Link
      href={href}
      className={`mf-btn inline-flex items-center justify-center gap-2 px-7 rounded-full font-semibold text-sm uppercase tracking-wider ${
        claro ? 'bg-[var(--texto-fondo-oscuro)] hover:brightness-[0.92]' : 'bg-[var(--botones-principales)] hover:bg-[var(--hover)]'
      }`}
      style={{ color: claro ? 'var(--botones-principales)' : 'var(--texto-fondo-oscuro)', minHeight: 48 }}
    >
      {children}
      <ArrowRight size={16} aria-hidden />
    </Link>
  );
}

export default function HomeLandingClient({ initialProductos, initialServicios }: Props) {
  const productosScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    productosScrollRef.current?.scrollBy({ left: dir === 'left' ? -SCROLL_STEP : SCROLL_STEP, behavior: 'smooth' });
  };

  const servicios = initialServicios.slice(0, 5);
  const fotoSalon = initialServicios.map((s) => s.imagen ?? s.imagenes?.[0]).find((u) => u?.startsWith('http'));

  return (
    <>
      {/* ── Productos ── */}
      <section className="py-20 md:py-28 layout-gutter-x" style={{ backgroundColor: 'var(--fondo-general)' }}>
        <div className="container-max">
          <EncabezadoSeccion
            titulo="Nuestros Productos"
            descripcion="Lo que usamos en el salón, para que lo sigas en casa."
            accion={{ href: '/cliente/tienda-online', label: 'Ver tienda completa' }}
          />

          {initialProductos.length === 0 ? (
            <p className="py-8" style={{ color: 'var(--encabezados-alterno)' }}>
              No hay productos disponibles por el momento.
            </p>
          ) : (
            <div className="relative mf-revelar">
              <ScrollArrows
                onPrev={() => scroll('left')}
                onNext={() => scroll('right')}
                prevAriaLabel="Ver productos anteriores"
                nextAriaLabel="Ver más productos"
              />
              <div
                ref={productosScrollRef}
                className={`w-full overflow-x-auto overflow-y-hidden pt-2 pb-6 scroll-smooth scrollbar-hide ${SCROLL_ARROW_PADDING_X}`}
              >
                <div className="flex gap-6 min-w-max">
                  {initialProductos.map((producto) => (
                    <div key={producto.id}>
                      <TarjetaProducto producto={producto} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Servicios: banda carbón, composición asimétrica (uno destacado + cuatro) ── */}
      <section className="py-20 md:py-28 layout-gutter-x" style={{ backgroundColor: 'var(--mf-banda)' }}>
        <div className="container-max">
          <EncabezadoSeccion
            titulo="Nuestros Servicios"
            descripcion="Elige un servicio para ver qué incluye y reservar tu horario."
            accion={{ href: '/cliente/servicios-citas', label: 'Todos los servicios' }}
            sobreOscuro
          />

          {servicios.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-fr gap-5">
              {servicios.map((s, i) => (
                <TarjetaServicio key={s.id} servicio={s} destacada={i === 0} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SERVICIOS_FALLBACK.map((s) => {
                const Icono = s.icono;
                return (
                  <div
                    key={s.id}
                    className="mf-revelar rounded-[14px] p-6"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.07)' }}
                  >
                    <Icono className="w-8 h-8 mb-4" strokeWidth={1.25} style={{ color: 'var(--logo-branding)' }} />
                    <h3 className="font-semibold" style={{ color: 'var(--texto-fondo-oscuro)' }}>{s.nombre}</h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>{s.descripcion}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Sobre nosotros: foto real del salón en arco (eco del monograma) ── */}
      <section className="py-20 md:py-28 layout-gutter-x" style={{ backgroundColor: 'var(--fondo-general)' }}>
        <div className="container-max grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
          <div className="mf-revelar flex justify-center lg:justify-start order-last lg:order-first">
            <div className="relative w-64 sm:w-80 aspect-[4/5]">
              <div
                className="absolute -inset-3 rounded-t-full border"
                style={{ borderColor: 'rgba(159, 109, 31, 0.55)' }}
                aria-hidden
              />
              <div className="relative h-full w-full overflow-hidden rounded-t-full" style={{ boxShadow: 'var(--mf-sombra-2)' }}>
                {fotoSalon ? (
                  <Image src={fotoSalon} alt="Trabajo realizado en Mirú Franco" fill className="object-cover" sizes="(max-width: 640px) 256px, 320px" />
                ) : (
                  <ServicioImagenPlaceholder />
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="mf-revelar text-elegant-title mb-6 hyphens-none" style={{ color: 'var(--encabezados-alterno)', letterSpacing: '-0.02em' }}>
              Sobre Nosotros
            </h2>
            <p className="mf-revelar text-base md:text-lg leading-relaxed mb-4 max-w-[62ch]" style={{ color: 'var(--encabezados-alterno)' }}>
              En Mirú Franco, nos dedicamos a realzar tu belleza natural con productos y servicios de la más alta calidad. Nuestro equipo de profesionales está comprometido a brindarte una experiencia excepcional en cada visita.
            </p>
            <p className="mf-revelar text-base leading-relaxed mb-10 max-w-[62ch]" style={{ color: 'var(--encabezados-alterno)', opacity: 0.8 }}>
              Con años de experiencia en el cuidado capilar, combinamos técnicas tradicionales con innovaciones modernas para ofrecerte resultados que superen tus expectativas.
            </p>
            <dl className="mf-revelar grid grid-cols-3 border-t pt-6" style={{ borderColor: 'var(--mf-linea)' }}>
              {[
                { num: '5+', label: 'Años de experiencia' },
                { num: '500+', label: 'Clientes satisfechos' },
                { num: '15+', label: 'Servicios disponibles' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`px-3 sm:px-6 first:pl-0 ${i < 2 ? 'border-r' : ''}`}
                  style={{ borderColor: 'var(--mf-linea)' }}
                >
                  <dt className="sr-only">{stat.label}</dt>
                  <dd
                    className="mf-cifras text-3xl md:text-4xl font-bold leading-none"
                    style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
                  >
                    {stat.num}
                  </dd>
                  <dd className="mt-2 text-xs sm:text-sm" style={{ color: 'var(--encabezados-alterno)' }} aria-hidden>
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Cierre: banda vino con una sola acción primaria ── */}
      <section className="layout-gutter-x py-20 md:py-24" style={{ backgroundColor: 'var(--botones-principales)' }}>
        <div className="mf-revelar container-max flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="max-w-xl">
            <h2
              className="text-elegant-title hyphens-none"
              style={{ color: 'var(--texto-fondo-oscuro)', letterSpacing: '-0.02em' }}
            >
              ¿Lista para tu cambio de look?
            </h2>
            <p className="mt-3 text-base md:text-lg" style={{ color: 'var(--texto-fondo-oscuro-80)' }}>
              Agenda una cita con nosotros y descubre la diferencia que hace la calidad profesional.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
            <BotonPrimario href="/cliente/servicios-citas" claro>
              Agendar cita
            </BotonPrimario>
            <Link
              href="/contacto"
              className="text-sm font-semibold uppercase tracking-wider underline-offset-4 hover:underline"
              style={{ color: 'var(--texto-fondo-oscuro)', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
            >
              Contactar
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
