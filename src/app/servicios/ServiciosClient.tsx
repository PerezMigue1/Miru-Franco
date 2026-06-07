'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useReveal } from '../hooks/useReveal';
import {
  Scissors,
  Sparkles,
  Droplets,
  Wind,
  Star,
  Calendar,
} from 'lucide-react';
import type { Servicio } from '../services/servicios';

const ICONOS = [Scissors, Sparkles, Droplets, Wind, Star, Calendar];

const SERVICIOS_FALLBACK: Servicio[] = [
  { id: 1, nombre: 'Corte y Estilo', descripcion: 'Cortes modernos y clásicos adaptados a tu rostro y personalidad.' },
  { id: 2, nombre: 'Coloración Profesional', descripcion: 'Coloración con productos de alta calidad para resultados vibrantes y duraderos.' },
  { id: 3, nombre: 'Tratamientos Capilares', descripcion: 'Tratamientos reparadores y nutritivos para cabello dañado o reseco.' },
  { id: 4, nombre: 'Alaciado', descripcion: 'Alaciado permanente y semipermanente de larga duración.' },
  { id: 5, nombre: 'Nanoplastía', descripcion: 'Tratamiento de nanoplastía para cabello liso, suave y brillante.' },
  { id: 6, nombre: 'Peinados de Evento', descripcion: 'Peinados especiales para bodas, quinceañeras y todo tipo de eventos.' },
];

interface Props {
  initialServicios: Servicio[];
}

export default function ServiciosClient({ initialServicios }: Props) {
  useReveal();
  const router = useRouter();
  const servicios = initialServicios.length > 0 ? initialServicios : SERVICIOS_FALLBACK;

  return (
    <>
      {/* Hero de sección */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8 text-center"
        style={{ backgroundColor: '#2A2A2A' }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em] mb-3"
            style={{ color: 'var(--iconografia)' }}
            data-reveal
          >
            Profesionales en cada detalle
          </p>
          <h1
            className="text-elegant-hero hyphens-none mb-6"
            style={{ color: 'var(--texto-fondo-oscuro)' }}
            data-reveal
          >
            Nuestros Servicios
          </h1>
          <p
            className="text-base leading-relaxed mb-8"
            style={{ color: 'var(--texto-fondo-oscuro-70)' }}
            data-reveal
          >
            Ofrecemos servicios profesionales de belleza diseñados para realzar tu estilo natural. Desde cortes hasta tratamientos especializados, tenemos lo que necesitas.
          </p>
          <div className="flex items-center justify-center gap-3" data-reveal>
            <span className="h-px w-16 opacity-30" style={{ backgroundColor: 'var(--iconografia)' }} />
            <span className="w-1.5 h-1.5 rounded-full opacity-50" style={{ backgroundColor: 'var(--iconografia)' }} />
            <span className="h-px w-16 opacity-30" style={{ backgroundColor: 'var(--iconografia)' }} />
          </div>
        </div>
      </section>

      {/* Grid servicios */}
      <section className="section-padding" style={{ backgroundColor: 'var(--fondo-general)' }}>
        <div className="container-max">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicios.map((servicio, i) => {
              const Icono = ICONOS[i % ICONOS.length]!;
              const imgSrc = servicio.imagen ?? servicio.imagenes?.[0];
              const isValidSrc = typeof imgSrc === 'string' && (imgSrc.startsWith('http') || imgSrc.startsWith('/'));

              return (
                <article
                  key={servicio.id}
                  data-reveal
                  className="rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                  style={{
                    borderColor: 'var(--fondos-suaves)',
                    backgroundColor: 'var(--superficie-elevada)',
                  }}
                  onClick={() => router.push('/cliente/servicios-citas')}
                >
                  {isValidSrc ? (
                    <div className="aspect-[4/3] relative w-full overflow-hidden">
                      <Image
                        src={imgSrc!}
                        alt={servicio.nombre}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                        sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
                      />
                    </div>
                  ) : (
                    <div
                      className="aspect-[4/3] flex items-center justify-center"
                      style={{ backgroundColor: 'var(--fondos-suaves)' }}
                    >
                      <Icono
                        className="w-16 h-16 opacity-60"
                        style={{ color: 'var(--logo-branding)' }}
                        strokeWidth={1.25}
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <h2
                      className="font-semibold text-lg mb-2"
                      style={{ color: 'var(--encabezados-alterno)' }}
                    >
                      {servicio.nombre}
                    </h2>
                    {(servicio.descripcion || servicio.duracion) && (
                      <p
                        className="text-sm leading-relaxed mb-4"
                        style={{ color: 'var(--encabezados-alterno)', opacity: 0.7 }}
                      >
                        {servicio.descripcion ?? servicio.duracion}
                      </p>
                    )}
                    {servicio.precio && (
                      <p
                        className="text-base font-semibold"
                        style={{ color: 'var(--botones-principales)' }}
                      >
                        {servicio.precio}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding" style={{ backgroundColor: '#2A2A2A' }}>
        <div className="container-max text-center">
          <h2
            className="text-elegant-title mb-4 hyphens-none"
            style={{ color: 'var(--texto-fondo-oscuro)' }}
            data-reveal
          >
            ¿Lista para reservar?
          </h2>
          <p
            className="text-base mb-8 leading-relaxed max-w-xl mx-auto"
            style={{ color: 'var(--texto-fondo-oscuro-70)' }}
            data-reveal
          >
            Agenda tu cita en línea y elige el servicio que mejor se adapte a tus necesidades.
          </p>
          <div data-reveal>
            <button
              type="button"
              onClick={() => router.push('/cliente/servicios-citas/crear-cita')}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-semibold text-sm uppercase tracking-wider transition-all duration-200 hover:opacity-90 hover:shadow-lg"
              style={{
                backgroundColor: 'var(--botones-principales)',
                color: 'var(--texto-fondo-oscuro)',
                minHeight: '44px',
              }}
            >
              Agendar Cita
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
