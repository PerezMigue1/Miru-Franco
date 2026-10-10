'use client';

import { useEffect } from 'react';
import './styles/globals.css';
import ErrorInesperado from './components/ErrorInesperado';

/**
 * Error en el layout raíz: reemplaza todo el documento, así que trae su propio <html>, <body> y
 * estilos globales. Texto genérico, nunca error.message.
 */
export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset: () => void;
}) {
  // El layout raíz no corre aquí: aplicar el tema guardado (oscuro por defecto, como el layout).
  useEffect(() => {
    try {
      if (localStorage.getItem('theme') === 'light') document.documentElement.classList.remove('dark');
    } catch {
      // Sin acceso a localStorage: se queda el tema oscuro
    }
  }, []);

  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <title>Algo salió mal | Mirú Franco</title>
        <ErrorInesperado error={error} reintentar={retry ?? reset} />
      </body>
    </html>
  );
}
