'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// GSAP llega en un chunk aparte cuando la página ya está en calma (o con la primera interacción):
// no compite con la imagen LCP del Goji ni con la hidratación.
const AnimacionFluidos = dynamic(() => import('./AnimacionFluidos'), { ssr: false });
const INTENCIONES = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'scroll', 'keydown'] as const;

/**
 * Única parte cliente del hero de fluidos: monta el animador con el primer ocio del navegador o la
 * primera interacción. El marcado del hero (HeroFluidos) es de servidor y no se hidrata.
 */
export default function ActivadorFluidos({ idSeccion }: { idSeccion: string }) {
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    const iniciar = () => setAnimar(true);
    INTENCIONES.forEach((e) => window.addEventListener(e, iniciar, { once: true, passive: true }));
    // Safari no tiene requestIdleCallback: ahí basta un respiro tras la carga
    const conOcio = typeof window.requestIdleCallback === 'function';
    const ocioso = conOcio ? window.requestIdleCallback(iniciar, { timeout: 2500 }) : window.setTimeout(iniciar, 1200);
    return () => {
      INTENCIONES.forEach((e) => window.removeEventListener(e, iniciar));
      if (conOcio) window.cancelIdleCallback(ocioso);
      else window.clearTimeout(ocioso);
    };
  }, []);

  return animar ? <AnimacionFluidos idSeccion={idSeccion} /> : null;
}
