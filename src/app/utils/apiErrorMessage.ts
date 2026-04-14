/**
 * Mensaje legible a partir de errores del API Nest (ValidationPipe + filtro global).
 */
export function mensajeUsuarioDesdeErrorApi(err: unknown): string {
  if (!(err instanceof Error)) {
    return typeof err === 'string' ? err : 'Ocurrió un error. Intenta de nuevo.';
  }
  const withData = err as Error & {
    data?: {
      errors?: Record<string, string | string[]>;
      message?: string;
      error?: string;
      code?: string;
      /** Filtro global Nest (ej. paquetes): cuerpo con success/statusCode/errors */
      statusCode?: number;
    };
  };
  const d = withData.data;
  if (d?.errors && typeof d.errors === 'object' && !Array.isArray(d.errors)) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(d.errors)) {
      const msg = Array.isArray(v) ? v.join(', ') : String(v);
      if (msg) parts.push(`${k}: ${msg}`);
    }
    if (parts.length) {
      const hint =
        typeof d.message === 'string' && d.message.trim() && !/^revisa los campos/i.test(d.message.trim())
          ? d.message.trim()
          : '';
      return hint ? `${hint} — ${parts.join(' | ')}` : parts.join(' | ');
    }
  }
  const m = d?.message ?? d?.error;
  if (typeof m === 'string' && m.trim()) {
    const base = m.trim();
    if (d?.code && String(d.code).trim()) return `${base} (${String(d.code).trim()})`;
    return base;
  }
  if (d?.error && typeof d.error === 'string' && d.error.trim() && d.error !== m) {
    return d.error.trim();
  }
  return err.message || 'Ocurrió un error. Intenta de nuevo.';
}
