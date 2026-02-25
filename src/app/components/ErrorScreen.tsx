'use client';

import Link from 'next/link';
import { colors } from '../utils/colors';

interface ErrorScreenProps {
  codigo: number;
  titulo: string;
  mensaje: string;
  icono?: string;
}

const ENLACES = [
  { href: '/', label: 'Inicio' },
  { href: '/home', label: 'Home' },
  { href: '/cliente/tienda-online', label: 'Tienda' },
  { href: '/cliente/servicios-citas', label: 'Servicios y citas' },
  { href: '/login', label: 'Iniciar sesión' },
];

export default function ErrorScreen({ codigo, titulo, mensaje, icono }: ErrorScreenProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: colors.fondoGeneral }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8 sm:p-10 shadow-xl text-center"
        style={{
          backgroundColor: colors.tarjetasPaneles,
          border: `2px solid ${colors.fondosSuaves}`,
        }}
      >
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full flex items-center justify-center text-4xl sm:text-5xl mb-6"
          style={{ backgroundColor: colors.headerFooter, color: colors.textoFondoOscuro }}
        >
          {icono ?? '⚠'}
        </div>
        <p
          className="text-5xl sm:text-6xl font-bold mb-2"
          style={{ color: colors.menuTextoPrincipal }}
        >
          {codigo}
        </p>
        <h1
          className="text-xl sm:text-2xl font-semibold mb-3"
          style={{ color: colors.menuTextoPrincipal }}
        >
          {titulo}
        </h1>
        <p
          className="text-sm sm:text-base mb-8"
          style={{ color: colors.encabezadosAlterno }}
        >
          {mensaje}
        </p>

        <div className="space-y-3">
          <p
            className="text-sm font-medium"
            style={{ color: colors.menuTextoPrincipal }}
          >
            Volver a:
          </p>
          <nav className="flex flex-wrap justify-center gap-2">
            {ENLACES.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: colors.botonesPrincipales,
                  color: colors.textoFondoOscuro,
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
