'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuHamburguesaProps {
  onClose: () => void;
}

export default function MenuHamburguesa({ onClose }: MenuHamburguesaProps) {
  const pathname = usePathname();
  
  const menuItems = [
    { name: 'Inicio', href: '/home', icon: '🏠' },
    { name: 'Tienda en línea', href: '/cliente/tienda-online', icon: '🛒' },
    { name: 'Servicios', href: '/cliente/servicios-citas', icon: '✨' },
    { name: 'Tratamientos', href: '/tratamientos', icon: '💆‍♀️' },
    { name: 'Promociones', href: '/promociones', icon: '🎁' },
    { name: 'Sobre Nosotros', href: '/sobre-nosotros', icon: '👥' },
    { name: 'Contacto', href: '/contacto', icon: '📞' },
  ];

  const marcas = [
    { name: 'L\'Oréal', href: '/marcas/loreal' },
    { name: 'Kerastase', href: '/marcas/kerastase' },
    { name: 'Revlon', href: '/marcas/revlon' },
    { name: 'Schwarzkopf', href: '/marcas/schwarzkopf' },
    { name: 'Wella', href: '/marcas/wella' },
    { name: 'Matrix', href: '/marcas/matrix' },
    { name: 'Pantene', href: '/marcas/pantene' },
  ];

  return (
    <nav className="h-full">
      {/* Sección de Menú Principal */}
      <div className="p-4 border-b border-white/10 dark:border-white/20">
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-gray-900 dark:text-white">
          Menú Principal
        </h3>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    isActive ? 'bg-[var(--hover)] text-white' : 'text-gray-900 dark:text-white hover:opacity-80'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sección de Marcas */}
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-gray-900 dark:text-white">
          Marcas de Productos
        </h3>
        <ul className="space-y-1">
          {marcas.map((marca) => {
            const isActive = pathname === marca.href;
            return (
              <li key={marca.name}>
                <Link
                  href={marca.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    isActive ? 'bg-[var(--hover)] text-white' : 'text-gray-900 dark:text-white hover:opacity-80'
                  }`}
                >
                  <span className="font-medium">{marca.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

