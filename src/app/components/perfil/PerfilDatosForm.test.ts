// "Información personal" de la titular: casilla de datos de salud solo con alergias nuevas y aviso simplificado.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const forzar = vi.hoisted(() => ({ alergias: '' }));
// El perfil guardado aún no llega (perfil null, sin alergias guardadas); se fuerzan las alergias del formulario.
vi.mock('react-hook-form', async (original) => {
  const rhf = await original<typeof import('react-hook-form')>();
  return {
    ...rhf,
    useForm: (opciones: Parameters<typeof rhf.useForm>[0]) =>
      rhf.useForm({ ...opciones, defaultValues: { ...(opciones?.defaultValues as object), alergias: forzar.alergias } }),
  };
});
vi.mock('../../services/auth', () => ({ getMiPerfil: vi.fn(() => new Promise(() => undefined)) }));

const { default: PerfilDatosForm } = await import('./PerfilDatosForm');
const fuente = readFileSync(join(__dirname, 'PerfilDatosForm.tsx'), 'utf8');
const pintar = () => renderToStaticMarkup(createElement(PerfilDatosForm));

afterEach(() => {
  forzar.alergias = '';
});

describe('PerfilDatosForm', () => {
  it('sin alergias nuevas no muestra la casilla de datos de salud', () => {
    expect(pintar()).not.toContain('Autorizo el uso de mis datos de salud');
  });

  it('con alergias distintas de las guardadas muestra la misma casilla del registro, sin marcar', () => {
    forzar.alergias = 'Látex';
    const html = pintar();
    expect(html).toContain('Autorizo el uso de mis datos de salud');
    const casilla = html.match(/<input type="checkbox"[^>]*name="consienteDatosSensibles"[^>]*>/)?.[0] ?? '';
    expect(casilla).not.toBe('');
    expect(casilla).not.toMatch(/\bchecked\b/);
  });

  it('la casilla bloquea el guardado solo si las alergias cambiaron (y explica junto a ella)', () => {
    expect(fuente).toMatch(/register\('consienteDatosSensibles', \{\s*validate: \(v, all\) => errorConsentimientoCambio\(perfil\?\.alergias, all\.alergias, v, 'clienta'\) \?\? true,/);
    expect(fuente).toMatch(/error=\{errors\.consienteDatosSensibles\?\.message\}/);
  });

  it('lleva el aviso de privacidad simplificado junto al botón Guardar', () => {
    const html = pintar();
    expect(html).toContain('usará tus datos para mantener tu perfil y cuidar tus servicios');
    expect(html.indexOf('Guardar cambios')).toBeLessThan(html.indexOf('mantener tu perfil y cuidar tus servicios'));
  });
});
