import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setToastAPI, showToast, type ToastAPI } from './toast';

/** Aviso en pantalla con acción (p. ej. "Ver" en una notificación nueva): abre la pantalla relacionada. */
describe('showToast con acción', () => {
  const original = globalThis.window;
  afterEach(() => {
    (globalThis as { window?: unknown }).window = original;
  });

  it('pasa la acción al ToastProvider', () => {
    (globalThis as { window?: unknown }).window = {};
    const api = { showAlert: vi.fn(), showConfirm: vi.fn(), showToast: vi.fn() };
    setToastAPI(api as unknown as ToastAPI);
    const accion = { etiqueta: 'Ver', alHacerClic: vi.fn() };
    showToast('Cita agendada: mañana', 'info', 8000, accion);
    expect(api.showToast).toHaveBeenCalledWith('Cita agendada: mañana', 'info', 8000, accion);
  });

  it('el aviso pinta la acción como botón de 44 px que cierra el aviso al pulsarlo', () => {
    const fuente = readFileSync(join(__dirname, '..', 'context', 'ToastContext.tsx'), 'utf8');
    expect(fuente).toMatch(/\{t\.accion && \(\s*<button\s+type="button"/);
    expect(fuente).toMatch(/className="[^"]*\bmin-h-11\b[^"]*"[\s\S]{0,300}\{t\.accion\.etiqueta\}/);
    expect(fuente).toContain('t.accion?.alHacerClic();');
  });
});
