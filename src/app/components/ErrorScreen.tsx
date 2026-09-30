'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Lock, SearchX, ServerCrash, TriangleAlert, type LucideIcon } from 'lucide-react';
import SuperficieCliente from './cliente/SuperficieCliente';

type IconoError = 'acceso' | 'buscar' | 'servidor' | 'solicitud';

interface ErrorScreenProps {
  codigo: number;
  titulo: string;
  mensaje: string;
  icono?: IconoError;
}

const ICONOS: Record<IconoError, LucideIcon> = {
  acceso: Lock,
  buscar: SearchX,
  servidor: ServerCrash,
  solicitud: TriangleAlert,
};

const ENLACES = [
  { href: '/cliente/tienda-online', label: 'Tienda' },
  { href: '/cliente/servicios-citas', label: 'Servicios y citas' },
  { href: '/login', label: 'Iniciar sesión' },
];

/** Pantalla de error (400, 403, 404, 500): monograma, código, explicación y una salida clara. */
export default function ErrorScreen({ codigo, titulo, mensaje, icono = 'solicitud' }: ErrorScreenProps) {
  const Icono = ICONOS[icono];
  return (
    <SuperficieCliente
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: 'var(--fondo-general)' }}
    >
      <main className="mf-entrada w-full max-w-lg text-center">
        <span className="relative mx-auto mb-8 block h-16 w-16">
          <Image src="/logo-miru.jpg" alt="Mirú Franco" fill sizes="64px" className="object-contain" priority />
        </span>
        <p
          className="mf-cifras flex items-center justify-center gap-3 text-6xl font-bold leading-none sm:text-7xl"
          style={{ color: 'var(--oro-grande)', fontFamily: 'var(--font-family-serif)' }}
        >
          <Icono size={34} strokeWidth={1.5} aria-hidden />
          {codigo}
        </p>
        <h1 className="mf-titulo-pagina mt-5" style={{ color: 'var(--menu-texto-principal)' }}>
          {titulo}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed" style={{ color: 'var(--encabezados-alterno)' }}>
          {mensaje}
        </p>

        <Link
          href="/home"
          className="mf-btn mf-btn-color mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold uppercase tracking-wider"
          style={{
            ['--btn-bg' as string]: 'var(--botones-principales)',
            ['--btn-bg-hover' as string]: 'var(--hover)',
            ['--btn-texto' as string]: '#F2F1ED',
          }}
        >
          Volver al inicio
          <ArrowRight size={16} aria-hidden />
        </Link>

        <nav aria-label="Otras secciones" className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-1">
          {ENLACES.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </main>
    </SuperficieCliente>
  );
}
