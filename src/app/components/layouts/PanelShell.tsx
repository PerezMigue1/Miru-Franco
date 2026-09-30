'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, ExternalLink, Menu, X, type LucideIcon } from 'lucide-react';
import GlobalBreadcrumb from '../GlobalBreadcrumb';
import ThemeToggle from '../ui/ThemeToggle';

export interface PanelNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface PanelNavGrupo {
  titulo?: string;
  items: PanelNavItem[];
}

interface PanelShellProps {
  /** "Administración" | "Operación": etiqueta del panel en la barra. */
  etiqueta: string;
  inicioHref: string;
  /** Grupos ya filtrados por permiso (la decisión de qué se ve sigue en cada layout). */
  grupos: PanelNavGrupo[];
  esActivo: (href: string) => boolean;
  /** Pie del menú lateral (cuenta del usuario), opcional. */
  pie?: (colapsado: boolean) => ReactNode;
  children: ReactNode;
}

/**
 * Cascarón compartido de /admin y /operacion (DESIGN.md, "Cascarón de paneles").
 * Barra fija de 56px, menú lateral fijo en escritorio (colapsable) y cajón en móvil/tablet.
 * Solo presentación: la verificación de sesión, rol y permisos vive en AdminLayout/OperacionLayout.
 */
export default function PanelShell({ etiqueta, inicioHref, grupos, esActivo, pie, children }: PanelShellProps) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [colapsado, setColapsado] = useState(false);
  const [rutaDelCajon, setRutaDelCajon] = useState(pathname);

  // Cierra el cajón al navegar (ajuste de estado en render, sin efecto encadenado)
  if (pathname !== rutaDelCajon) {
    setRutaDelCajon(pathname);
    setAbierto(false);
  }

  // Mientras el cajón está abierto: sin scroll de fondo y Escape lo cierra
  useEffect(() => {
    if (!abierto) return;
    document.body.style.overflow = 'hidden';
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  return (
    <div className="superficie-panel">
      <a href="#contenido-panel" className="mf-saltar">
        Saltar al contenido
      </a>

      <header className="mf-panel-barra">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="mf-panel-icono-btn lg:hidden"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={abierto}
            aria-controls="panel-menu"
          >
            {abierto ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
          <Link href={inicioHref} className="flex min-w-0 items-center gap-2.5 rounded-lg">
            <span className="relative h-8 w-8 shrink-0">
              <Image src="/logo-miru.jpg" alt="" fill sizes="32px" className="object-contain" priority />
            </span>
            <span
              className="truncate text-base font-bold leading-none sm:text-[1.0625rem]"
              style={{ fontFamily: 'var(--font-family-serif)', color: '#f2f1ed' }}
            >
              Mirú Franco
            </span>
          </Link>
          <span className="mf-panel-etiqueta hidden sm:inline-block">{etiqueta}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <Link
            href="/home"
            className="mf-panel-icono-btn w-auto! gap-2 px-2.5 text-sm font-medium sm:px-3"
            style={{ display: 'inline-flex' }}
            aria-label="Ver sitio web"
          >
            <ExternalLink size={18} aria-hidden />
            <span className="hidden sm:inline">Ver sitio</span>
          </Link>
        </div>
      </header>

      {abierto && (
        <button
          type="button"
          className="mf-panel-velo lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setAbierto(false)}
        />
      )}

      <div className="mf-panel-cuerpo">
        <aside
          id="panel-menu"
          className="mf-panel-lateral"
          data-abierto={abierto ? 'true' : 'false'}
          data-colapsado={colapsado ? 'true' : 'false'}
          aria-label={`Menú de ${etiqueta.toLowerCase()}`}
        >
          <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 py-4">
            {grupos.map((grupo, gi) => (
              <div key={grupo.titulo ?? gi} className="mf-panel-grupo">
                {grupo.titulo && (
                  <p className={`mf-panel-grupo-titulo ${colapsado ? 'lg:sr-only' : ''}`}>{grupo.titulo}</p>
                )}
                <ul className="space-y-0.5">
                  {grupo.items.map((item) => {
                    const activo = esActivo(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`mf-panel-item ${colapsado ? 'lg:justify-center lg:px-0' : ''}`}
                          aria-current={activo ? 'page' : undefined}
                          title={colapsado ? item.label : undefined}
                        >
                          <item.icon size={17} aria-hidden />
                          <span className={`truncate ${colapsado ? 'lg:sr-only' : ''}`}>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {pie && (
            <div className="shrink-0 border-t px-3 py-3" style={{ borderColor: 'var(--mf-linea)' }}>
              {pie(colapsado)}
            </div>
          )}

          <div className="hidden shrink-0 border-t px-3 py-2 lg:block" style={{ borderColor: 'var(--mf-linea)' }}>
            <button
              type="button"
              onClick={() => setColapsado((v) => !v)}
              className={`mf-panel-item w-full ${colapsado ? 'justify-center px-0' : ''}`}
              aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
              title={colapsado ? 'Expandir menú' : undefined}
            >
              {colapsado ? <ChevronsRight size={17} aria-hidden /> : <ChevronsLeft size={17} aria-hidden />}
              <span className={colapsado ? 'sr-only' : ''}>Colapsar menú</span>
            </button>
          </div>
        </aside>

        <main id="contenido-panel" tabIndex={-1} className="mf-panel-contenido focus:outline-none">
          <div className="mf-panel-ancho">
            <GlobalBreadcrumb />
            <div className="pt-1">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
