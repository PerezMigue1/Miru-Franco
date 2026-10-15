import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Sin DOM en vitest y la tabla solo se pinta con datos: se revisa el código del panel. */
const fuente = readFileSync(join(__dirname, 'PanelPedidosOnline.tsx'), 'utf8');

describe('Pedidos online: corrección visual', () => {
  it('H13 la paginación no se parte en dos líneas en móvil', () => {
    expect(fuente).toMatch(/<span className="[^"]*whitespace-nowrap[^"]*"[^>]*>\s*Página \{pagina\} de \{totalPaginasMostrable\}/);
  });

  it('H14 el placeholder del buscador cabe en su campo (y el nombre accesible sigue completo)', () => {
    expect(fuente).toContain('placeholder="Clienta, email o # de pedido"');
    expect(fuente).toContain('aria-label="Buscar pedidos por clienta, email o número de pedido"');
  });
});
