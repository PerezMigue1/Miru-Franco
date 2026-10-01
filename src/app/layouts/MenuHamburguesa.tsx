'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { MOSTRAR_MARCAS, MARCAS_ROTAS } from './marcasRotas';

interface MenuHamburguesaProps {
  onClose: () => void;
}

const NAV_LINKS = [
  { label: 'Inicio',         href: '/home' },
  { label: 'Servicios',      href: '/servicios' },
  { label: 'Tienda',         href: '/cliente/tienda-online' },
  { label: 'Sobre Nosotros', href: '/sobre-nosotros' },
  { label: 'Contacto',       href: '/contacto' },
];

export default function MenuHamburguesa({ onClose }: MenuHamburguesaProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <p
          className="text-xs font-semibold uppercase tracking-[0.3em]"
          style={{ color: 'var(--iconografia)' }}
        >
          Menú
        </p>
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
          className="flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
          style={{
            color: 'var(--texto-fondo-oscuro)',
            minHeight: '44px',
            minWidth: '44px',
          }}
        >
          <X size={22} aria-hidden />
        </button>
      </div>

      {/* Main nav */}
      <nav className="px-6 pt-2 flex-1">
        <ul>
          {NAV_LINKS.map((item, i) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/home' && pathname?.startsWith(item.href));
            return (
              <li
                key={item.href}
                className="mf-entrada"
                style={{ borderBottom: '1px solid rgba(242,241,237,0.07)', ['--i' as string]: i }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block py-4 transition-opacity hover:opacity-70"
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontSize: 'clamp(1.625rem, 5.5vw, 2.25rem)',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: isActive ? 'var(--logo-branding)' : 'var(--texto-fondo-oscuro)',
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <div className="mf-entrada my-8" style={{ ['--i' as string]: NAV_LINKS.length }}>
          {/* Reservar empieza eligiendo el servicio (crear-cita sin servicio no se puede completar) */}
          <Link
            href="/cliente/servicios-citas"
            onClick={onClose}
            className="mf-btn mf-btn-color inline-flex min-h-12 items-center justify-center px-8 py-4 rounded-full font-semibold text-sm uppercase tracking-wider"
            style={{
              ['--btn-bg' as string]: 'var(--botones-principales)',
              ['--btn-bg-hover' as string]: 'var(--hover)',
              ['--btn-texto' as string]: '#F2F1ED',
            }}
          >
            Agendar Cita
          </Link>
        </div>
      </nav>

      {/* Enlaces rotos: /marcas/* nunca se construyó. Ocultos, no borrar. */}
      {MOSTRAR_MARCAS && (
        <div
          className="px-6 pb-8 border-t"
          style={{
            borderColor: 'rgba(242,241,237,0.07)',
            opacity: 0,
            animation: `fadeIn 400ms ease-out ${NAV_LINKS.length * 75 + 140}ms forwards`,
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] mt-6 mb-3"
            style={{ color: 'var(--iconografia)' }}
          >
            Marcas
          </p>
          <div className="flex flex-wrap gap-2">
            {MARCAS_ROTAS.map((marca) => (
              <Link
                key={marca.href}
                href={marca.href}
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
                style={{
                  backgroundColor: 'rgba(242,241,237,0.07)',
                  color: 'var(--texto-fondo-oscuro-70)',
                  minHeight: '36px',
                }}
              >
                {marca.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
