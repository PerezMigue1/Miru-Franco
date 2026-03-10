'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../ui/Button';
import { clearAuthData } from '../../utils/security';
import { showAlert } from '../../utils/toast';
import { api } from '../../services/auth';

interface UserInfo {
  id?: string;
  nombre: string;
  email: string;
  rol: string;
  rolRaw?: string;
  desde: string;
}

type NormalizedRole = 'admin' | 'estilista' | 'empleado' | 'becario' | 'cliente';

function normalizeRole(raw?: string): NormalizedRole {
  const r = (raw || '').toLowerCase().trim();
  if (r.includes('admin')) return 'admin';
  if (r.includes('estilista')) return 'estilista';
  if (r.includes('empleado') || r.includes('auxiliar')) return 'empleado';
  if (r.includes('bec')) return 'becario';
  return 'cliente';
}

function roleLabel(role: NormalizedRole): string {
  switch (role) {
    case 'admin': return 'Administrador';
    case 'estilista': return 'Estilista';
    case 'empleado': return 'Empleado';
    case 'becario': return 'Becario';
    default: return 'Cliente';
  }
}

// Siempre usar variables CSS para respetar light/dark mode
const LINK_BLUE = 'var(--enlaces-textos-interactivos)';

type SidebarItem = 'perfil' | 'pedidos' | 'tienda' | 'seguridad';
type ActiveSection = 'informacion-personal' | 'datos-cuenta' | null;

interface ProfileCard {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href?: string;
  section?: ActiveSection;
  alert?: boolean;
}

interface InfoListItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  verified?: boolean;
}

export default function UserProfile() {
  const router = useRouter();
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dismissBanner, setDismissBanner] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [user, setUser] = useState<UserInfo>({
    nombre: '',
    email: '',
    rol: 'Cliente',
    desde: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const result = await api.getProfile();
        if (result.success && result.data) {
          const rawRole: string = String(result.data.rol ?? (result.data as { role?: string }).role ?? 'usuario');
          const normalized = normalizeRole(rawRole);
          const displayRole = roleLabel(normalized);
          const createdAt = result.data.creadoEn ? new Date(result.data.creadoEn) : undefined;
          const desde = createdAt ? String(createdAt.getFullYear()) : '';

          setUser({
            id: result.data.id,
            nombre: result.data.nombre || '',
            email: result.data.email || '',
            rol: displayRole,
            rolRaw: rawRole,
            desde,
          });
          return;
        }
      } catch {
        // Fallback a localStorage
      }

      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser) as Record<string, unknown>;
            const rawRole = (parsed.rol as string) || (parsed.role as string) || 'usuario';
            const normalized = normalizeRole(rawRole);
            const displayRole = roleLabel(normalized);
            setUser({
              id: String(parsed.id ?? parsed._id ?? ''),
              nombre: String(parsed.nombre ?? parsed.name ?? ''),
              email: String(parsed.email ?? ''),
              rol: displayRole,
              rolRaw: rawRole,
              desde: String(parsed.desde ?? ''),
            });
          } catch { /* ignore */ }
        }
      }
    };
    loadProfile();
  }, []);

  const handleLogoutAllSessions = async () => {
    setLogoutAllLoading(true);
    try {
      if (typeof window !== 'undefined') localStorage.setItem('manualLogout', 'true');
      const { api } = await import('../../services');
      const result = await api.logoutAll();
      clearAuthData();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('manualLogout');
        await showAlert(result.message || 'Todas tus sesiones han sido cerradas correctamente');
      }
      router.push('/login');
    } catch {
      clearAuthData();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('manualLogout');
        await showAlert('Se cerró la sesión en este dispositivo.');
      }
      router.push('/login');
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const normalizedRole = normalizeRole(user.rolRaw || user.rol);
  const initials = user.nombre
    ? user.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const cards: ProfileCard[] = [
    {
      id: 'info',
      title: 'Información personal',
      subtitle: 'Nombre, email y datos de contacto.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      ),
      section: 'informacion-personal',
    },
    {
      id: 'cuenta',
      title: 'Datos de tu cuenta',
      subtitle: `Rol: ${roleLabel(normalizedRole)}. ${user.desde ? `Cliente desde ${user.desde}.` : ''}`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      section: 'datos-cuenta',
    },
    {
      id: 'seguridad',
      title: 'Seguridad',
      subtitle: 'Modifica tu contraseña y mantén tu cuenta segura.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      href: '/forgot-password',
      alert: true,
    },
    {
      id: 'tarjetas',
      title: 'Tarjetas',
      subtitle: 'Métodos de pago guardados para tus compras.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M5 7h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zm2 8h3" />
        </svg>
      ),
      href: '/cliente/tarjetas',
    },
    {
      id: 'direcciones',
      title: 'Direcciones',
      subtitle: 'Direcciones guardadas para tus envíos.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11zm0-9a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      ),
      href: '/cliente/direcciones',
    },
    {
      id: 'comunicaciones',
      title: 'Comunicaciones',
      subtitle: 'Elige qué tipo de información quieres recibir.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4h16v10H5.5L4 15.5V4zm4 13h8m-6 3h4" />
        </svg>
      ),
      href: '/cliente/comunicaciones',
    },
    {
      id: 'admin',
      title: 'Panel de administración',
      subtitle: 'Gestiona el salón y reportes.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      href: '/admin',
    },
    {
      id: 'operacion',
      title: 'Panel de operación',
      subtitle: 'Agenda, citas y servicios.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      href: '/operacion',
    },
    {
      id: 'promociones',
      title: 'Promociones',
      subtitle: 'Ofertas y descuentos disponibles.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      href: '/cliente/promociones',
    },
  ];

  const visibleCards = cards.filter((c) => {
    if (c.id === 'admin') return normalizedRole === 'admin';
    if (c.id === 'operacion') return ['estilista', 'empleado', 'becario'].includes(normalizedRole);
    return true;
  });

  const informacionPersonalItems: InfoListItem[] = [
    {
      id: 'datos-personales',
      title: 'Datos personales',
      description: user.nombre || '—',
      verified: true,
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: LINK_BLUE }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'datos-fiscales',
      title: 'Datos fiscales',
      description: 'Los datos que usamos para calcular impuestos y emitir la facturación.',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: LINK_BLUE }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'actividad-laboral',
      title: 'Actividad laboral',
      description: 'Acerca de tu ocupación principal.',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: LINK_BLUE }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'vinculos-cercanos',
      title: 'Vínculos Cercanos',
      description: 'Personas que están relacionadas contigo y con tu cuenta.',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: LINK_BLUE }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  const sidebarItems: { id: SidebarItem; label: string; href?: string; icon: React.ReactNode }[] = [
    { id: 'perfil', label: 'Mi perfil', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    { id: 'pedidos', label: 'Mis pedidos', href: '/cliente/tienda-online/mis-pedidos', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> },
    { id: 'tienda', label: 'Tienda', href: '/cliente/tienda-online', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { id: 'seguridad', label: 'Seguridad', href: '/forgot-password', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
  ];

  return (
    <div className="flex min-h-[60vh]">
      {/* Sidebar */}
      <aside
        className={`shrink-0 border-r transition-all duration-300 ${
          sidebarOpen ? 'w-60' : 'w-16'
        } bg-[var(--fondos-suaves)] border-[var(--tarjetas-paneles)]`}
      >
        <div className="sticky top-36 p-4">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:opacity-80 text-[var(--menu-texto-principal)]"
              aria-label={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {sidebarOpen && (
              <h2 className="text-lg font-bold text-[var(--menu-texto-principal)]">
                Mi cuenta
              </h2>
            )}
          </div>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = item.id === 'perfil';
              const content = (
                <>
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                  {sidebarOpen && <span>{item.label}</span>}
                  {item.href && sidebarOpen && (
                    <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </>
              );
              return item.href ? (
                <a
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive ? '' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--hover)' : 'transparent',
                    color: isActive ? 'var(--texto-fondo-oscuro)' : 'var(--menu-texto-principal)',
                  }}
                >
                  {content}
                </a>
              ) : (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg`}
                  style={{
                    backgroundColor: isActive ? 'var(--hover)' : 'transparent',
                    color: isActive ? 'var(--texto-fondo-oscuro)' : 'var(--menu-texto-principal)',
                  }}
                >
                  {content}
                </div>
              );
            })}
          </nav>
          {sidebarOpen && (
            <div className="mt-6 pt-4 border-t border-[var(--tarjetas-paneles)]">
              <button
                onClick={handleLogoutAllSessions}
                disabled={logoutAllLoading}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:opacity-90 transition-colors text-[var(--danger)]"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {logoutAllLoading ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 bg-[var(--fondo-general)]">
        {/* Cabecera usuario */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 bg-[var(--tarjetas-paneles)] text-[var(--texto-fondo-oscuro)]"
            >
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1 text-[var(--menu-texto-principal)]">
                {user.nombre || '—'}
              </h1>
              <p className="text-sm text-[var(--encabezados-alterno)]">
                {user.email || '—'}
              </p>
            </div>
          </div>

          {/* Banner de contraseña */}
          {!dismissBanner && (
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-lg border border-[var(--fondos-suaves)] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              style={{ backgroundColor: 'var(--fondos-suaves)' }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-[var(--tarjetas-paneles)]"
                >
                  <svg className="w-6 h-6 text-[var(--texto-fondo-oscuro)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold mb-0.5 text-[var(--menu-texto-principal)]">
                    Modifica tu contraseña y mantén tu cuenta segura
                  </h3>
                  <p className="text-sm text-[var(--encabezados-alterno)]">
                    Te recomendamos cambiar tu contraseña periódicamente.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() => router.push('/forgot-password')}
                >
                  Modificar
                </Button>
                <button
                  onClick={() => setDismissBanner(true)}
                  className="p-2 rounded hover:opacity-80 text-[var(--encabezados-alterno)]"
                  aria-label="Cerrar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sub-vista: Administra tu información */}
        {activeSection === 'informacion-personal' && (
          <div className="mb-8">
            <button
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 mb-6 text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: LINK_BLUE }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
            <h2 className="text-2xl font-bold mb-6 text-[var(--menu-texto-principal)]">
              Administra tu información
            </h2>
            <div className="rounded-lg border border-[var(--fondos-suaves)] overflow-hidden bg-[var(--tarjetas-paneles)]">
              {informacionPersonalItems.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-[var(--fondos-suaves)] transition-colors border-b border-[var(--fondos-suaves)] last:border-b-0"
                >
                  <div className="relative shrink-0">
                    {item.icon}
                    {item.verified && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--success)' }}
                      >
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--menu-texto-principal)]">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-[var(--encabezados-alterno)] truncate">{item.description}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 shrink-0 text-[var(--encabezados-alterno)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sub-vista: Datos de tu cuenta */}
        {activeSection === 'datos-cuenta' && (
          <div className="mb-8">
            <button
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 mb-6 text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: LINK_BLUE }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
            <h2 className="text-2xl font-bold mb-6 text-[var(--menu-texto-principal)]">
              Datos de tu cuenta
            </h2>

            <div className="space-y-4">
              {/* Email */}
              <div
                className="rounded-lg border px-5 py-4"
                style={{ backgroundColor: 'var(--tarjetas-paneles)', borderColor: 'var(--fondos-suaves)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--success)' }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center border border-[var(--success)] bg-transparent">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    Validado
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-sm text-[var(--encabezados-alterno)]">E-mail</p>
                  <p className="text-base font-semibold text-[var(--menu-texto-principal)] break-all">
                    {user.email || '—'}
                  </p>
                </div>
                <hr className="border-t border-[var(--fondos-suaves)] mb-3" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/forgot-password')}
                  className="px-4 py-1.5 text-sm font-medium"
                  style={{
                    borderColor: LINK_BLUE,
                    color: LINK_BLUE,
                    backgroundColor: 'transparent',
                  }}
                >
                  Modificar
                </Button>
              </div>

              {/* Teléfono */}
              <div
                className="rounded-lg border px-5 py-4"
                style={{ backgroundColor: 'var(--tarjetas-paneles)', borderColor: 'var(--fondos-suaves)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--success)' }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center border border-[var(--success)] bg-transparent">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    Validado
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-sm text-[var(--encabezados-alterno)]">Teléfono</p>
                  <p className="text-base font-semibold text-[var(--menu-texto-principal)]">
                    {/* Cuando tengas teléfono real en el perfil, reemplaza este placeholder */}
                    — 
                  </p>
                </div>
                <hr className="border-t border-[var(--fondos-suaves)] mb-3" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/cliente/mi-perfil')}
                  className="px-4 py-1.5 text-sm font-medium"
                  style={{
                    borderColor: LINK_BLUE,
                    color: LINK_BLUE,
                    backgroundColor: 'transparent',
                  }}
                >
                  Modificar
                </Button>
              </div>

              {/* Nombre de usuario */}
              <div
                className="rounded-lg border px-5 py-4"
                style={{ backgroundColor: 'var(--tarjetas-paneles)', borderColor: 'var(--fondos-suaves)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--success)' }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center border border-[var(--success)] bg-transparent">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    Validado
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-sm text-[var(--encabezados-alterno)]">Nombre de usuario</p>
                  <p className="text-base font-semibold text-[var(--menu-texto-principal)]">
                    {user.id || '—'}
                  </p>
                </div>
                <hr className="border-t border-[var(--fondos-suaves)] mb-3" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/cliente/mi-perfil')}
                  className="px-4 py-1.5 text-sm font-medium"
                  style={{
                    borderColor: LINK_BLUE,
                    color: LINK_BLUE,
                    backgroundColor: 'transparent',
                  }}
                >
                  Modificar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Grid de tarjetas */}
        {!activeSection && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleCards.map((card) => {
            const cardContent = (
              <button
                type="button"
                className={`p-6 rounded-lg h-full transition-all border bg-[var(--tarjetas-paneles)] border-[var(--fondos-suaves)] text-left w-full ${
                  (card.href || card.section) ? 'cursor-pointer hover:shadow-md hover:border-[var(--hover)]' : ''
                }`}
                onClick={
                  card.href
                    ? () => router.push(card.href!)
                    : card.section
                    ? () => setActiveSection(card.section!)
                    : undefined
                }
              >
                <div className="relative">
                  {card.alert && (
                    <span
                      className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[var(--warning)]"
                      title="Pendiente"
                    />
                  )}
                  <div className="mb-4 text-[var(--menu-texto-principal)]">
                    {card.icon}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2 text-[var(--menu-texto-principal)]">
                  {card.title}
                </h3>
                <p className="text-sm text-[var(--encabezados-alterno)]">
                  {card.subtitle}
                </p>
                {(card.href || card.section) && (
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium" style={{ color: LINK_BLUE }}>
                    Ver más
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
            return <div key={card.id}>{cardContent}</div>;
          })}
        </div>
        )}
      </main>
    </div>
  );
}
