'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '../../utils/security';
import { normalizarUsuarioAlmacenado } from '../../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../../utils/userStorageSync';
import { api } from '../../services/auth';
import { isAdminRol, getRolFromUser, rutaPorRol } from '../../utils/adminAuth';
import GlobalBreadcrumb from '../GlobalBreadcrumb';
import ThemeToggle from '../ui/ThemeToggle';
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  FileText,
  Megaphone,
  Menu,
  Package,
  Receipt,
  RotateCcw,
  Scissors,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const ADMIN_BAR_HEIGHT = 56;

interface PerfilBasico {
  nombre: string;
  email: string;
  foto?: string | null;
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const GRUPOS_MODULOS: { titulo: string; items: { label: string; href: string; icon: LucideIcon }[] }[] = [
  {
    titulo: 'Ventas e inventario',
    items: [
      { label: 'Inventario', href: '/admin/inventario', icon: Package },
      { label: 'Venta local', href: '/admin/venta-local', icon: Store },
      { label: 'Venta online', href: '/admin/venta-online', icon: ShoppingCart },
      { label: 'Servicios', href: '/admin/servicios', icon: Scissors },
    ],
  },
  {
    titulo: 'Clientes',
    items: [
      { label: 'Clientes CRM', href: '/admin/clientes-crm', icon: Users },
    ],
  },
  {
    titulo: 'Compras y logística',
    items: [
      { label: 'Compras a proveedores', href: '/admin/compras-proveedores', icon: ShoppingCart },
      { label: 'Control de caducidad', href: '/admin/control-caducidad', icon: CalendarDays },
      { label: 'Entregas y envíos', href: '/admin/entregas-envios', icon: Package },
    ],
  },
  {
    titulo: 'Atención al cliente',
    items: [
      { label: 'Devoluciones y cambios', href: '/admin/devoluciones-cambios', icon: RotateCcw },
      { label: 'Quejas y garantías', href: '/admin/quejas-garantias', icon: ShieldCheck },
      { label: 'Cotizaciones y eventos', href: '/admin/cotizaciones-eventos', icon: FileText },
    ],
  },
  {
    titulo: 'Finanzas y reportes',
    items: [
      { label: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
      { label: 'Facturación', href: '/admin/facturacion', icon: Receipt },
      { label: 'Pagos', href: '/admin/pagos', icon: CreditCard },
    ],
  },
  {
    titulo: 'Marketing y personal',
    items: [
      { label: 'Marketing', href: '/admin/marketing', icon: Megaphone },
      { label: 'Gestión de personal', href: '/admin/gestion-personal', icon: User },
    ],
  },
  {
    titulo: 'Configuración',
    items: [
      { label: 'Usuarios y roles', href: '/admin/usuarios-roles', icon: ShieldCheck },
      { label: 'Proveedores', href: '/admin/proveedores', icon: Truck },
      { label: 'Notificaciones', href: '/admin/notificaciones', icon: Bell },
      { label: 'Base de datos', href: '/admin/base-datos', icon: Database },
    ],
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [colapsado, setColapsado] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState<PerfilBasico | null>(null);
  const [fotoRota, setFotoRota] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token || token.trim() === '') {
      const returnUrl = encodeURIComponent(pathname || '/admin');
      router.replace(`/login?returnUrl=${returnUrl}`);
      return;
    }

    const checkAdminAndAllow = (rol: string | undefined) => {
      if (isAdminRol(rol)) {
        setAccesoPermitido(true);
        setVerificando(false);
        return true;
      }
      return false;
    };

    const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    let rolFromStorage: string | undefined;
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as Record<string, unknown>;
        rolFromStorage = getRolFromUser(user);
        if (checkAdminAndAllow(rolFromStorage)) {
          setPerfilUsuario({
            nombre: String(user.nombre ?? ''),
            email: String(user.email ?? ''),
            foto: user.foto ? String(user.foto) : null,
          });
          return;
        }
      } catch {
        // JSON inválido: comprobar con backend
      }
    }

    api
      .getProfile()
      .then((res) => {
        if (!res.success) {
          router.replace('/403');
          return;
        }
        const rolBackend = res.data?.rol ?? getRolFromUser(res.data as unknown as Record<string, unknown>);
        if (checkAdminAndAllow(rolBackend)) {
          if (res.data) {
            setPerfilUsuario({
              nombre: res.data.nombre ?? '',
              email: res.data.email ?? '',
              foto: res.data.foto ?? null,
            });
          }
          if (res.data && typeof window !== 'undefined') {
            const current = userJson ? JSON.parse(userJson) as Record<string, unknown> : {};
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
          return;
        }
        // Tiene rol pero NO es admin → destino según rol (staff→/operacion, cliente→/403)
        router.replace(rutaPorRol(rolBackend));
      })
      .catch(() => {
        router.replace(`/login?returnUrl=${encodeURIComponent(pathname || '/admin')}`);
      });
  }, [pathname, router]);

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
            Comprobando sesión y permisos de administrador
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

      {/* Barra superior */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 h-14 border-b shadow-sm"
        style={{
          height: ADMIN_BAR_HEIGHT,
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
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú de módulos'}
          >
            {sidebarOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>

          <Link
            href="/admin"
            className="font-semibold text-sm md:text-base hover:opacity-90 transition-opacity"
          >
            Panel de administración
          </Link>
          {pathname && pathname !== '/admin' && (
            <span className="text-xs opacity-70 hidden sm:inline">
              {pathname.replace('/admin', '').replace(/^\//, '') || 'Inicio'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div
            className="flex items-center gap-1.5 rounded-lg border px-1 py-0.5"
            style={{ borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.12)' }}
            title="Modo claro u oscuro"
          >
            <span className="hidden sm:inline text-xs opacity-90 pr-0.5" style={{ color: 'var(--texto-fondo-oscuro)' }}>
              Tema
            </span>
            <ThemeToggle />
          </div>
          <Link
            href="/admin"
            className="text-xs md:text-sm opacity-90 hover:opacity-100 transition-opacity"
          >
            Inicio panel
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
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', marginTop: ADMIN_BAR_HEIGHT }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex-1 flex" style={{ marginTop: ADMIN_BAR_HEIGHT }}>
        {/* Sidebar de módulos: drawer superpuesto en móvil (<lg), fijo en el flujo en escritorio (lg+) */}
        <aside
          className={`fixed lg:sticky left-0 z-40 lg:z-0 flex flex-col shrink-0 transition-all duration-250 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${colapsado ? 'w-[232px] lg:w-16' : 'w-[232px]'}`}
          style={{
            top: ADMIN_BAR_HEIGHT,
            maxHeight: `calc(100vh - ${ADMIN_BAR_HEIGHT}px)`,
            backgroundColor: 'var(--fondo-general)',
            borderRight: '1px solid var(--fondos-suaves)',
            boxShadow: sidebarOpen ? '4px 0 16px rgba(0,0,0,0.12)' : 'none',
          }}
        >
          {/* Logo + nombre de la empresa, junto al botón colapsar/expandir (solo escritorio) */}
          <div
            className={`flex items-center gap-2 px-2.5 pt-3 pb-2 border-b ${colapsado ? 'lg:justify-center' : ''}`}
            style={{ borderColor: 'var(--fondos-suaves)' }}
          >
            <Link href="/admin" className={`flex items-center gap-2 min-w-0 flex-1 ${colapsado ? 'lg:hidden' : ''}`}>
              <div className="relative w-7 h-7 shrink-0 rounded overflow-hidden">
                <Image src="/logo-miru.jpg" alt="Mirú Franco" fill sizes="28px" className="object-contain" priority />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-[11px] font-bold uppercase truncate" style={{ color: 'var(--logo-branding)' }}>
                  Mirú Franco
                </p>
                <p className="text-[8px] uppercase tracking-wide truncate" style={{ color: 'var(--encabezados-alterno)' }}>
                  Beauty Salón
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
            {GRUPOS_MODULOS.map((grupo, gi) => (
              <div key={grupo.titulo} className={gi > 0 ? 'mt-4 pt-4 border-t' : ''} style={{ borderColor: 'var(--fondos-suaves)' }}>
                <p
                  className={`text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5 ${colapsado ? 'lg:hidden' : ''}`}
                  style={{ color: 'var(--encabezados-alterno)' }}
                >
                  {grupo.titulo}
                </p>
                {grupo.items.map((item) => {
                  const isActive = pathname?.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} title={colapsado ? item.label : undefined}>
                      <div
                        className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 group ${colapsado ? 'lg:justify-center' : ''}`}
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
              </div>
            ))}
          </nav>

          {/* Cuenta del admin logueado: fija al fondo, fuera del scroll del menú */}
          <div
            className={`shrink-0 flex items-center gap-2.5 p-3 border-t ${colapsado ? 'lg:justify-center' : ''}`}
            style={{ borderColor: 'var(--fondos-suaves)' }}
          >
            {perfilUsuario ? (
              <>
                <div
                  className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold"
                  style={{ backgroundColor: 'var(--hover)', color: 'var(--texto-fondo-oscuro)' }}
                  title={colapsado ? perfilUsuario.nombre : undefined}
                >
                  {perfilUsuario.foto && !fotoRota ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={perfilUsuario.foto}
                      alt={perfilUsuario.nombre}
                      className="w-full h-full object-cover"
                      onError={() => setFotoRota(true)}
                    />
                  ) : (
                    <span>{iniciales(perfilUsuario.nombre)}</span>
                  )}
                </div>
                <div className={`min-w-0 ${colapsado ? 'lg:hidden' : ''}`}>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--menu-texto-principal)' }}>
                    {perfilUsuario.nombre || 'Administrador'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--encabezados-alterno)' }}>
                    {perfilUsuario.email}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: 'var(--fondos-suaves)' }} />
                <div className={`min-w-0 flex-1 space-y-1.5 ${colapsado ? 'lg:hidden' : ''}`}>
                  <div className="h-3 rounded animate-pulse" style={{ backgroundColor: 'var(--fondos-suaves)', width: '70%' }} />
                  <div className="h-2.5 rounded animate-pulse" style={{ backgroundColor: 'var(--fondos-suaves)', width: '90%' }} />
                </div>
              </>
            )}
          </div>
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
