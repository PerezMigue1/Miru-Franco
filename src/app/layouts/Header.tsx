'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import MenuHorizontal from './MenuHorizontal';
import MenuHamburguesa from './MenuHamburguesa';
import ThemeToggle from '../components/ui/ThemeToggle';
import { clearAuthData, getToken } from '../utils/security';
import { useCart } from '../context/CartContext';
import { normalizarUsuarioAlmacenado } from '../utils/normalizarUsuarioAlmacenado';
import { MIRU_USER_STORAGE_UPDATED } from '../utils/userStorageSync';
import { listarNotificaciones } from '../services/ecommerce';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('Usuario');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);

  const syncUserFromStorage = () => {
    const token = getToken();
    const logged = !!(token && token.trim());
    setIsLoggedIn(logged);
    if (typeof window === 'undefined' || !logged) {
      setUserName('Usuario');
      setUserAvatarUrl(null);
      return;
    }
    try {
      const raw = localStorage.getItem('user');
      if (!raw) {
        setUserName('Usuario');
        setUserAvatarUrl(null);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      const user = normalizarUsuarioAlmacenado(parsed);
      const name = String(user.nombre ?? 'Usuario').trim() || 'Usuario';
      setUserName(name);
      const foto = String(user.foto ?? '').trim();
      setUserAvatarUrl(foto || null);
    } catch {
      setUserName('Usuario');
      setUserAvatarUrl(null);
    }
  };

  // Sesión, nombre y foto al montar, al navegar y cuando otro módulo actualiza `localStorage.user`
  useEffect(() => {
    syncUserFromStorage();
  }, [pathname]);

  useEffect(() => {
    const onUserUpdated = () => syncUserFromStorage();
    window.addEventListener(MIRU_USER_STORAGE_UPDATED, onUserUpdated);
    return () => window.removeEventListener(MIRU_USER_STORAGE_UPDATED, onUserUpdated);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cargarNotificaciones = async () => {
      if (!getToken()) {
        if (!cancelled) setNotificationsCount(0);
        return;
      }
      try {
        const list = await listarNotificaciones();
        if (cancelled) return;
        const noLeidas = list.filter((n) => n.leida !== true).length;
        setNotificationsCount(noLeidas);
      } catch {
        if (!cancelled) setNotificationsCount(0);
      }
    };
    void cargarNotificaciones();
    const onRefresh = () => void cargarNotificaciones();
    window.addEventListener(MIRU_USER_STORAGE_UPDATED, onRefresh);
    window.addEventListener('focus', onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(MIRU_USER_STORAGE_UPDATED, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [pathname]);

  // Cerrar menú usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // ✅ Logout individual (solo este dispositivo)
  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setLoading(true);

    // Marcar que el logout fue iniciado manualmente desde el frontend
    if (typeof window !== 'undefined') {
      localStorage.setItem('manualLogout', 'true');
    }
    
    try {
      const { api } = await import('../services');
      const result = await api.logout(false);
      
      if (result.success) {
        clearAuthData();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('manualLogout');
        }
        router.push('/login');
      } else {
        // Incluso si falla, limpiar localmente
        clearAuthData();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('manualLogout');
        }
        router.push('/login');
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Limpiar localmente incluso si falla
      clearAuthData();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('manualLogout');
      }
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Barra Superior - Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 shadow-sm bg-header-footer">
        <div className="layout-page">
          <div className="flex items-center justify-between" style={{ minHeight: '56px', padding: '8px 0' }}>
            {/* Izquierda: Menu + Logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:opacity-80 transition-opacity text-texto-fondo-oscuro"
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
                    className="text-logo text-logo-branding"
                    style={{ 
                      textShadow: '0 2px 4px rgba(159, 109, 31, 0.3)',
                      margin: 0,
                      padding: 0
                    }}
                  >
                    MIRÚ FRANCO
                </h1>
                  <h2
                    className="text-logo-small text-logo-branding"
                    style={{ 
                      textShadow: '0 2px 4px rgba(159, 109, 31, 0.3)',
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

            {/* Derecha: Tema + Carrito + Notificaciones + Usuario */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {/* Carrito */}
              <Link
                href="/cliente/tienda-online/carrito"
                className="relative p-2 hover:opacity-80 transition-opacity text-texto-fondo-oscuro"
                aria-label="Carrito"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {totalItems > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: 'var(--botones-principales)', color: 'var(--texto-fondo-oscuro)' }}
                  >
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>
              {/* Notificaciones */}
              <div className="relative">
                <button
                  onClick={() => router.push('/cliente/notificaciones')}
                  className="p-2 hover:opacity-80 transition-opacity relative text-texto-fondo-oscuro"
                  aria-label="Notificaciones"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationsCount > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-danger text-texto-fondo-oscuro"
                    >
                      {notificationsCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Usuario: Iniciar sesión si no está logueado, menú con perfil y cerrar sesión si sí */}
              {isLoggedIn ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity text-texto-fondo-oscuro"
                  >
                    {userAvatarUrl ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-white/25">
                        <Image
                          src={userAvatarUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="32px"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    )}
                    <span className="text-base font-medium max-w-[120px] truncate">{userName}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isUserMenuOpen && (
                    <div 
                      className="absolute right-0 mt-2 rounded-lg shadow-xl border min-w-[240px] bg-white dark:bg-[#8a0018] overflow-hidden"
                      style={{ borderColor: 'var(--borde-visible)' }}
                    >
                      {/* Cabecera: usuario y perfil */}
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-lg"
                            style={
                              userAvatarUrl
                                ? undefined
                                : { backgroundColor: 'var(--hover)', color: 'var(--texto-fondo-oscuro)' }
                            }
                          >
                            {userAvatarUrl ? (
                              <Image
                                src={userAvatarUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="48px"
                                unoptimized
                              />
                            ) : (
                              userName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase() || 'U'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-base truncate text-gray-900 dark:text-white">{userName}</p>
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                router.push('/perfil');
                              }}
                              className="text-sm font-medium hover:underline flex items-center gap-1 text-gray-700 dark:text-gray-200"
                            >
                              Mi perfil
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <hr className="border-gray-200 dark:border-white/20" />
                      {/* Mi cuenta */}
                      <div className="py-2">
                        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Mi cuenta
                        </p>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push('/cliente/tienda-online/mis-pedidos');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-900 dark:text-white"
                        >
                          Mis pedidos
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push('/cliente/tienda-online');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-900 dark:text-white"
                        >
                          Sigue comprando
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push('/cliente/tienda-online/carrito');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-900 dark:text-white flex items-center justify-between"
                        >
                          Carrito
                          {totalItems > 0 && (
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'var(--botones-principales)', color: 'var(--texto-fondo-oscuro)' }}
                            >
                              {totalItems}
                            </span>
                          )}
                        </button>
                      </div>
                      <hr className="border-gray-200 dark:border-white/20" />
                      <div className="py-2">
                        <button
                          onClick={handleLogout}
                          disabled={loading}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-900 dark:text-white disabled:opacity-50"
                        >
                          {loading ? 'Cerrando...' : 'Cerrar sesión'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-texto-fondo-oscuro"
                  style={{ backgroundColor: 'var(--hover)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Menú Hamburguesa */}
      {isMenuOpen && (
        <div 
          className="fixed left-0 w-80 h-[calc(100vh-72px)] z-50 overflow-y-auto scrollbar-hide shadow-xl bg-white dark:bg-[#710014] top-[72px]"
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
      <nav className="fixed left-0 right-0 z-30 shadow-md" style={{ top: '72px', backgroundColor: '#710014' }}>
        <div className="layout-page">
          <div className="flex items-center justify-center h-14">
            <MenuHorizontal />
          </div>
        </div>
      </nav>
    </>
  );
}

