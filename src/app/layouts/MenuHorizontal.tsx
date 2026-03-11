'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MenuHorizontal() {
  const pathname = usePathname();
  
  const marcas = [
    { 
      name: 'L\'Oréal', 
      href: '/marcas/loreal',
    },
    { 
      name: 'Kerastase', 
      href: '/marcas/kerastase',
    },
    { 
      name: 'Revlon', 
      href: '/marcas/revlon',
    },
    { 
      name: 'Schwarzkopf', 
      href: '/marcas/schwarzkopf',
    },
    { 
      name: 'Wella', 
      href: '/marcas/wella',
    },
    { 
      name: 'Matrix', 
      href: '/marcas/matrix',
    },
    { 
      name: 'Pantene', 
      href: '/marcas/pantene',
    },
  ];

  return (
    <div className="flex items-center justify-center w-full">
      <ul className="flex items-center space-x-1 overflow-x-auto scrollbar-hide relative">
        {/* Tienda en línea - primer ítem */}
        <li className="relative shrink-0">
          <Link
            href="/cliente/tienda-online"
            className={`relative flex items-center gap-2 px-5 py-2.5 transition-all duration-300 whitespace-nowrap rounded-full text-texto-fondo-oscuro ${
              pathname?.startsWith('/cliente/tienda-online') ? 'shadow-lg' : 'hover:opacity-90'
            }`}
            style={{
              backgroundColor: pathname?.startsWith('/cliente/tienda-online') ? 'var(--hover)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!pathname?.startsWith('/cliente/tienda-online')) {
                e.currentTarget.style.backgroundColor = 'var(--hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!pathname?.startsWith('/cliente/tienda-online')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="font-semibold text-sm">Tienda</span>
            {pathname?.startsWith('/cliente/tienda-online') && (
              <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </Link>
          {pathname?.startsWith('/cliente/tienda-online') && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-0.5 rounded-full bg-menu-texto-principal" />
          )}
        </li>
        {marcas.map((marca) => {
          const isActive = pathname === marca.href;
          return (
            <li key={marca.name} className="relative">
              <Link
                href={marca.href}
                className={`relative flex items-center gap-2 px-5 py-2.5 transition-all duration-300 whitespace-nowrap rounded-full text-texto-fondo-oscuro ${
                  isActive 
                    ? 'shadow-lg' 
                    : 'hover:opacity-90'
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
                <span className="font-semibold text-sm">
                  {marca.name}
                </span>
                {isActive && (
                  <>
                    <svg 
                      className="w-3.5 h-3.5 ml-0.5 text-menu-texto-principal" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </Link>
              {/* Underline decorativo debajo del item activo */}
              {isActive && (
                <div 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-20 h-0.5 rounded-full bg-menu-texto-principal"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

