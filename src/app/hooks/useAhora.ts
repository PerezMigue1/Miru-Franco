'use client';

import { useEffect, useState } from 'react';

/** Reloj para cuentas regresivas: la fecha actual, actualizada cada `intervaloMs` (30 s por omisión). */
export function useAhora(intervaloMs = 30_000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return ahora;
}
