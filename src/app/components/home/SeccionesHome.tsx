import { Suspense, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import type { Producto } from '../../services/productos';
import type { Servicio } from '../../services/servicios';
import { ArrowRight, Calendar, Clock3, Droplets, Scissors, Sparkles, Star, Wind } from 'lucide-react';
import ServicioImagen, { ServicioImagenPlaceholder } from '../servicios/ServicioImagen';
import { formatearPrecioMXN } from '../../utils/formatoPrecio';
import { fotosDeServicios } from '../../utils/galeria';
import GaleriaTrabajo from '../galeria/GaleriaTrabajo';
import GaleriaVacia from '../galeria/GaleriaVacia';
import CarruselProductosHome from './CarruselProductosHome';

/*
 * Secciones del home bajo el hero. Componente de servidor: el HTML llega hecho y no se hidrata.
 * Solo el carrusel de productos y la galería son islas cliente. Cada sección va en su <Suspense>:
 * el HTML es el mismo, pero React hidrata cada una como unidad aparte y cede el hilo entre ellas
 * (tareas cortas en lugar de una sola larga).
 */

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

/** Fila de la carta de servicios: nombre en Playfair, duración y precio; la foto es solo una miniatura
 * (las fotos grandes viven en la galería "Nuestro trabajo", sin repetir el mismo mosaico dos veces). */
function FilaServicio({ servicio }: { servicio: Servicio }) {
  const duracion = servicio.duracion ?? (servicio.duracionMinutos ? `${servicio.duracionMinutos} min` : '');
  return (
    <Link
      href={`/cliente/servicios-citas/servicios/${encodeURIComponent(String(servicio.id))}`}
      className="mf-carta-fila group"
    >
      <span className="mf-carta-fila__miniatura">
        <ServicioImagen src={servicio.imagen ?? servicio.imagenes?.[0]} alt="" sizes="64px" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-semibold" style={{ color: 'var(--texto-fondo-oscuro)', fontFamily: 'var(--font-family-serif)' }}>
          {servicio.nombre}
        </span>
        {duracion && (
          <span className="mf-cifras mt-0.5 flex items-center gap-1.5 text-sm" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
            <Clock3 size={14} aria-hidden style={{ color: 'var(--oro-sobre-carbon)' }} />
            {duracion}
          </span>
        )}
      </span>
      {servicio.precio && (
        <span className="mf-cifras shrink-0 text-base font-semibold" style={{ color: 'var(--oro-sobre-carbon)' }}>
          {formatearPrecioMXN(servicio.precio)}
        </span>
      )}
      <ArrowRight size={16} aria-hidden className="mf-carta-fila__flecha shrink-0" />
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

export default function SeccionesHome({ initialProductos, initialServicios }: Props) {
  const servicios = initialServicios.slice(0, 6);
  const fotos = fotosDeServicios(initialServicios).slice(0, 7);

  return (
    <>
      {/* ── Productos ── */}
      <Suspense fallback={null}>
        <section className="mf-diferido py-20 md:py-28 layout-gutter-x" style={{ backgroundColor: 'var(--fondo-general)' }}>
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
              <Suspense fallback={null}>
                <CarruselProductosHome productos={initialProductos} />
              </Suspense>
            )}
          </div>
        </section>
      </Suspense>

      {/* ── Servicios: banda carbón, composición asimétrica (uno destacado + cuatro) ── */}
      <Suspense fallback={null}>
        <section className="mf-diferido py-20 md:py-28 layout-gutter-x" style={{ backgroundColor: 'var(--mf-banda)' }}>
          <div className="container-max">
            <EncabezadoSeccion
              titulo="Nuestros Servicios"
              descripcion="Nuestra carta: elige un servicio para ver qué incluye y reservar tu horario."
              accion={{ href: '/cliente/servicios-citas', label: 'Todos los servicios' }}
              sobreOscuro
            />

            {servicios.length > 0 ? (
              <ul className="mf-carta mf-revelar">
                {servicios.map((s) => (
                  <li key={s.id}>
                    <FilaServicio servicio={s} />
                  </li>
                ))}
              </ul>
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
      </Suspense>

      {/* ── Nuestro trabajo: fotos reales de los servicios (mismas que sube el equipo desde
          /operacion/subir-imagenes). Sin fotos, estado vacío honesto; nunca relleno. ── */}
      <Suspense fallback={null}>
        <section className="mf-diferido py-20 md:py-28 layout-gutter-x" style={{ backgroundColor: 'var(--fondo-general)' }}>
          <div className="container-max">
            <EncabezadoSeccion
              titulo="Nuestro trabajo"
              descripcion="Fotos de servicios hechos en el salón. Tócalas para verlas en grande."
              accion={fotos.length > 0 ? { href: '/cliente/galeria', label: 'Ver galería completa' } : undefined}
            />
            <div className="mf-revelar">
              {fotos.length > 0 ? (
                <Suspense fallback={null}>
                  <GaleriaTrabajo fotos={fotos} etiqueta="Fotos de trabajos del salón" />
                </Suspense>
              ) : (
                <GaleriaVacia />
              )}
            </div>
          </div>
        </section>
      </Suspense>

      {/* ── Sobre nosotros: monograma en arco (las fotos reales ya viven en la galería) ── */}
      <Suspense fallback={null}>
        <section className="mf-diferido py-20 md:py-28 layout-gutter-x" style={{ backgroundColor: 'var(--fondo-general)' }}>
          <div className="container-max grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
            <div className="mf-revelar flex justify-center lg:justify-start order-last lg:order-first">
              <div className="relative w-64 sm:w-80 aspect-[4/5]">
                <div
                  className="absolute -inset-3 rounded-t-full border"
                  style={{ borderColor: 'rgba(159, 109, 31, 0.55)' }}
                  aria-hidden
                />
                <div className="relative h-full w-full overflow-hidden rounded-t-full" style={{ boxShadow: 'var(--mf-sombra-2)' }}>
                  <ServicioImagenPlaceholder />
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
      </Suspense>

      {/* ── Cierre: banda vino con una sola acción primaria ── */}
      <Suspense fallback={null}>
        <section className="mf-diferido layout-gutter-x py-20 md:py-24" style={{ backgroundColor: 'var(--botones-principales)' }}>
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
      </Suspense>
    </>
  );
}
