'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '../../utils/security';
import { normalizarUsuarioAlmacenado } from '../../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../../utils/userStorageSync';
import { api } from '../../services/auth';
import GlobalBreadcrumb from '../GlobalBreadcrumb';

interface AdminLayoutProps {
  children: ReactNode;
}

const ADMIN_BAR_HEIGHT = 56;

/** Valores de rol que el backend puede enviar para administrador. */
const ADMIN_ROL_VALORES = ['admin', 'administrador'];

function isAdminRol(rol: string | undefined): boolean {
  if (!rol || typeof rol !== 'string') return false;
  const r = rol.toLowerCase().trim();
  return ADMIN_ROL_VALORES.some((allowed) => r === allowed || r.includes('admin'));
}

/** Extrae rol de un objeto usuario (backend puede usar rol, role, tipo, etc.). */
function getRolFromUser(user: Record<string, unknown> | null | undefined): string | undefined {
  if (!user || typeof user !== 'object') return undefined;
  const rol = user.rol ?? user.role ?? user.tipo ?? user.rolNombre;
  return typeof rol === 'string' ? rol : undefined;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);

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
        if (checkAdminAndAllow(rolFromStorage)) return;
        // Rol en localStorage no es admin: comprobar con el backend (fuente de verdad)
      } catch {
        // JSON inválido: comprobar con backend
      }
    }

    // Fuente de verdad: obtener perfil del backend (incluye rol actual)
    api
      .getProfile()
      .then((res) => {
        if (!res.success) {
          router.replace('/403');
          return;
        }
        const rolBackend = res.data?.rol ?? getRolFromUser(res.data as unknown as Record<string, unknown>);
        if (checkAdminAndAllow(rolBackend)) {
          // Opcional: actualizar localStorage para no tener que llamar a /me en cada carga
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
        router.replace('/403');
      })
      .catch(() => {
        // 401 u otro error: sesión inválida → login
        router.replace(`/login?returnUrl=${encodeURIComponent(pathname || '/admin')}`);
      });
  }, [pathname, router]);

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
      {/* Barra superior solo para admin: sin header público ni footer */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 h-14 border-b shadow-sm"
        style={{
          height: ADMIN_BAR_HEIGHT,
          backgroundColor: 'var(--header-footer)',
          color: 'var(--texto-fondo-oscuro)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-3">
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

      <main
        className="flex-1 layout-page pt-1.5 pb-6 md:pt-2 md:pb-8"
        style={{ marginTop: ADMIN_BAR_HEIGHT }}
      >
        <GlobalBreadcrumb />
        <div className="pt-1">
          {children}
        </div>
      </main>
    </div>
  );
}
