import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Sin DOM en vitest: se revisa el código del layout (mismo patrón que OperacionLayout.test.ts). */
const layout = readFileSync(join(__dirname, 'AdminLayout.tsx'), 'utf8');
const pagina = (carpeta: string) =>
  readFileSync(join(__dirname, '..', '..', '(screens)', 'admin', carpeta, 'page.tsx'), 'utf8');

describe('Menú de administración: privacidad', () => {
  it('trae "Consentimientos" y "Solicitudes ARCO" con su ruta e ícono en el grupo Privacidad', () => {
    const grupo = layout.slice(layout.indexOf("titulo: 'Privacidad'"), layout.indexOf("titulo: 'Sistema'"));
    expect(grupo).not.toBe('');
    const consentimientos = grupo.match(/\{[^}]*label: 'Consentimientos'[^}]*\}/)?.[0];
    const arco = grupo.match(/\{[^}]*label: 'Solicitudes ARCO'[^}]*\}/)?.[0];
    expect(consentimientos).toContain("href: '/admin/consentimientos'");
    expect(arco).toContain("href: '/admin/solicitudes-arco'");
    expect(consentimientos).toMatch(/icon: [A-Za-z]+/);
    expect(arco).toMatch(/icon: [A-Za-z]+/);
  });

  it('son solo de admin como el resto del panel: sin permiso de módulo que las abra a otro rol', () => {
    for (const label of ['Consentimientos', 'Solicitudes ARCO']) {
      const item = layout.match(new RegExp(`\\{[^}]*label: '${label}'[^}]*\\}`))?.[0];
      expect(item).not.toContain('permiso:');
    }
  });

  it('el menú solo quita grupos que se quedaron sin elementos por permiso: el grupo Privacidad no se filtra aparte', () => {
    expect(layout).toContain('})).filter((grupo) => grupo.items.length > 0);');
    expect(layout).not.toMatch(/grupo\.titulo !== 'Privacidad'/);
  });

  it('las dos pantallas montan AdminLayout (menú y guard del panel)', () => {
    expect(pagina('consentimientos')).toContain('<AdminLayout>');
    expect(pagina('solicitudes-arco')).toContain('<AdminLayout>');
  });
});
