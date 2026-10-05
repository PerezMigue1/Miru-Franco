'use client';

import { useEffect, useRef } from 'react';

/**
 * Inclinación 3D con brillo dorado que sigue al puntero (tarjetas de catálogo, ver DESIGN.md).
 * El elemento necesita la clase `.mf-inclinable` y un hijo `<span ref={brilloRef}
 * className="mf-inclinable__brillo" />` (styles/cliente.css).
 *
 * - Resorte simple en rAF, con suavizado por tiempo (igual a 60 o a 120 Hz): el movimiento tiene
 *   inercia en vez de saltar con cada evento del puntero, y se detiene solo cuando se asienta.
 * - Escribe `transform` en la tarjeta y el estilo del brillo en su propio span: nada de variables
 *   CSS en el padre (recalculaban el estilo de todos los hijos en cada frame).
 * - `will-change` solo mientras el puntero está encima; el rect se mide al entrar.
 * - Solo con puntero fino (mouse/trackpad) y sin `prefers-reduced-motion`: en táctil o con
 *   movimiento reducido la tarjeta queda plana y no se registra ningún listener.
 */
export function useInclinacion3D<T extends HTMLElement>(maxGrados = 3) {
  const ref = useRef<T>(null);
  const brilloRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const brillo = brilloRef.current;
    if (!el || typeof window === 'undefined') return;
    const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!punteroFino || reducido) return;

    const objetivo = { rx: 0, ry: 0, gx: 50, gy: 50, brillo: 0 };
    const actual = { ...objetivo };
    let raf = 0;
    let previo = 0;
    let rect: DOMRect | null = null;

    const pintar = (ahora: number) => {
      const dt = previo ? Math.min(64, ahora - previo) : 16.7;
      previo = ahora;
      const k = 1 - Math.pow(1 - 0.16, dt / 16.7);
      let enMovimiento = false;
      for (const clave of Object.keys(objetivo) as (keyof typeof objetivo)[]) {
        const delta = objetivo[clave] - actual[clave];
        actual[clave] += delta * k;
        if (Math.abs(delta) > 0.01) enMovimiento = true;
      }
      const enReposo = !enMovimiento && objetivo.brillo === 0;
      el.style.transform = enReposo
        ? ''
        : `perspective(900px) rotateX(${actual.rx.toFixed(2)}deg) rotateY(${actual.ry.toFixed(2)}deg)`;
      if (enReposo) el.style.willChange = '';
      if (brillo) {
        brillo.style.opacity = actual.brillo.toFixed(3);
        brillo.style.background = `radial-gradient(420px circle at ${actual.gx.toFixed(1)}% ${actual.gy.toFixed(1)}%, var(--destello-oro), transparent 45%)`;
      }
      if (enMovimiento) raf = requestAnimationFrame(pintar);
      else {
        raf = 0;
        previo = 0;
      }
    };
    const animar = () => {
      if (!raf) raf = requestAnimationFrame(pintar);
    };

    const alEntrar = () => {
      rect = el.getBoundingClientRect();
      el.style.willChange = 'transform';
    };
    const alMover = (e: PointerEvent) => {
      const r = rect ?? (rect = el.getBoundingClientRect());
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
      rect = null;
      objetivo.rx = 0;
      objetivo.ry = 0;
      objetivo.brillo = 0;
      animar();
    };

    el.addEventListener('pointerenter', alEntrar);
    el.addEventListener('pointermove', alMover);
    el.addEventListener('pointerleave', alSalir);
    return () => {
      el.removeEventListener('pointerenter', alEntrar);
      el.removeEventListener('pointermove', alMover);
      el.removeEventListener('pointerleave', alSalir);
      cancelAnimationFrame(raf);
      el.style.transform = '';
      el.style.willChange = '';
    };
  }, [maxGrados]);

  return { ref, brilloRef };
}
