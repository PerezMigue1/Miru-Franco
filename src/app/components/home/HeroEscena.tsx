'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import Image from 'next/image';

/**
 * Escena de profundidad del hero de /home (el único momento cinematográfico del sitio, ver
 * DESIGN.md). Un plano con perspectiva real: halo, dos anillos dorados, el monograma y tres
 * destellos viven a distintas profundidades (translateZ). Al mover el puntero el plano gira
 * unos grados y la parallax sale sola de la geometría; al hacer scroll, la escena se aleja
 * más despacio que el texto (scroll-driven animations en CSS, sin JS).
 *
 * - Puntero: resorte en rAF (lerp), solo con puntero fino y sin prefers-reduced-motion.
 * - Scroll: dentro de @supports (animation-timeline) y sin movimiento reducido.
 * - En táctil o con movimiento reducido la escena queda estática y completa.
 */
const capa = (profundidad: number): CSSProperties => ({ ['--z' as string]: `${profundidad}px` });

export default function HeroEscena() {
  const planoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const plano = planoRef.current;
    if (!plano) return;
    const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!punteroFino || reducido) return;

    let objetivoX = 0;
    let objetivoY = 0;
    let x = 0;
    let y = 0;
    let raf = 0;

    const pintar = () => {
      x += (objetivoX - x) * 0.07;
      y += (objetivoY - y) * 0.07;
      plano.style.setProperty('--px', x.toFixed(4));
      plano.style.setProperty('--py', y.toFixed(4));
      raf =
        Math.abs(objetivoX - x) > 0.0008 || Math.abs(objetivoY - y) > 0.0008
          ? requestAnimationFrame(pintar)
          : 0;
    };

    const alMover = (e: PointerEvent) => {
      // Fuera del primer viewport la escena ya no se ve: no gastar frames.
      if (window.scrollY > window.innerHeight) return;
      objetivoX = (e.clientX / window.innerWidth - 0.5) * 2;
      objetivoY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(pintar);
    };

    window.addEventListener('pointermove', alMover, { passive: true });
    return () => {
      window.removeEventListener('pointermove', alMover);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="mf-hero-escena">
      <div ref={planoRef} className="mf-hero-plano">
        <div className="mf-hero-capa mf-hero-halo" style={capa(-80)} aria-hidden />
        <div className="mf-hero-capa mf-hero-anillo mf-hero-anillo--exterior" style={capa(-30)} aria-hidden>
          <span className="mf-hero-orbita" />
        </div>
        <div className="mf-hero-capa mf-hero-anillo mf-hero-anillo--interior" style={capa(10)} aria-hidden />
        <div className="mf-hero-capa mf-hero-monograma" style={capa(60)}>
          <Image
            src="/logo-miru.jpg"
            alt="Mirú Franco"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 70vw, 34rem"
            priority
            fetchPriority="high"
            quality={70}
          />
        </div>
        {[
          { top: '14%', left: '80%', z: 110, s: 14 },
          { top: '74%', left: '12%', z: 90, s: 10 },
          { top: '86%', left: '72%', z: 140, s: 8 },
        ].map((d) => (
          <svg
            key={`${d.top}-${d.left}`}
            className="mf-hero-capa mf-hero-destello"
            style={{ ...capa(d.z), top: d.top, left: d.left, width: d.s, height: d.s }}
            viewBox="0 0 10 10"
            aria-hidden
          >
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="currentColor" />
          </svg>
        ))}
      </div>
    </div>
  );
}
