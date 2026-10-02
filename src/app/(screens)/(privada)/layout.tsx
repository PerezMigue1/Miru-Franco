import type { ReactNode } from 'react';
import SesionClienteGuard from '../../components/layouts/SesionClienteGuard';

/**
 * /cliente/* y /perfil: las rutas que exigen sesión mandan al login con returnUrl
 * (lista en utils/rutasConSesion.ts). /operacion pasa de largo: lo cubre OperacionLayout.
 */
export default function PrivadaLayout({ children }: { children: ReactNode }) {
  return <SesionClienteGuard>{children}</SesionClienteGuard>;
}
