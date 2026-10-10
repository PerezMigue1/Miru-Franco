'use client';

import ErrorInesperado from './components/ErrorInesperado';

/** Error no controlado dentro del layout raíz: texto genérico, nunca error.message. */
export default function ErrorDeSegmento({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset: () => void;
}) {
  return <ErrorInesperado error={error} reintentar={retry ?? reset} />;
}
