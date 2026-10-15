'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type Ref } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cookie } from 'lucide-react';
import Button from '../ui/Button';
import { documentoLegal } from '../../utils/documentosLegales';
import { TEXTO_AVISO_COOKIES, avisoCookiesVisto, marcarAvisoCookiesVisto } from './avisoCookiesEstado';

/** Avisa a los otros AvisoCookies montados (y a esta misma pestaña) que ya se entendió. */
const EVENTO_AVISO_COOKIES = 'mf-aviso-cookies-entendido';

function suscribir(avisar: () => void): () => void {
  window.addEventListener(EVENTO_AVISO_COOKIES, avisar);
  window.addEventListener('storage', avisar);
  return () => {
    window.removeEventListener(EVENTO_AVISO_COOKIES, avisar);
    window.removeEventListener('storage', avisar);
  };
}

export interface PosicionAvisoCookies {
  /** Esquina de abajo desde sm. */
  lado: 'izquierda' | 'derecha';
  /** En móvil va en el flujo, al final de la página, en vez de fijo encima del contenido. */
  enFlujoEnMovil: boolean;
}

/**
 * Dónde va el aviso según la pantalla. En /register el formulario está a la izquierda (el aviso va a la derecha);
 * en /login está a la derecha (el aviso sigue a la izquierda). En las dos, a 375 px el aviso fijo tapaba
 * "Regístrate" o el envío: ahí va en el flujo, al final.
 */
export function posicionAvisoCookies(pathname: string | null | undefined): PosicionAvisoCookies {
  const ruta = pathname ?? '';
  const enAcceso = ruta === '/login' || ruta === '/register';
  return { lado: ruta === '/register' ? 'derecha' : 'izquierda', enFlujoEnMovil: enAcceso };
}

/**
 * Banner informativo de cookies (punto 25): no bloquea nada ni pide decidir. "Entendido" lo oculta y se
 * recuerda en localStorage. En el servidor se da por visto para no pintarlo antes de leer la preferencia.
 */
export default function AvisoCookies() {
  const visto = useSyncExternalStore(suscribir, avisoCookiesVisto, () => true);
  const posicion = posicionAvisoCookies(usePathname());
  const bannerRef = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState(0);

  // Reserva al final de la página el alto del banner: lo último de cada pantalla puede subir por encima de él.
  useEffect(() => {
    const banner = bannerRef.current;
    if (visto || !banner || typeof ResizeObserver === 'undefined') return;
    // Solo si está fijo: en el flujo (móvil en las pantallas de acceso) ya ocupa su lugar.
    const observador = new ResizeObserver(() => setAlto(getComputedStyle(banner).position === 'fixed' ? banner.offsetHeight : 0));
    observador.observe(banner);
    return () => observador.disconnect();
  }, [visto]);

  if (visto) return null;

  return (
    <>
      <div aria-hidden style={{ height: alto ? alto + 24 : 0 }} />
      <BannerCookies
        ref={bannerRef}
        lado={posicion.lado}
        enFlujoEnMovil={posicion.enFlujoEnMovil}
        onEntendido={() => {
          marcarAvisoCookiesVisto();
          window.dispatchEvent(new Event(EVENTO_AVISO_COOKIES));
        }}
      />
    </>
  );
}

interface BannerCookiesProps {
  onEntendido: () => void;
  ref?: Ref<HTMLDivElement>;
  lado?: PosicionAvisoCookies['lado'];
  enFlujoEnMovil?: boolean;
}

/**
 * Presentación del aviso: región con nombre accesible (no diálogo), enlace a la política y "Entendido". En móvil es
 * una sola línea (el enlace dice que solo hay cookies necesarias), para no tapar el contenido de la primera pantalla;
 * desde sm muestra el texto completo, abajo a la izquierda (en /login no tapa el formulario de la derecha) o a la
 * derecha (en /register, cuyo formulario está a la izquierda). Ver posicionAvisoCookies.
 */
export function BannerCookies({ onEntendido, ref, lado = 'izquierda', enFlujoEnMovil = false }: BannerCookiesProps) {
  const fijo = enFlujoEnMovil ? 'max-sm:static max-sm:mx-3 max-sm:mb-3 sm:fixed' : 'fixed inset-x-3 bottom-3';
  const esquina = lado === 'derecha' ? 'sm:right-6' : 'sm:left-6';
  return (
    <div
      ref={ref}
      role="region"
      aria-label="Aviso de cookies"
      className={`mf-dialogo z-40 ${fijo} flex items-center gap-2 px-3 py-1.5 sm:block sm:inset-x-auto ${esquina} sm:bottom-6 sm:w-[26rem] sm:p-5`}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="hidden sm:flex items-start gap-3">
        <Cookie size={20} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--oro-texto)' }} />
        <p className="hidden sm:block text-sm leading-relaxed">{TEXTO_AVISO_COOKIES}</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-x-2 sm:mt-3 sm:flex-wrap sm:justify-end sm:gap-x-3 sm:gap-y-1">
        <Link
          href={documentoLegal('cookies').ruta}
          className="inline-flex min-h-11 min-w-0 items-center rounded-[4px] px-1 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mf-foco)]"
          style={{ color: 'var(--menu-texto-principal)' }}
        >
          <span className="sm:hidden">Usamos solo cookies necesarias<span className="sr-only">. Política de cookies</span></span>
          <span className="hidden sm:inline">Política de cookies</span>
        </Link>
        <Button variant="primary" onClick={onEntendido} className="shrink-0 max-sm:px-4">
          Entendido
        </Button>
      </div>
    </div>
  );
}
