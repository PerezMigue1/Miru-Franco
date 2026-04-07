/**
 * Mensaje legible a partir de errores del API Nest (ValidationPipe + filtro global).
 */
export function mensajeUsuarioDesdeErrorApi(err: unknown): string {
  if (!(err instanceof Error)) {
    return typeof err === 'string' ? err : 'Ocurrió un error. Intenta de nuevo.';
  }
  const withData = err as Error & {
    data?: { errors?: Record<string, string | string[]>; message?: string; error?: string };
  };
  const d = withData.data;
  if (d?.errors && typeof d.errors === 'object') {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(d.errors)) {
      const msg = Array.isArray(v) ? v.join(', ') : String(v);
      if (msg) parts.push(`${k}: ${msg}`);
    }
    if (parts.length) return parts.join(' | ');
  }
  const m = d?.message ?? d?.error;
  if (typeof m === 'string' && m.trim()) return m.trim();
  return err.message || 'Ocurrió un error. Intenta de nuevo.';
}
