'use client';

import { ReactNode, useEffect, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasSession } from '../../utils/security';
import { MIRU_USER_STORAGE_UPDATED } from '../../utils/userStorageSync';
import { requiereSesion, rutaLogin } from '../../utils/rutasConSesion';
import PanelVerificando from './PanelVerificando';

function suscribirSesion(avisar: () => void) {
  window.addEventListener('storage', avisar);
  window.addEventListener(MIRU_USER_STORAGE_UPDATED, avisar);
  return () => {
    window.removeEventListener('storage', avisar);
    window.removeEventListener(MIRU_USER_STORAGE_UPDATED, avisar);
  };
}

/**
 * Mismo guard que /admin (admin/layout.tsx) para las rutas de la clienta: sin sesión, al login
 * con returnUrl. Las rutas públicas (ver rutasConSesion.ts) se renderizan tal cual, también en
 * el servidor. En las privadas no se monta la página hasta confirmar la sesión, así que no
 * llega a pedir datos ni a mostrar un 401.
 */
export default function SesionClienteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const protegida = requiereSesion(pathname);
  // null en el servidor y durante la hidratación (no hay localStorage): mismo HTML en ambos lados.
  const haySesion = useSyncExternalStore<boolean | null>(suscribirSesion, hasSession, () => null);

  useEffect(() => {
    if (protegida && haySesion === false) {
      router.replace(rutaLogin(pathname + window.location.search));
    }
  }, [protegida, haySesion, pathname, router]);

  if (!protegida || haySesion) return <>{children}</>;
  return <PanelVerificando detalle="Comprobando tu sesión" />;
}
