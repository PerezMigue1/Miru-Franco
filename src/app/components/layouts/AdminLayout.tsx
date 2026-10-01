'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasSession } from '../../utils/security';
import { normalizarUsuarioAlmacenado } from '../../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../../utils/userStorageSync';
import { api } from '../../services/auth';
import { isAdminRol, getRolFromUser, rutaPorRol } from '../../utils/adminAuth';
import { usePermisos } from '../../utils/permisos';
import PanelShell from './PanelShell';
import PanelVerificando from './PanelVerificando';
import {
  BarChart3,
  Bell,
  Database,
  FileText,
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
  type LucideIcon,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

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

/** `permiso` es la clave que exige la página protegida; sin `permiso` = enlace neutral, siempre visible. */
const GRUPOS_MODULOS: { titulo: string; items: { label: string; href: string; icon: LucideIcon; permiso?: string }[] }[] = [
  {
    titulo: 'Catálogo',
    items: [
      { label: 'Servicios', href: '/admin/servicios', icon: Scissors, permiso: 'servicios:lectura' },
      { label: 'Paquetes', href: '/admin/paquetes', icon: Package, permiso: 'servicios:lectura' },
    ],
  },
  {
    titulo: 'Inventario y abasto',
    items: [
      { label: 'Inventario', href: '/admin/inventario', icon: Package, permiso: 'inventario:lectura' },
      { label: 'Proveedores', href: '/admin/proveedores', icon: Truck },
      // Control de caducidad → acceso desde Inventario
      // Compras a proveedores → acceso desde Proveedores
    ],
  },
  {
    titulo: 'Ventas',
    items: [
      { label: 'Venta local', href: '/admin/venta-local', icon: Store },
      { label: 'Venta online', href: '/admin/venta-online', icon: ShoppingCart },
      { label: 'Facturación', href: '/admin/facturacion', icon: Receipt },
      // Pagos, Devoluciones, Entregas y envíos → acceso desde Venta online
    ],
  },
  {
    titulo: 'Clientes',
    items: [
      { label: 'Clientes CRM', href: '/admin/clientes-crm', icon: Users, permiso: 'clientes:lectura' },
      { label: 'Cotizaciones y eventos', href: '/admin/cotizaciones-eventos', icon: FileText },
      { label: 'Devoluciones y cambios', href: '/admin/devoluciones-cambios', icon: RotateCcw },
      { label: 'Quejas y garantías', href: '/admin/quejas-garantias', icon: ShieldCheck },
      { label: 'Notificaciones', href: '/admin/notificaciones', icon: Bell },
    ],
  },
  {
    titulo: 'Finanzas',
    items: [
      { label: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
    ],
  },
  {
    titulo: 'Personal y accesos',
    items: [
      { label: 'Usuarios y roles', href: '/admin/usuarios-roles', icon: ShieldCheck },
      { label: 'Gestión de personal', href: '/admin/gestion-personal', icon: User, permiso: 'empleados:lectura' },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      { label: 'Base de datos', href: '/admin/base-datos', icon: Database },
    ],
  },
];

/**
 * Repuebla `localStorage.user` con `permisos` (y el resto del perfil) sin bloquear el
 * render — el acceso al panel ya se concedió con el rol cacheado. Una vez guardado,
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

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState<PerfilBasico | null>(null);
  const [fotoRota, setFotoRota] = useState(false);
  const { tienePermiso } = usePermisos();

  useEffect(() => {
    if (!hasSession()) {
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
          // Sesión cacheada de antes de que /auth/me devolviera `permisos` (o cualquier
          // otra sesión sin ese campo): refresca en segundo plano para que el sidebar
          // filtrado por permiso deje de esconder módulos usando datos obsoletos.
          if (!Array.isArray(user.permisos)) {
            refrescarPermisosEnSegundoPlano(userJson);
          }
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

  if (verificando) {
    return <PanelVerificando detalle="Comprobando sesión y permisos de administrador" />;
  }

  if (!accesoPermitido) {
    return null;
  }

  const grupos = GRUPOS_MODULOS.map((grupo) => ({
    titulo: grupo.titulo,
    items: grupo.items.filter((item) => tienePermiso(item.permiso)),
  })).filter((grupo) => grupo.items.length > 0);

  return (
    <PanelShell
      etiqueta="Administración"
      inicioHref="/admin"
      grupos={grupos}
      esActivo={(href) => !!pathname?.startsWith(href)}
      pie={(colapsado) =>
        perfilUsuario ? (
          <div className={`flex items-center gap-2.5 ${colapsado ? 'lg:justify-center' : ''}`}>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'var(--botones-principales)', color: '#f2f1ed' }}
              title={colapsado ? perfilUsuario.nombre : undefined}
            >
              {perfilUsuario.foto && !fotoRota ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={perfilUsuario.foto}
                  alt={perfilUsuario.nombre}
                  className="h-full w-full object-cover"
                  onError={() => setFotoRota(true)}
                />
              ) : (
                <span>{iniciales(perfilUsuario.nombre)}</span>
              )}
            </div>
            <div className={`min-w-0 ${colapsado ? 'lg:sr-only' : ''}`}>
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                {perfilUsuario.nombre || 'Administrador'}
              </p>
              <p className="truncate text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                {perfilUsuario.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5" aria-hidden>
            <div className="mf-skeleton h-9 w-9 shrink-0" style={{ borderRadius: 999 }} />
            <div className={`min-w-0 flex-1 space-y-1.5 ${colapsado ? 'lg:hidden' : ''}`}>
              <div className="mf-skeleton h-3 w-3/4" />
              <div className="mf-skeleton h-2.5 w-11/12" />
            </div>
          </div>
        )
      }
    >
      {children}
    </PanelShell>
  );
}
