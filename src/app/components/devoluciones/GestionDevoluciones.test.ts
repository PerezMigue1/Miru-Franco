import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Sin DOM en vitest y la tabla solo se pinta con datos: se revisa el código (lo usan admin y operación). */
const fuente = readFileSync(join(__dirname, 'GestionDevoluciones.tsx'), 'utf8');

describe('Devoluciones: corrección visual', () => {
  it('H3 revocación: los dos botones saltan de línea y la etiqueta de la tabla es corta', () => {
    const idx = fuente.indexOf("abrirResolucion(d, 'recibir')");
    const contenedor = fuente.slice(fuente.lastIndexOf('<div', idx), idx);
    expect(contenedor).toContain('flex flex-wrap gap-2');
    const boton = fuente.slice(idx, fuente.indexOf('</Button>', idx));
    expect(boton).toContain('Recibir y reembolsar');
    expect(boton).not.toContain('Recibir producto y reembolsar');
    // El título completo se queda en el modal.
    expect(fuente).toContain("recibir: 'Recibir producto y reembolsar'");
  });

  it('H13 la paginación no se parte en dos líneas en móvil', () => {
    expect(fuente).toMatch(/<span className="[^"]*whitespace-nowrap[^"]*"[^>]*>\s*Página \{pagina\} de \{totalPaginas\}/);
  });

  it('H21 modal de recibir: el texto legal en color de cuerpo y la instrucción en negritas', () => {
    const idx = fuente.indexOf("resolucion.accion === 'recibir' && (");
    const bloque = fuente.slice(idx, fuente.indexOf("resolucion.accion === 'aprobar' && esReembolso"));
    expect(bloque).toContain("color: 'var(--texto-cuerpo)'");
    expect(bloque).not.toContain("color: 'var(--menu-texto-principal)'");
    expect(bloque).not.toContain("color: 'var(--encabezados-alterno)'");
    expect(bloque).toMatch(/<p className="font-semibold">\s*\{resolucion\.devolucion\.pedidoEstado === 'cancelado'/);
  });

  it('H19 el título lleva mayúscula solo al inicio, igual que la miga', () => {
    expect(fuente).toContain('Devoluciones y cambios');
    expect(fuente).not.toContain('Devoluciones y Cambios');
  });
});
