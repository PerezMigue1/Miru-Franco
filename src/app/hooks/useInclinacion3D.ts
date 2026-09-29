'use client';

import { useEffect, useRef } from 'react';

/**
 * Inclinación 3D con brillo dorado que sigue al puntero (tarjetas de catálogo, ver DESIGN.md).
 * El elemento necesita la clase `.mf-inclinable` (styles/cliente.css).
 *
 * - Resorte simple en rAF (lerp hacia el objetivo): el movimiento tiene inercia en vez de
 *   saltar con cada evento del puntero, y se detiene solo cuando se asienta.
 * - Solo con puntero fino (mouse/trackpad) y sin `prefers-reduced-motion`: en táctil o con
 *   movimiento reducido la tarjeta queda plana y no se registra ningún listener.
 */
export function useInclinacion3D<T extends HTMLElement>(maxGrados = 6) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!punteroFino || reducido) return;

    const objetivo = { rx: 0, ry: 0, gx: 50, gy: 50, brillo: 0 };
    const actual = { ...objetivo };
    let raf = 0;

    const pintar = () => {
      let enMovimiento = false;
      for (const k of Object.keys(objetivo) as (keyof typeof objetivo)[]) {
        const delta = objetivo[k] - actual[k];
        actual[k] += delta * 0.16;
        if (Math.abs(delta) > 0.01) enMovimiento = true;
      }
      el.style.setProperty('--rx', `${actual.rx.toFixed(2)}deg`);
      el.style.setProperty('--ry', `${actual.ry.toFixed(2)}deg`);
      el.style.setProperty('--gx', `${actual.gx.toFixed(1)}%`);
      el.style.setProperty('--gy', `${actual.gy.toFixed(1)}%`);
      el.style.setProperty('--brillo', actual.brillo.toFixed(3));
      raf = enMovimiento ? requestAnimationFrame(pintar) : 0;
    };
    const animar = () => {
      if (!raf) raf = requestAnimationFrame(pintar);
    };

    const alMover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      objetivo.rx = (0.5 - y) * 2 * maxGrados;
      objetivo.ry = (x - 0.5) * 2 * maxGrados;
      objetivo.gx = x * 100;
      objetivo.gy = y * 100;
      objetivo.brillo = 1;
      animar();
    };
    const alSalir = () => {
      objetivo.rx = 0;
      objetivo.ry = 0;
      objetivo.brillo = 0;
      animar();
    };

    el.addEventListener('pointermove', alMover);
    el.addEventListener('pointerleave', alSalir);
    return () => {
      el.removeEventListener('pointermove', alMover);
      el.removeEventListener('pointerleave', alSalir);
      cancelAnimationFrame(raf);
    };
  }, [maxGrados]);

  return ref;
}
