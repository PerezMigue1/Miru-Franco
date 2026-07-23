'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOSTRAR_MARCAS, MARCAS_ROTAS } from './marcasRotas';

interface ItemMenu {
  name: string;
  href: string;
  /** Prefijo contra el que se compara pathname para marcar "activo". Por defecto, `href`. */
  activeMatch?: string;
  icon: React.ReactNode;
}

const menuPrincipal: ItemMenu[] = [
  {
    name: 'Inicio',
    href: '/home',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
  },
  {
    name: 'Tienda',
    href: '/cliente/tienda-online',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    ),
  },
  {
    // /servicios redirige a /cliente/servicios-citas — el "activo" se marca
    // contra el destino real, no contra la URL de entrada.
    name: 'Servicios y citas',
    href: '/servicios',
    activeMatch: '/cliente/servicios-citas',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
  },
];

export default function MenuHorizontal() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-center w-full">
      <ul className="flex items-center space-x-1 overflow-x-auto scrollbar-hide relative">
        {menuPrincipal.map((item) => {
          const isActive = pathname?.startsWith(item.activeMatch ?? item.href);
          return (
            <li key={item.name} className="relative shrink-0">
              <Link
                href={item.href}
                className={`relative flex items-center gap-2 px-5 py-2.5 transition-all duration-300 whitespace-nowrap rounded-full text-texto-fondo-oscuro ${
                  isActive ? 'shadow-lg' : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--hover)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                </svg>
                <span className="font-semibold text-sm">{item.name}</span>
                {isActive && (
                  <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </Link>
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-0.5 rounded-full bg-menu-texto-principal" />
              )}
            </li>
          );
        })}

        {/* Enlaces rotos: /marcas/* nunca se construyó. Ocultos, no borrar. */}
        {MOSTRAR_MARCAS &&
          MARCAS_ROTAS.map((marca) => {
            const isActive = pathname === marca.href;
            return (
              <li key={marca.name} className="relative">
                <Link
                  href={marca.href}
                  className={`relative flex items-center gap-2 px-5 py-2.5 transition-all duration-300 whitespace-nowrap rounded-full text-texto-fondo-oscuro ${
                    isActive ? 'shadow-lg' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--hover)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span className="font-semibold text-sm">{marca.name}</span>
                  {isActive && (
                    <svg className="w-3.5 h-3.5 ml-0.5 text-menu-texto-principal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </Link>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-20 h-0.5 rounded-full bg-menu-texto-principal" />
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
