'use client';

import { useState } from 'react';
import Image from 'next/image';
import MenuHorizontal from './MenuHorizontal';
import MenuHamburguesa from './MenuHamburguesa';

export default function Header() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const notificationsCount = 0; // Cambia este valor cuando tengas notificaciones

  return (
    <>
      {/* Barra Superior - Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 shadow-sm" style={{ backgroundColor: '#710014' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between" style={{ minHeight: '56px', padding: '8px 0' }}>
            {/* Izquierda: Menu + Logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:opacity-80 transition-opacity"
                style={{ color: '#F2F1ED' }}
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: '64px', height: '64px' }}>
                  <Image
                    src="/logo-miru.jpg"
                    alt="Mirú Franco Logo"
                    width={64}
                    height={64}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col items-start justify-center">
                  <h1 
                    className="text-base md:text-lg font-bold tracking-wide uppercase"
                    style={{ 
                      color: '#F2F1ED',
                      textShadow: '0 2px 4px rgba(212, 175, 55, 0.3)',
                      letterSpacing: '0.05em',
                      lineHeight: '1.2',
                      margin: 0,
                      padding: 0
                    }}
                  >
                    MIRÚ FRANCO
                  </h1>
                  <h2
                    className="text-xs md:text-sm font-semibold tracking-wide uppercase"
                    style={{ 
                      color: '#F2F1ED',
                      textShadow: '0 2px 4px rgba(212, 175, 55, 0.3)',
                      letterSpacing: '0.05em',
                      lineHeight: '1.2',
                      margin: 0,
                      padding: 0,
                      marginTop: '2px'
                    }}
                  >
                    BEAUTY SALÓN
                  </h2>
                </div>
              </div>
            </div>

            {/* Derecha: Notificaciones + Usuario */}
            <div className="flex items-center gap-4">
              {/* Notificaciones */}
              <div className="relative">
                <button
                  className="p-2 hover:opacity-80 transition-opacity relative"
                  style={{ color: '#F2F1ED' }}
                  aria-label="Notificaciones"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationsCount > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: '#590C0C', color: '#F2F1ED' }}
                    >
                      {notificationsCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Usuario */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  style={{ color: '#F2F1ED' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">Usuario</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 rounded-lg shadow-lg border min-w-[200px]"
                    style={{ backgroundColor: '#710014', borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <div className="py-2">
                      <a href="#" className="block px-4 py-2 hover:opacity-80 transition-opacity" style={{ color: '#F2F1ED' }}>
                        Mi Perfil
                      </a>
                      <a href="#" className="block px-4 py-2 hover:opacity-80 transition-opacity" style={{ color: '#F2F1ED' }}>
                        Configuración
                      </a>
                      <a href="#" className="block px-4 py-2 hover:opacity-80 transition-opacity" style={{ color: '#F2F1ED' }}>
                        Cerrar Sesión
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Menú Hamburguesa */}
      {isMenuOpen && (
        <div 
          className="fixed left-0 w-80 h-[calc(100vh-72px)] z-50 overflow-y-auto shadow-xl"
          style={{ backgroundColor: '#F2F1ED', top: '72px' }}
        >
          <MenuHamburguesa onClose={() => setIsMenuOpen(false)} />
        </div>
      )}

      {/* Overlay para cerrar el menú */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Barra de Navegación Secundaria */}
      <nav className="fixed left-0 right-0 z-30 shadow-md" style={{ backgroundColor: '#161616', top: '72px' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-14">
            <MenuHorizontal />
          </div>
        </div>
      </nav>
    </>
  );
}

