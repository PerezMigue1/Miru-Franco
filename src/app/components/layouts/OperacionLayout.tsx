'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '../../utils/security';
import { normalizarUsuarioAlmacenado } from '../../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../../utils/userStorageSync';
import { api } from '../../services/auth';
import GlobalBreadcrumb from '../GlobalBreadcrumb';

interface OperacionLayoutProps {
  children: ReactNode;
}

const BAR_HEIGHT = 56;

/** Roles que pueden acceder al módulo operación (estilista, empleado, becario). */
const ROLES_OPERACION = ['estilista', 'empleado', 'becario', 'becado', 'auxiliar'];

function isRolOperacion(rol: string | undefined): boolean {
  if (!rol || typeof rol !== 'string') return false;
  const r = rol.toLowerCase().trim();
  return ROLES_OPERACION.some((allowed) => r === allowed || r.includes(allowed));
}

function getRolFromUser(user: Record<string, unknown> | null | undefined): string | undefined {
  if (!user || typeof user !== 'object') return undefined;
  const rol = user.rol ?? user.role ?? user.tipo ?? user.rolNombre;
  return typeof rol === 'string' ? rol : undefined;
}

export default function OperacionLayout({ children }: OperacionLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token || token.trim() === '') {
      const returnUrl = encodeURIComponent(pathname || '/operacion');
      router.replace(`/login?returnUrl=${returnUrl}`);
      return;
    }

    const checkRolAndAllow = (rol: string | undefined) => {
      if (isRolOperacion(rol)) {
        setAccesoPermitido(true);
        setVerificando(false);
        return true;
      }
      return false;
    };

    const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as Record<string, unknown>;
        const rolStorage = getRolFromUser(user);
        if (checkRolAndAllow(rolStorage)) return;
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
        const rolBackend = res.data?.rol ?? getRolFromUser(res.data as unknown as Record<string, unknown>);
        if (checkRolAndAllow(rolBackend)) {
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
          return;
        }
        router.replace('/403');
      })
      .catch(() => {
        router.replace(`/login?returnUrl=${encodeURIComponent(pathname || '/operacion')}`);
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
        <div className="flex items-center gap-4">
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

      <main
        className="flex-1 w-full mx-auto px-4 pt-1.5 pb-6 md:px-6 md:pt-2 md:pb-8"
        style={{ marginTop: BAR_HEIGHT }}
      >
        <GlobalBreadcrumb />
        <div className="pt-1">
          {children}
        </div>
      </main>
    </div>
  );
}
