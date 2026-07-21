'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '../../utils/security';
import { normalizarUsuarioAlmacenado } from '../../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../../utils/userStorageSync';
import { api } from '../../services/auth';
import { STAFF_ROLES, getRolFromUser } from '../../utils/adminAuth';
import { usePermisos, getPermisosFromUser, evaluarPermiso } from '../../utils/permisos';
import GlobalBreadcrumb from '../GlobalBreadcrumb';
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ImagePlus,
  LayoutDashboard,
  Menu,
  Receipt,
  Scissors,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

interface OperacionLayoutProps {
  children: ReactNode;
  /**
   * Clave de `permisos_rol` que exige esta página (defensa en profundidad: bloquea el
   * acceso directo por URL además de que el enlace ya esté oculto en el sidebar).
   * Sin esta prop, el layout se comporta exactamente igual que antes de esta fase.
   */
  permisoRequerido?: string;
}

const BAR_HEIGHT = 56;

/**
 * Navegación del panel de operación — misma lista de destinos del hub.
 * `permiso` es la clave que exige la página protegida; sin `permiso` = enlace neutral,
 * siempre visible a todo el staff con acceso a operación.
 *
 * Agenda/Calendario se deja sin `permiso`: su función principal (ver citas) la cubre
 * cualquier rol de staff (`citas:escritura` o `citas:asignadas`); el selector de
 * especialistas ahí dentro degrada a vacío si el rol no tiene `empleados:lectura`
 * (ver `listarEmpleados` en services/empleados.ts), no rompe la página.
 * Gestión de citas sí exige `citas:escritura`: su función principal es crear/reprogramar/
 * cancelar citas, algo que becario no puede hacer (solo check-in/out vía citas:asignadas,
 * ya cubierto por Ejecución de servicios y Cola de atención) — mostrarle el enlace solo
 * para toparse con un módulo sin nada que hacer no aporta.
 */
const NAV_ITEMS: { label: string; href: string; icon: LucideIcon; permiso?: string }[] = [
  { label: 'Panel de operación', href: '/operacion', icon: LayoutDashboard },
  { label: 'Ejecución de servicios', href: '/operacion/ejecucion-servicios', icon: Scissors },
  { label: 'Cola de atención', href: '/operacion/cola-atencion', icon: Users },
  { label: 'Cobro sin cita', href: '/operacion/cobro-sin-cita', icon: Receipt, permiso: 'ventas:escritura' },
  { label: 'Agenda / Calendario', href: '/operacion/agenda-calendario', icon: CalendarDays },
  { label: 'Gestión de citas', href: '/operacion/gestion-citas', icon: CalendarClock, permiso: 'citas:escritura' },
  { label: 'Seguimiento', href: '/operacion/seguimiento-post-servicio', icon: ClipboardCheck, permiso: 'seguimientos:lectura' },
  { label: 'Subir imágenes', href: '/operacion/subir-imagenes', icon: ImagePlus },
];

function esActivo(pathname: string | null, href: string): boolean {
  if (href === '/operacion') return pathname === '/operacion';
  return !!pathname?.startsWith(href);
}

/** Roles que pueden acceder al módulo operación (staff: estilista, empleado, becario/becado). Match exacto. */
function isRolOperacion(rol: string | undefined): boolean {
  if (!rol || typeof rol !== 'string') return false;
  return STAFF_ROLES.includes(rol.toLowerCase().trim());
}

/**
 * Repuebla `localStorage.user` con `permisos` (y el resto del perfil) sin bloquear el
 * render — el acceso ya se concedió con el rol/permiso cacheado. Una vez guardado,
 * emite el evento que `usePermisos()` escucha para que el sidebar se re-filtre solo.
 */
function refrescarPermisosEnSegundoPlano(userJsonActual: string | null) {
  api.getProfile().then((res) => {
    if (!res.success || !res.data || typeof window === 'undefined') return;
    const current = userJsonActual ? (JSON.parse(userJsonActual) as Record<string, unknown>) : {};
    localStorage.setItem(
      'user',
      JSON.stringify(normalizarUsuarioAlmacenado({ ...current, ...res.data }))
    );
    emitMiruUserStorageUpdated();
  }).catch(() => {
    // Sin conexión o backend caído: el sidebar se queda con lo que había, sin bloquear nada.
  });
}

export default function OperacionLayout({ children, permisoRequerido }: OperacionLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [colapsado, setColapsado] = useState(false);
  const { tienePermiso } = usePermisos();

  useEffect(() => {
    const token = getToken();
    if (!token || token.trim() === '') {
      const returnUrl = encodeURIComponent(pathname || '/operacion');
      router.replace(`/login?returnUrl=${returnUrl}`);
      return;
    }

    // Rol válido para operación Y (si la página lo exige) permiso concedido. Sin
    // `permisoRequerido`, es exactamente el chequeo de rol de siempre.
    const rolYPermisoOk = (rol: string | undefined, permisos: string[]): boolean => {
      if (!isRolOperacion(rol)) return false;
      if (permisoRequerido && !evaluarPermiso(permisos, permisoRequerido)) return false;
      return true;
    };

    const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as Record<string, unknown>;
        const rolStorage = getRolFromUser(user);
        if (rolYPermisoOk(rolStorage, getPermisosFromUser(user))) {
          setAccesoPermitido(true);
          setVerificando(false);
          // Sesión cacheada sin `permisos` (previa a esta fase): refresca en segundo
          // plano para que el sidebar filtrado por permiso no esconda enlaces con
          // datos obsoletos, sin bloquear el acceso ya concedido por rol.
          if (!Array.isArray(user.permisos)) {
            refrescarPermisosEnSegundoPlano(userJson);
          }
          return;
        }
        // Rol o permiso insuficiente según la caché: puede estar desactualizada
        // (ej. `permisos` no existía antes de esta fase) — no bloquear todavía,
        // confirmar contra el backend antes de decidir.
      } catch {
        // seguir a backend
      }
    }

    api
      .getProfile()
      .then((res) => {
        if (!res.success) {
          router.replace('/403');
          return;
        }
        const dataRecord = res.data as unknown as Record<string, unknown> | undefined;
        const rolBackend = res.data?.rol ?? getRolFromUser(dataRecord);
        const permisosBackend = getPermisosFromUser(dataRecord);
        if (rolYPermisoOk(rolBackend, permisosBackend)) {
          if (res.data && typeof window !== 'undefined' && userJson) {
            const current = JSON.parse(userJson) as Record<string, unknown>;
            localStorage.setItem(
              'user',
              JSON.stringify(
                normalizarUsuarioAlmacenado({
                  ...current,
                  ...res.data,
                  rol: rolBackend ?? current.rol,
                  role: rolBackend ?? current.role,
                })
              )
            );
            emitMiruUserStorageUpdated();
          }
          setAccesoPermitido(true);
          setVerificando(false);
          return;
        }
        router.replace('/403');
      })
      .catch(() => {
        router.replace(`/login?returnUrl=${encodeURIComponent(pathname || '/operacion')}`);
      });
  }, [pathname, router, permisoRequerido]);

  // Cierra sidebar al navegar
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Bloquea scroll del body mientras el sidebar está abierto
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (verificando) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--fondo-general)' }}
      >
        <div className="text-center">
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Verificando acceso...
          </p>
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Comprobando sesión y permisos de operación
          </p>
        </div>
      </div>
    );
  }

  if (!accesoPermitido) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 h-14 border-b shadow-sm"
        style={{
          height: BAR_HEIGHT,
          backgroundColor: 'var(--header-footer)',
          color: 'var(--texto-fondo-oscuro)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Botón hamburguesa: solo móvil/tablet, en escritorio el sidebar siempre está visible */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 hover:opacity-80"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú de operación'}
          >
            {sidebarOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>

          <Link
            href="/operacion"
            className="font-semibold text-sm md:text-base hover:opacity-90 transition-opacity"
          >
            Panel de operación
          </Link>
          {pathname && pathname !== '/operacion' && (
            <span className="text-xs opacity-70 hidden sm:inline">
              {pathname.replace('/operacion', '').replace(/^\//, '') || 'Inicio'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/operacion"
            className="text-xs md:text-sm opacity-90 hover:opacity-100 transition-opacity"
          >
            Inicio
          </Link>
          <Link
            href="/home"
            className="text-xs md:text-sm opacity-90 hover:opacity-100 transition-opacity"
          >
            Ver sitio web →
          </Link>
        </div>
      </header>

      {/* Backdrop del sidebar: solo móvil/tablet, en escritorio el sidebar nunca tapa el contenido */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', marginTop: BAR_HEIGHT }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex-1 flex" style={{ marginTop: BAR_HEIGHT }}>
        {/* Sidebar de operación: drawer superpuesto en móvil (<lg), fijo en el flujo en escritorio (lg+) */}
        <aside
          className={`fixed lg:sticky left-0 z-40 lg:z-0 flex flex-col shrink-0 transition-all duration-250 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${colapsado ? 'w-[220px] lg:w-16' : 'w-[220px]'}`}
          style={{
            top: BAR_HEIGHT,
            maxHeight: `calc(100vh - ${BAR_HEIGHT}px)`,
            backgroundColor: 'var(--fondo-general)',
            borderRight: '1px solid var(--fondos-suaves)',
            boxShadow: sidebarOpen ? '4px 0 16px rgba(0,0,0,0.12)' : 'none',
          }}
        >
          <div
            className={`flex items-center gap-2 px-2.5 pt-3 pb-2 border-b ${colapsado ? 'lg:justify-center' : ''}`}
            style={{ borderColor: 'var(--fondos-suaves)' }}
          >
            <Link href="/operacion" className={`flex items-center gap-2 min-w-0 flex-1 ${colapsado ? 'lg:hidden' : ''}`}>
              <div className="relative w-7 h-7 shrink-0 rounded overflow-hidden">
                <Image src="/logo-miru.jpg" alt="Mirú Franco" fill sizes="28px" className="object-contain" priority />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-[11px] font-bold uppercase truncate" style={{ color: 'var(--logo-branding)' }}>
                  Mirú Franco
                </p>
                <p className="text-[8px] uppercase tracking-wide truncate" style={{ color: 'var(--encabezados-alterno)' }}>
                  Operación
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setColapsado((v) => !v)}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-all duration-150 hover:opacity-80"
              style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--menu-texto-principal)' }}
              aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
              title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
            >
              {colapsado ? <ChevronRight size={14} aria-hidden /> : <ChevronLeft size={14} aria-hidden />}
            </button>
          </div>

          <nav className="p-3 flex-1 overflow-y-auto scrollbar-hide">
            {NAV_ITEMS.filter((item) => tienePermiso(item.permiso)).map((item) => {
              const isActive = esActivo(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} title={colapsado ? item.label : undefined}>
                  <div
                    className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 group mb-0.5 ${colapsado ? 'lg:justify-center' : ''}`}
                    style={{
                      backgroundColor: isActive ? 'var(--fondos-suaves)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--hover)' : '3px solid transparent',
                      color: isActive ? 'var(--texto-acento-dark)' : 'var(--menu-texto-principal)',
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fondos-suaves)'; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon
                      size={15}
                      aria-hidden
                      className="shrink-0"
                      style={{ color: isActive ? 'var(--hover)' : 'var(--encabezados-alterno)' }}
                    />
                    <span className={`text-sm truncate ${isActive ? 'font-semibold' : 'font-medium'} ${colapsado ? 'lg:hidden' : ''}`}>
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 layout-page pt-1.5 pb-6 md:pt-2 md:pb-8">
          <GlobalBreadcrumb />
          <div className="pt-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
