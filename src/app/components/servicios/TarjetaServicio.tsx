'use client';

import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import ServicioImagen from './ServicioImagen';
import type { Servicio } from '../../services/servicios';
import { useInclinacion3D } from '../../hooks/useInclinacion3D';
import { formatearPrecioMXN } from '../../utils/formatoPrecio';

/**
 * Tarjeta del catálogo de servicios (DESIGN.md): foto a sangre, nombre, duración y precio
 * con formato, e inclinación 3D en escritorio. Es un enlace real (antes un div con onClick).
 */
export default function TarjetaServicio({ servicio, indice }: { servicio: Servicio; indice: number }) {
  const { ref, brilloRef } = useInclinacion3D<HTMLAnchorElement>();
  const duracion = servicio.duracion ?? (servicio.duracionMinutos ? `${servicio.duracionMinutos} min` : '');
  const precio = formatearPrecioMXN(servicio.precio);

  return (
    <div className="mf-entrada h-full" style={{ ['--i' as string]: Math.min(indice, 8) }}>
      <Link
        ref={ref}
        href={`/cliente/servicios-citas/servicios/${encodeURIComponent(String(servicio.id))}`}
        className="mf-inclinable group h-full flex flex-col overflow-hidden"
        style={{ borderRadius: 'var(--mf-radio)', backgroundColor: 'var(--tarjetas-paneles)', boxShadow: 'var(--mf-sombra-1)' }}
      >
        <span ref={brilloRef} className="mf-inclinable__brillo" aria-hidden />
        <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
          <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <ServicioImagen
              src={servicio.imagen ?? servicio.imagenes?.[0]}
              alt={servicio.nombre}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          {servicio.categoria && (
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--encabezados-alterno)' }}>
              {servicio.categoria}
            </p>
          )}
          <h3 className="mt-1.5 text-lg font-semibold leading-snug" style={{ color: 'var(--menu-texto-principal)' }}>
            {servicio.nombre}
          </h3>
          {servicio.descripcion && (
            <p className="mt-2 text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--encabezados-alterno)' }}>
              {servicio.descripcion}
            </p>
          )}
          <div className="mt-auto pt-5 flex items-end justify-between gap-3">
            <div className="mf-cifras">
              {duracion && (
                <p className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  <Clock3 size={14} aria-hidden style={{ color: 'var(--logo-branding)' }} />
                  {duracion}
                </p>
              )}
              {precio && (
                <p className="mt-1 text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                  {precio}
                </p>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
              Ver y agendar
              <ArrowRight size={16} aria-hidden className="transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
