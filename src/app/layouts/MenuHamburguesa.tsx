'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

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

const MARCAS = [
  { label: "L'Oréal",     href: '/marcas/loreal' },
  { label: 'Kérastase',   href: '/marcas/kerastase' },
  { label: 'Revlon',      href: '/marcas/revlon' },
  { label: 'Schwarzkopf', href: '/marcas/schwarzkopf' },
  { label: 'Wella',       href: '/marcas/wella' },
  { label: 'Matrix',      href: '/marcas/matrix' },
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
                style={{
                  borderBottom: '1px solid rgba(242,241,237,0.07)',
                  opacity: 0,
                  animation: `fadeUp 350ms ease-out ${i * 75}ms forwards`,
                }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block py-4 transition-opacity hover:opacity-60"
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
        <div
          style={{
            opacity: 0,
            animation: `fadeUp 350ms ease-out ${NAV_LINKS.length * 75 + 60}ms forwards`,
            marginTop: '2rem',
            marginBottom: '2rem',
          }}
        >
          <Link
            href="/cliente/servicios-citas/crear-cita"
            onClick={onClose}
            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-sm uppercase tracking-wider hover:shadow-lg"
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
          </Link>
        </div>
      </nav>

      {/* Brands */}
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
          {MARCAS.map((marca) => (
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
              {marca.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
