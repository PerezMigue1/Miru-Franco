'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCw, ServerCrash } from 'lucide-react';
import Button from './ui/Button';
import SuperficieCliente from './cliente/SuperficieCliente';

interface ErrorInesperadoProps {
  error: Error & { digest?: string };
  /** Vuelve a pedir y pintar el segmento (Next 16: retry; antes, reset). */
  reintentar: () => void;
}

/**
 * Pantalla para un error no controlado (error.tsx y global-error.tsx). Nunca muestra error.message:
 * puede traer texto técnico del servidor. El detalle va solo a la consola.
 */
export default function ErrorInesperado({ error, reintentar }: ErrorInesperadoProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SuperficieCliente
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: 'var(--fondo-general)' }}
    >
      <main className="mf-entrada w-full max-w-lg text-center">
        <p className="flex justify-center" style={{ color: 'var(--oro-grande)' }}>
          <ServerCrash size={48} strokeWidth={1.5} aria-hidden />
        </p>
        <h1 className="mf-titulo-pagina mt-5" style={{ color: 'var(--menu-texto-principal)' }}>
          Algo salió mal
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed" style={{ color: 'var(--encabezados-alterno)' }}>
          Ocurrió un error inesperado. Intenta de nuevo en unos segundos; si sigue pasando, vuelve al inicio.
        </p>
        {error.digest ? (
          <p className="mf-cifras mt-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Referencia: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={() => reintentar()} className="inline-flex items-center justify-center gap-2">
            <RotateCw size={16} aria-hidden />
            Intentar de nuevo
          </Button>
          <Button size="lg" variant="outline" asChild className="inline-flex items-center justify-center gap-2">
            <Link href="/home">
              Volver al inicio
              <ArrowRight size={16} aria-hidden />
            </Link>
          </Button>
        </div>
      </main>
    </SuperficieCliente>
  );
}
