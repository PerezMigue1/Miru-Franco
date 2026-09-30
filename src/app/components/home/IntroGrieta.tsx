'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';

/**
 * Línea de la grieta (unidades de caja 0–1): baja en diagonal suave con dientes de papel rasgado.
 * Determinista para que servidor y cliente pinten lo mismo.
 */
const GRIETA: [number, number][] = [
  [0.535, 0], [0.52, 0.05], [0.548, 0.1], [0.515, 0.15], [0.53, 0.2], [0.498, 0.26], [0.524, 0.31],
  [0.492, 0.37], [0.51, 0.42], [0.482, 0.47], [0.506, 0.52], [0.474, 0.58], [0.496, 0.63],
  [0.468, 0.68], [0.49, 0.73], [0.462, 0.79], [0.484, 0.84], [0.458, 0.9], [0.478, 0.95], [0.466, 1],
];

const puntos = (pts: [number, number][]) => pts.map(([x, y]) => `${x},${y}`).join(' ');
const IZQUIERDA = puntos([[0, 0], ...GRIETA, [0, 1]]);
const DERECHA = puntos([[1, 0], ...GRIETA, [1, 1]]);
const TRAZO = GRIETA.map(([x, y], i) => `${i ? 'L' : 'M'}${x * 100} ${y * 100}`).join(' ');

/**
 * Intro de la primera visita de la sesión: el monograma MF se parte por una grieta de papel
 * rasgado (clipPath SVG) que se abre y revela el hero. ≤1.3 s, se salta con clic, Escape o el
 * botón; se omite con prefers-reduced-motion (ver introScript.ts). Si el JS no llega a correr, un
 * respaldo en CSS la retira sola a los 2.2 s.
 */
export default function IntroGrieta() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = raiz.current;
    const html = document.documentElement;
    if (!el || html.getAttribute('data-intro') !== 'si') return;

    const terminar = () => html.setAttribute('data-intro', 'hecha');
    const tl = gsap.timeline({ onComplete: terminar });
    tl.fromTo(el.querySelector('.mf-intro__trazo'), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.38, ease: 'power2.out' })
      .to(el.querySelector('.mf-intro__pieza--izq'), { xPercent: -62, rotation: -5, duration: 0.85, ease: 'power3.inOut' }, 0.34)
      .to(el.querySelector('.mf-intro__pieza--der'), { xPercent: 62, rotation: 5, duration: 0.85, ease: 'power3.inOut' }, 0.34)
      .to(el.querySelector('.mf-intro__trazo'), { opacity: 0, duration: 0.2 }, 0.4)
      .to(el, { opacity: 0, duration: 0.18, ease: 'power1.out' }, 1.1);

    const saltar = () => tl.progress(1);
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && saltar();
    el.addEventListener('click', saltar);
    window.addEventListener('keydown', alTeclear);
    return () => {
      tl.kill();
      el.removeEventListener('click', saltar);
      window.removeEventListener('keydown', alTeclear);
      if (html.getAttribute('data-intro') === 'si') terminar();
    };
  }, []);

  const pieza = (lado: 'izq' | 'der') => (
    <div className={`mf-intro__pieza mf-intro__pieza--${lado}`} style={{ clipPath: `url(#mf-rasgado-${lado})` }}>
      <span className="mf-intro__monograma">
        <Image src="/logo-miru.jpg" alt="" fill sizes="176px" className="object-contain" priority />
      </span>
    </div>
  );

  return (
    <div ref={raiz} className="mf-intro" aria-hidden>
      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id="mf-rasgado-izq" clipPathUnits="objectBoundingBox">
            <polygon points={IZQUIERDA} />
          </clipPath>
          <clipPath id="mf-rasgado-der" clipPathUnits="objectBoundingBox">
            <polygon points={DERECHA} />
          </clipPath>
        </defs>
      </svg>
      {pieza('izq')}
      {pieza('der')}
      <svg className="mf-intro__grieta" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="mf-intro__trazo" d={TRAZO} pathLength={100} />
      </svg>
      <button type="button" className="mf-intro__saltar" tabIndex={-1}>
        Saltar
      </button>
    </div>
  );
}
