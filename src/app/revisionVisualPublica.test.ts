// Revisión visual final de la parte pública (H2 a H8): comprobaciones de fuente, porque vitest corre sin DOM.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf8');

describe('Revisión visual final de la parte pública', () => {
  it('H2: en "Antes de salir" el enlace al Aviso de privacidad se distingue del texto (subrayado y peso)', () => {
    const fuente = leer('components/legal/ReaceptacionDocumentos.tsx');
    expect(fuente).toMatch(/<EnlaceDocumento\s+className="font-semibold underline underline-offset-\[3px\]"\s+href=\{`\$\{documentoLegal\('aviso-privacidad'\)\.ruta\}#derechos-arco`\}>/);
  });

  it('H3: el separador "Perfil capilar" es un subtítulo legible (sin oro en mayúsculas espaciadas)', () => {
    const fuente = leer('components/perfil/PerfilDatosForm.tsx');
    const sep = fuente.match(/<p[^>]*>Perfil capilar<\/p>/)?.[0] ?? '';
    expect(sep).not.toBe('');
    expect(sep).toContain("color: 'var(--menu-texto-principal)'");
    expect(sep).not.toMatch(/uppercase|tracking-/);
  });

  it('H4: el contador de la galería usa texto claro sobre el fondo oscuro en ambos temas', () => {
    const fuente = leer('components/tienda/ProductoGaleriaDetalle.tsx');
    expect(fuente).toMatch(/backgroundColor: 'var\(--negro-55\)',\s*color: 'var\(--texto-fondo-oscuro\)'/);
  });

  it('H6: elementos del panel "Menú de tu cuenta" y "Mi perfil" a 44 px', () => {
    const header = leer('layouts/Header.tsx');
    expect(header).not.toContain('className="w-full text-left px-4 py-2.5 text-sm');
    expect(header).toContain('className="w-full min-h-11 text-left px-4 py-2.5 text-sm');
    expect(header).toMatch(/className="min-h-11 text-sm font-medium hover:underline flex items-center gap-1"[\s\S]{0,250}Mi perfil/);
  });

  it('H7: "Deseo recibir promociones" usa la casilla del sistema (.mf-consentimiento, 44 px)', () => {
    const fuente = leer('components/perfil/PerfilDatosForm.tsx');
    expect(fuente).toMatch(/<div className="md:col-span-2 mf-consentimiento">\s*<label>\s*<input type="checkbox" disabled=\{disabled\} \{\.\.\.register\('recibePromociones'\)\} \/>/);
  });

  it('H8: "Modificar" el correo espera a que cargue el correo actual', () => {
    const fuente = leer('components/perfil/UserProfile.tsx');
    expect(fuente).toContain("disabled={fila.modificar === 'correo' && !user.email}");
  });
});
