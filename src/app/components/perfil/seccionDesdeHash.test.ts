import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { seccionDesdeHash } from './seccionDesdeHash';

/** El aviso de respuesta ARCO abre /cliente/mi-perfil#privacidad-solicitudes: el perfil abre "Mis datos y privacidad". */
describe('seccionDesdeHash', () => {
  it('#privacidad y sus bloques abren la sección de privacidad y dicen a qué bloque bajar', () => {
    expect(seccionDesdeHash('#privacidad-solicitudes')).toEqual({ seccion: 'privacidad', ancla: 'privacidad-solicitudes' });
    expect(seccionDesdeHash('#privacidad')).toEqual({ seccion: 'privacidad', ancla: null });
  });

  it('otro hash o vacío no abre nada', () => {
    expect(seccionDesdeHash('')).toBeNull();
    expect(seccionDesdeHash('#otra-cosa')).toBeNull();
    expect(seccionDesdeHash('#privacidad-<script>')).toBeNull();
  });

  it('el perfil lo aplica al cargar y cuando cambia el hash', () => {
    const fuente = readFileSync(join(__dirname, 'UserProfile.tsx'), 'utf8');
    expect(fuente).toContain('seccionDesdeHash(window.location.hash)');
    expect(fuente).toContain("window.addEventListener('hashchange', abrirDesdeHash)");
  });
});
