'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '../../utils/security';
import { api } from '../../services/auth';
import { isAdminRol, getRolFromUser, rutaPorRol } from '../../utils/adminAuth';

/**
 * Guard de acceso para TODO /admin/*. NO renderiza UI (ni sidebar ni ningún
 * elemento visual): solo verifica que el usuario sea admin y deja pasar {children}
 * tal cual. Cubre también las páginas que NO montan AdminLayout (base-datos/*,
 * inventario/*), que de otro modo quedarían sin verificación de rol.
 *
 * No importa ni renderiza AdminLayout → las 41 páginas que ya lo montan siguen
 * mostrando su sidebar sin doble-wrap. La decisión de destino (staff→/operacion,
 * cliente→/403) vive en el helper compartido rutaPorRol().
 */
export default function AdminAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [permitido, setPermitido] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token || token.trim() === '') {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname || '/admin')}`);
      return;
    }

    const permitir = () => {
      setPermitido(true);
      setVerificando(false);
    };

    // Fast-path: si el rol admin ya está en localStorage, NO se llama al backend.
    const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userJson) {
      try {
        const rol = getRolFromUser(JSON.parse(userJson) as Record<string, unknown>);
        if (isAdminRol(rol)) {
          permitir();
          return;
        }
      } catch {
        // JSON inválido: se confirma con el backend abajo.
      }
    }

    // Fallback: confirmar el rol con el backend ANTES de permitir/redirigir.
    api
      .getProfile()
      .then((res) => {
        if (!res.success) {
          router.replace('/403');
          return;
        }
        const rol = res.data?.rol ?? getRolFromUser(res.data as unknown as Record<string, unknown>);
        if (isAdminRol(rol)) {
          permitir();
          return;
        }
        // Tiene rol pero NO es admin → destino según rol (staff→/operacion, cliente→/403).
        router.replace(rutaPorRol(rol));
      })
      .catch(() => {
        router.replace(`/login?returnUrl=${encodeURIComponent(pathname || '/admin')}`);
      });
  }, [pathname, router]);

  if (verificando || !permitido) {
    // Loader mínimo mientras verifica el acceso (o mientras se ejecuta la redirección).
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--encabezados-alterno)',
        }}
      >
        Verificando acceso…
      </div>
    );
  }

  return <>{children}</>;
}
