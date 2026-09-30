'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductoHero } from '../../utils/heroProductos';
import HeroVitrinaEstatica from './HeroVitrinaEstatica';

// La escena WebGL (three + react-three-fiber) solo se descarga si el equipo puede con ella.
const HeroProductosEscena = dynamic(() => import('./HeroProductosEscena'), { ssr: false, loading: () => null });

let soporteWebGL: boolean | null = null;

/** ¿Vale la pena la escena 3D? Sin movimiento reducido, con WebGL y sin señales de equipo modesto. */
function puedeMostrar3D(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4) return false;
  if ((nav.deviceMemory ?? 8) < 4) return false;
  if (soporteWebGL === null) {
    try {
      const c = document.createElement('canvas');
      soporteWebGL = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      soporteWebGL = false;
    }
  }
  return soporteWebGL;
}

function suscribirMovimiento(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/**
 * Hero de productos reales: vitrina estática de inmediato (SSR) y, si el equipo lo permite,
 * una escena WebGL con las mismas fotos que responde al puntero/giroscopio y al scroll.
 * La leyenda de abajo nombra el producto destacado o el que está bajo el puntero.
 */
export default function HeroProductos({ productos }: { productos: ProductoHero[] }) {
  const puede3D = useSyncExternalStore(suscribirMovimiento, puedeMostrar3D, () => false);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [destacado, setDestacado] = useState(0);

  const escena3D = puede3D && !fallo;
  const alDestacar = useCallback((i: number) => setDestacado(i), []);
  const alListo = useCallback(() => setListo(true), []);
  const alFallo = useCallback(() => setFallo(true), []);
  const producto = productos[destacado] ?? productos[0]!;
  const total = productos.length;
  const mover = (paso: 1 | -1) => setDestacado((i) => (i + paso + total) % total);

  return (
    <div className="mf-hero-productos">
      <div className="mf-hero-productos__escenario">
        <div
          className="mf-hero-productos__capa"
          data-visible={escena3D && listo ? 'false' : 'true'}
          aria-hidden={escena3D && listo ? true : undefined}
        >
          <HeroVitrinaEstatica productos={productos} destacado={destacado} inerte={escena3D && listo} />
        </div>
        {escena3D && (
          <div className="mf-hero-productos__capa" data-visible={listo ? 'true' : 'false'} aria-hidden>
            <HeroProductosEscena
              productos={productos}
              onListo={alListo}
              onFallo={alFallo}
              destacado={destacado}
              onDestacar={alDestacar}
            />
          </div>
        )}
      </div>

      <div className="mf-hero-productos__leyenda">
        <div key={producto.id} className="mf-hero-productos__leyenda-texto min-w-0" aria-live="polite">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--oro-texto)' }}>
            {producto.marca ?? 'Tienda Mirú Franco'}
          </p>
          <Link
            href={`/cliente/tienda-online/productos/${producto.id}`}
            className="block truncate text-lg font-bold leading-snug underline-offset-4 hover:underline"
            style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
          >
            {producto.nombre}
          </Link>
          <p className="mf-cifras text-sm font-semibold" style={{ color: 'var(--hero-tagline-color)' }}>
            {producto.precio}
          </p>
        </div>
        {total > 1 && (
          <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Productos destacados">
            <button type="button" className="mf-hero-productos__control" onClick={() => mover(-1)} aria-label="Producto anterior">
              <ChevronLeft size={18} aria-hidden />
            </button>
            <span className="mf-cifras min-w-[3.25rem] text-center text-xs font-semibold" style={{ color: 'var(--hero-tagline-color)' }}>
              {destacado + 1} / {total}
            </span>
            <button type="button" className="mf-hero-productos__control" onClick={() => mover(1)} aria-label="Producto siguiente">
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
