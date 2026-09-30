'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

/**
 * Línea de la grieta (unidades de caja 0–1): baja en diagonal suave con dientes de papel rasgado.
 * Determinista para que servidor y cliente pinten lo mismo.
 */
const GRIETA: [number, number][] = [
  [0.535, 0], [0.52, 0.05], [0.548, 0.1], [0.515, 0.15], [0.53, 0.2], [0.498, 0.26], [0.524, 0.31],
  [0.492, 0.37], [0.51, 0.42], [0.482, 0.47], [0.506, 0.52], [0.474, 0.58], [0.496, 0.63],
  [0.468, 0.68], [0.49, 0.73], [0.462, 0.79], [0.484, 0.84], [0.458, 0.9], [0.478, 0.95], [0.466, 1],
];

// clip-path poligonal en CSS (no una referencia a <clipPath> SVG): Chrome lo recorta sin capa-máscara
const poligono = (pts: [number, number][]) =>
  `polygon(${pts.map(([x, y]) => `${+(x * 100).toFixed(1)}% ${+(y * 100).toFixed(1)}%`).join(', ')})`;
const IZQUIERDA = poligono([[0, 0], ...GRIETA, [0, 1]]);
const DERECHA = poligono([[1, 0], ...GRIETA, [1, 1]]);
const TRAZO = GRIETA.map(([x, y], i) => `${i ? 'L' : 'M'}${x * 100} ${y * 100}`).join(' ');

/**
 * Intro de la primera visita de la sesión: el monograma MF se parte por una grieta de papel
 * rasgado (clip-path poligonal) que se abre y revela el hero. ≤1.3 s, se salta con clic, Escape o el
 * botón; se omite con prefers-reduced-motion (ver introScript.ts). La coreografía es CSS pura
 * (corre fuera del hilo principal mientras la página termina de cargar y se retira sola aunque el
 * JS no haya llegado); aquí solo se escucha el salto y el final.
 */
export default function IntroGrieta() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = raiz.current;
    const html = document.documentElement;
    if (!el || html.getAttribute('data-intro') !== 'si') return;

    const terminar = () => html.setAttribute('data-intro', 'hecha');
    const alTerminar = (e: AnimationEvent) => e.target === el && e.animationName === 'mf-intro-salida' && terminar();
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && terminar();
    el.addEventListener('animationend', alTerminar);
    el.addEventListener('click', terminar);
    window.addEventListener('keydown', alTeclear);
    return () => {
      el.removeEventListener('animationend', alTerminar);
      el.removeEventListener('click', terminar);
      window.removeEventListener('keydown', alTeclear);
      if (html.getAttribute('data-intro') === 'si') terminar();
    };
  }, []);

  const pieza = (lado: 'izq' | 'der') => (
    <div className={`mf-intro__pieza mf-intro__pieza--${lado}`} style={{ clipPath: lado === 'izq' ? IZQUIERDA : DERECHA }}>
      <span className="mf-intro__monograma">
        <Image src="/logo-miru.jpg" alt="" fill sizes="176px" className="object-contain" loading="eager" fetchPriority="low" />
      </span>
    </div>
  );

  return (
    <div ref={raiz} className="mf-intro" aria-hidden>
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
