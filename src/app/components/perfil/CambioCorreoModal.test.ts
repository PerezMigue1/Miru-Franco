// Modal de cambio de correo: campo "Contraseña actual" (contrato del backend).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/auth', () => ({ cuentaTienePassword: vi.fn(() => new Promise(() => undefined)) }));

const { default: CambioCorreoModal } = await import('./CambioCorreoModal');
const fuente = readFileSync(join(__dirname, 'CambioCorreoModal.tsx'), 'utf8');
const pintar = () =>
  renderToStaticMarkup(createElement(CambioCorreoModal, { isOpen: true, onClose: () => undefined, correoActual: 'ana@example.com', onCambiado: () => undefined }));

describe('CambioCorreoModal', () => {
  it('mientras no se sabe si la cuenta tiene contraseña, pide "Contraseña actual" con la ayuda para cuentas de Google', () => {
    const html = pintar();
    expect(html).toMatch(/<label[^>]*>Contraseña actual<\/label>/);
    expect(html).toMatch(/<input[^>]*type="password"[^>]*autoComplete="current-password"|<input[^>]*autoComplete="current-password"[^>]*type="password"/i);
    expect(html).toContain('Si entras solo con Google, déjala vacía.');
  });

  it('pregunta al abrir si la cuenta tiene contraseña y manda la contraseña con la solicitud del código', () => {
    expect(fuente).toContain('cuentaTienePassword()');
    expect(fuente).toMatch(/solicitarCambioCorreo\(correoNuevo, correoActual, passwordActual\)/);
  });

  it('al confirmar avisa que también llega un aviso al correo anterior', () => {
    expect(fuente).toContain("showToast('Listo, tu correo cambió. Te avisamos en tu correo anterior.', 'success')");
  });

  it('el mensaje del backend sobre la contraseña sale junto al campo de contraseña', () => {
    expect(fuente).toMatch(/campoDelErrorCambioCorreo\(e\)/);
    expect(fuente).toMatch(/label="Contraseña actual"[\s\S]{0,900}error=\{errorPassword \?\? undefined\}/);
  });
});
