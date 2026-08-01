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
  const fixedBarRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('Usuario');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Mide la altura real del header + barra de navegación (fijos) y la expone como variable
  // CSS global. Evita repetir un número de px adivinado en cada página que necesita dejar
  // espacio debajo de la barra fija (antes había 5 valores distintos y desincronizados:
  // 104px en varias páginas, 136px en ModuleLayout — ninguno coincidía con la altura real).
  useEffect(() => {
    const el = fixedBarRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const actualizar = () => {
      document.documentElement.style.setProperty('--mf-header-offset', `${el.offsetHeight}px`);
    };
    actualizar();
    const observer = new ResizeObserver(actualizar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // Backdrop-blur al hacer scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Bloquear scroll del body cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  // Cerrar menú con Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMenuOpen]);

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
      {/* Barra fija: header + navegación secundaria en un solo bloque medido, para que
          las páginas que dejan espacio debajo (`var(--mf-header-offset)`) siempre acierten,
          sea cual sea la altura real que termine teniendo (cambia con el logo apilado, el
          tamaño de fuente, o el idioma). */}
      <div
        ref={fixedBarRef}
        className={`fixed top-0 left-0 right-0 z-50 flex flex-col transition-all duration-300 ${scrolled ? 'shadow-lg' : 'shadow-sm'}`}
      >
        {/* Barra Superior - Top Header */}
        <header
          className={`transition-all duration-300 ${scrolled ? 'backdrop-blur-sm' : ''}`}
          style={{ backgroundColor: scrolled ? 'rgba(22,22,22,0.96)' : 'var(--header-footer)' }}
        >
        <div className="layout-page">
          <div className="flex items-center gap-2 sm:gap-3 py-2">
            {/* Izquierda: Menu + Logo (apilado: imagen arriba, nombre abajo) */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center justify-center hover:opacity-80 transition-opacity text-texto-fondo-oscuro shrink-0"
                aria-label="Menu"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Apilado (imagen arriba, texto abajo, centrado) solo en móvil; de sm: en
                  adelante vuelve a ser lado a lado como en escritorio de toda la vida. */}
              <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-3 shrink-0 min-w-0 overflow-hidden">
                <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16">
                  <Image
                    src="/logo-miru.jpg"
                    alt="Mirú Franco Logo"
                    fill
                    sizes="64px"
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col items-center sm:items-start min-w-0 leading-tight">
                  <h1
                    className="text-logo text-logo-branding truncate max-w-full"
                    style={{
                      textShadow: '0 2px 4px rgba(159, 109, 31, 0.3)',
                      margin: 0,
                      padding: 0
                    }}
                  >
                    MIRÚ <span className="italic">FRANCO</span>
                  </h1>
                  <h2
                    className="text-logo-small text-logo-branding truncate max-w-full"
                    style={{
                      textShadow: '0 2px 4px rgba(159, 109, 31, 0.3)',
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    BEAUTY SALÓN
                  </h2>
                </div>
              </div>
            </div>

            {/* Derecha: Tema + Carrito + Notificaciones + Usuario */}
            <div className="flex items-center gap-1 sm:gap-3 md:gap-4 ml-auto shrink-0">
              <ThemeToggle />
              {/* Carrito */}
              <Link
                href="/cliente/tienda-online/carrito"
                className="relative p-1.5 sm:p-2 hover:opacity-80 transition-opacity text-texto-fondo-oscuro shrink-0"
                aria-label="Carrito"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="relative shrink-0">
                <button
                  onClick={() => router.push('/cliente/notificaciones')}
                  className="p-1.5 sm:p-2 hover:opacity-80 transition-opacity relative text-texto-fondo-oscuro"
                  aria-label="Notificaciones"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <span className="hidden sm:block text-base font-medium max-w-[120px] truncate">{userName}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 rounded-lg shadow-xl border min-w-[240px] overflow-hidden"
                      style={{ borderColor: 'var(--borde-visible)', backgroundColor: 'var(--tarjetas-paneles)' }}
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
                            <p className="font-bold text-base truncate" style={{ color: 'var(--texto-fondo-oscuro)' }}>{userName}</p>
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                router.push('/perfil');
                              }}
                              className="text-sm font-medium hover:underline flex items-center gap-1"
                              style={{ color: 'var(--enlaces-textos-interactivos)' }}
                            >
                              Mi perfil
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <hr style={{ borderColor: 'var(--borde-visible)' }} />
                      {/* Mi cuenta */}
                      <div className="py-2">
                        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--texto-fondo-oscuro)', opacity: 0.5 }}>
                          Mi cuenta
                        </p>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push('/cliente/tienda-online/mis-pedidos');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--hover)]/10 transition-colors"
                          style={{ color: 'var(--texto-fondo-oscuro)' }}
                        >
                          Mis pedidos
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push('/cliente/servicios-citas/mis-citas');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--hover)]/10 transition-colors"
                          style={{ color: 'var(--texto-fondo-oscuro)' }}
                        >
                          Mis citas
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push('/cliente/tienda-online');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--hover)]/10 transition-colors"
                          style={{ color: 'var(--texto-fondo-oscuro)' }}
                        >
                          Sigue comprando
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push('/cliente/tienda-online/carrito');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--hover)]/10 transition-colors flex items-center justify-between"
                          style={{ color: 'var(--texto-fondo-oscuro)' }}
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
                      <hr style={{ borderColor: 'var(--borde-visible)' }} />
                      <div className="py-2">
                        <button
                          onClick={handleLogout}
                          disabled={loading}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--hover)]/10 transition-colors disabled:opacity-50"
                          style={{ color: 'var(--texto-fondo-oscuro)' }}
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
                  className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-texto-fondo-oscuro shrink-0"
                  style={{ backgroundColor: 'var(--hover)' }}
                  aria-label="Iniciar sesión"
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline whitespace-nowrap">Iniciar sesión</span>
                </Link>
              )}

            </div>
          </div>
        </div>
        </header>

        {/* Barra de Navegación Secundaria — ya no necesita posición fija propia ni un
            offset "top" adivinado: es simplemente el segundo hijo de la barra fija de
            arriba, así que siempre queda pegada al header sin importar su altura real. */}
        <nav style={{ backgroundColor: 'var(--botones-principales)' }}>
          <div className="layout-page">
            <div className="flex items-center justify-center h-14">
              <MenuHorizontal />
            </div>
          </div>
        </nav>
      </div>

      {/* Menú móvil — panel lateral */}
      {isMenuOpen && (
        <>
          <div
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] z-50 shadow-2xl overflow-y-auto scrollbar-hide"
            style={{ backgroundColor: 'var(--header-footer)' }}
          >
            <MenuHamburguesa onClose={() => setIsMenuOpen(false)} />
          </div>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
        </>
      )}
    </>
  );
}

