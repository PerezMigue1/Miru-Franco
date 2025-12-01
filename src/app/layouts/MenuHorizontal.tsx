'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { colors, colorsWithOpacity } from '../utils/colors';

export default function MenuHorizontal() {
  const pathname = usePathname();
  
  const marcas = [
    { 
      name: 'L\'Oréal', 
      href: '/marcas/loreal',
      logo: 'https://logos-world.net/wp-content/uploads/2020/04/LOr%C3%A9al-Logo.png'
    },
    { 
      name: 'Kerastase', 
      href: '/marcas/kerastase',
      logo: 'https://logos-world.net/wp-content/uploads/2020/04/Kerastase-Logo.png'
    },
    { 
      name: 'Revlon', 
      href: '/marcas/revlon',
      logo: 'https://logos-world.net/wp-content/uploads/2020/04/Revlon-Logo.png'
    },
    { 
      name: 'Schwarzkopf', 
      href: '/marcas/schwarzkopf',
      logo: 'https://logos-world.net/wp-content/uploads/2020/05/Schwarzkopf-Logo.png'
    },
    { 
      name: 'Wella', 
      href: '/marcas/wella',
      logo: 'https://logos-world.net/wp-content/uploads/2020/05/Wella-Logo.png'
    },
    { 
      name: 'Matrix', 
      href: '/marcas/matrix',
      logo: 'https://logos-world.net/wp-content/uploads/2020/05/Matrix-Logo.png'
    },
    { 
      name: 'Pantene', 
      href: '/marcas/pantene',
      logo: 'https://logos-world.net/wp-content/uploads/2020/05/Pantene-Logo.png'
    },
  ];

  return (
    <div className="flex items-center justify-center w-full">
      <ul className="flex items-center space-x-1 overflow-x-auto scrollbar-hide relative">
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
                  backgroundColor: isActive ? colorsWithOpacity.hover15 : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = colorsWithOpacity.hover20;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="relative w-5 h-5 flex-shrink-0">
                  <Image
                    src={marca.logo}
                    alt={marca.name}
                    fill
                    className="object-contain"
                    style={{ 
                      filter: isActive 
                        ? 'brightness(0) invert(1)' 
                        : 'brightness(0) invert(1)',
                      opacity: isActive ? 1 : 0.8
                    }}
                    unoptimized
                  />
                </div>
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

