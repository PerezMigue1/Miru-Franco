'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from './ui/Breadcrumb';
import { getBreadcrumbsForPath, getMigasPortal } from '../utils/breadcrumbs';

/** Pantallas con migas vistas en este documento: se reinicia en cada carga completa y persiste en la navegación interna. */
const rutasVistas: string[] = [];

/**
 * ¿La entrada anterior del historial es una página de este sitio? Con la Navigation API,
 * `canGoBack` solo cuenta entradas del mismo origen. Sin ella: hubo otra pantalla en este documento,
 * el documento cargó en otra ruta y llegó aquí sin recargar, o se llegó con una carga completa
 * desde el sitio en la misma pestaña.
 */
function vieneDelSitio(pathname: string): boolean {
  const navegacion = (window as Window & { navigation?: { canGoBack?: boolean } }).navigation;
  if (typeof navegacion?.canGoBack === 'boolean') return navegacion.canGoBack;
  if (rutasVistas.some((r) => r !== pathname)) return true;
  const carga = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (carga && new URL(carga.name).pathname !== pathname) return true;
  try {
    return new URL(document.referrer).origin === location.origin && history.length > 1;
  } catch {
    return false;
  }
}

/**
 * Migas de pan de todas las pantallas. En el portal salen del mapa RUTAS_PORTAL (ubicación real de la
 * página, no las carpetas de la URL) y las pantallas globales del usuario llevan "Volver": regresa a
 * la pantalla anterior del sitio o, si se entró directo o desde fuera, va a /home.
 */
export default function GlobalBreadcrumb({ actual }: { actual?: string }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const portal = getMigasPortal(pathname, actual);
  const items = portal?.items ?? getBreadcrumbsForPath(pathname);

  useEffect(() => {
    if (pathname && rutasVistas[rutasVistas.length - 1] !== pathname) rutasVistas.push(pathname);
  }, [pathname]);

  if (!items.length) return null;

  const volver = () => {
    if (vieneDelSitio(pathname)) router.back();
    else router.push('/home');
  };

  return (
    <div className="mb-2 flex w-full shrink-0 flex-wrap items-center gap-x-2 py-0.5">
      {portal?.global && (
        <>
          <button
            type="button"
            onClick={volver}
            className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-[0.8125rem] font-semibold underline-offset-4 hover:underline"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            <ArrowLeft size={16} aria-hidden className="shrink-0" />
            Volver
          </button>
          <span aria-hidden className="h-4 w-px" style={{ backgroundColor: 'var(--mf-linea-fuerte)' }} />
        </>
      )}
      <Breadcrumb items={items} />
    </div>
  );
}
