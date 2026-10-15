import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getBreadcrumbsForPath } from '../../../utils/breadcrumbs';

/**
 * Operaciones > Galería y Admin > Contenido: entrada de menú con su permiso, página protegida y migas. Sin DOM: se
 * revisa el código fuente, como en pendientesOperacion.test.ts.
 */
const raiz = join(__dirname, '..', '..', '..');
const leer = (...partes: string[]) => readFileSync(join(raiz, ...partes), 'utf8');

describe('Operaciones > Galería', () => {
  it('el menú de operación la muestra con galeria:lectura o galeria:gestionar', () => {
    const layout = leer('components', 'layouts', 'OperacionLayout.tsx');
    expect(layout).toMatch(/\{ label: 'Galería', href: '\/operacion\/galeria', icon: \w+, permiso: PERMISOS_GALERIA \}/);
  });

  it('la página exige el mismo permiso y usa el panel de la galería', () => {
    const pagina = leer('(screens)', '(privada)', 'operacion', 'galeria', 'page.tsx');
    expect(pagina).toContain('permisoRequerido={PERMISOS_GALERIA}');
    expect(pagina).toContain('<PanelGaleria');
  });

  it('migas: Inicio / Panel de operación / Galería', () => {
    expect(getBreadcrumbsForPath('/operacion/galeria').map((m) => m.label)).toEqual(['Inicio', 'Panel de operación', 'Galería']);
  });
});

describe('Admin > Contenido', () => {
  it('el menú de admin la muestra con configuracion:editar', () => {
    const layout = leer('components', 'layouts', 'AdminLayout.tsx');
    expect(layout).toMatch(/\{ label: 'Contenido del sitio', href: '\/admin\/contenido', icon: \w+, permiso: 'configuracion:editar' \}/);
  });

  it('migas: Inicio / Panel de administración / Contenido del sitio', () => {
    expect(getBreadcrumbsForPath('/admin/contenido').map((m) => m.label)).toEqual(['Inicio', 'Panel de administración', 'Contenido del sitio']);
  });
});
