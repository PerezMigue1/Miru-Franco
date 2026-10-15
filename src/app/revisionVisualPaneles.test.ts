// Revisión visual final de los paneles (H1 a H13): comprobaciones de fuente, porque vitest corre sin DOM.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf8');

describe('Revisión visual final de los paneles', () => {
  it('H1: el marco de las tablas es el ancestro posicionado (un sr-only absoluto no ensancha la página)', () => {
    const css = leer('styles/sistema.css');
    const regla = css.match(/\.mf-tabla-marco \{[^}]*\}/)?.[0] ?? '';
    expect(regla).toContain('position: relative;');
  });

  it('H2: los diálogos abiertos desde "Más" saltan de línea (no heredan whitespace-nowrap de la celda)', () => {
    const menu = leer('(screens)/(privada)/operacion/_lib/MenuMasAcciones.tsx');
    expect(menu).toMatch(/popover="manual"[\s\S]{0,200}className="[^"]*\bwhitespace-normal\b/);
  });

  it('H3 y H4: en ventas cortadas, la explicación salta de línea y "Anular venta cortada" es outline-danger', () => {
    for (const ruta of ['(screens)/(privada)/operacion/punto-de-venta/page.tsx', '(screens)/admin/venta-local/page.tsx']) {
      const fuente = leer(ruta);
      expect(fuente, ruta).toMatch(/<p className="[^"]*\bwhitespace-normal\b[^"]*"[^>]*>\s*\{textoDevolucionFueraDeCaja\(/);
      expect(fuente, ruta).toMatch(/<Button size="sm" variant="outline-danger" onClick=\{\(\) => openAnular\w*\([^)]*\)\}>Anular venta cortada<\/Button>/);
    }
  });

  it('H5: el menú se desplaza al ítem activo también cuando aparecen los ítems con permiso', () => {
    const shell = leer('components/layouts/PanelShell.tsx');
    expect(shell).toMatch(/mostrarItemActivo\(menuRef\.current\);\s*\}, \[pathname, abierto, colapsado, totalItems\]\);/);
    expect(shell).toContain('const totalItems = grupos.reduce((n, g) => n + g.items.length, 0);');
  });

  it('H10: el layout admin usa la regla de ítem activo con las pantallas hijas', () => {
    expect(leer('components/layouts/AdminLayout.tsx')).toContain('esActivo={(href) => esItemActivoAdmin(pathname, href)}');
  });

  it('H12: "Agregar observación" en minúscula', () => {
    const componente = leer('(screens)/admin/clientes-crm/[id]/ObservacionesCliente.tsx');
    expect(componente).toContain('Agregar observación');
    expect(componente).not.toContain('Agregar Observación');
  });

  it('H13: la columna de acciones de Solicitudes ARCO tiene encabezado (para lector de pantalla)', () => {
    const arco = leer('(screens)/admin/solicitudes-arco/page.tsx');
    expect(arco).toContain(`'Vence', <span key="acciones" className="sr-only">Acciones</span>]`);
  });
});

describe('Revisión visual final de los paneles (2)', () => {
  it('H6: "+ Agregar empleado" abre el modal de inmediato y el select muestra carga mientras llegan los usuarios', () => {
    const fuente = leer('(screens)/admin/gestion-personal/page.tsx');
    const abrir = fuente.slice(fuente.indexOf('const openCrear'), fuente.indexOf('const openEditar'));
    expect(abrir.indexOf('setIsModalCrearOpen(true)')).toBeGreaterThan(-1);
    expect(abrir.indexOf('setIsModalCrearOpen(true)')).toBeLessThan(abrir.indexOf('await cargarUsuariosPersonal()'));
    expect(abrir).toContain('setCargandoUsuarios(true)');
    expect(fuente).toMatch(/\{cargandoUsuarios \? \([\s\S]{0,400}mf-skeleton[\s\S]{0,200}\) : \(\s*<Select\s+label="Usuario \*"/);
  });
});

describe('H7: objetivos de 44 px en móvil', () => {
  const casos: [string, RegExp][] = [
    ['components/layouts/PanelShell.tsx', /<Link href=\{inicioHref\} className="[^"]*\bmin-h-11\b/],
    ['components/clientes/PanelSegmentacionClientes.tsx', /href=\{`\$\{rutaBasePerfil\}\/\$\{cliente\.clienteId\}`\}\s*className="[^"]*\bmin-h-11\b/],
    ['(screens)/admin/servicios/page.tsx', /<label className="[^"]*\bmin-h-11\b[^"]*"[^>]*>\s*<input\s+type="checkbox"\s+checked=\{mostrarInactivos\}/],
    ['components/admin/NuevaSolicitudDevolucion.tsx', /<label className="[^"]*\bmin-h-11\b[^"]*">\s*<input type="checkbox" checked=\{sellado\}/],
    ['(screens)/admin/base-datos/backup/page.tsx', /<label htmlFor="auto-backup" className="[^"]*\bmin-h-11\b/],
    ['(screens)/(privada)/operacion/punto-de-venta/page.tsx', /<Button size="sm" variant="outline" className="!min-h-11 min-w-11" onClick=\{refrescarPorCobrar\}/],
  ];
  for (const [ruta, patron] of casos) {
    it(ruta, () => expect(leer(ruta)).toMatch(patron));
  }

  it('casillas de servicios ([id] y nuevo) y "Empleado activo": su etiqueta mide 44 px', () => {
    for (const ruta of ['(screens)/admin/servicios/[id]/page.tsx', '(screens)/admin/servicios/nuevo/page.tsx', '(screens)/admin/gestion-personal/page.tsx']) {
      const etiquetas = leer(ruta).match(/<label className="[^"]*"[^>]*>\s*<input type="checkbox"/g) ?? [];
      expect(etiquetas.length, ruta).toBeGreaterThan(0);
      for (const e of etiquetas) expect(e, ruta).toContain('min-h-11');
    }
  });

  it('backup: casillas de tablas y campos de hora a 44 px', () => {
    const backup = leer('(screens)/admin/base-datos/backup/page.tsx');
    expect(backup).not.toContain('className="w-16 p-2 rounded border text-center"');
    expect(backup.match(/className="w-16 min-h-11 p-2 rounded border text-center"/g)).toHaveLength(3);
    expect(backup).toContain('className="flex min-h-11 items-center gap-2 text-sm p-2 rounded border cursor-pointer"');
  });
});

describe('H8: sin guiones largos visibles en los paneles', () => {
  /** Líneas con un guion largo (U+2014) que no son comentarios. */
  const conGuionLargo = (fuente: string) =>
    fuente
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, '').replace(/\{?\/\*.*?\*\/\}?/g, ''))
      .filter((l) => !/^\s*\*/.test(l) && l.includes('\u2014'));
  const archivos = [
    '(screens)/admin/page.tsx',
    'components/pedidos/PanelPedidosOnline.tsx',
    'components/personal/PanelSolicitudes.tsx',
    '(screens)/admin/compras-proveedores/page.tsx',
    '(screens)/admin/venta-online/page.tsx',
    '(screens)/admin/gestion-personal/page.tsx',
    '(screens)/(privada)/operacion/cola-atencion/page.tsx',
    '(screens)/(privada)/operacion/clientes-crm/[id]/page.tsx',
    '(screens)/admin/clientes-crm/[id]/page.tsx',
  ];
  for (const ruta of archivos) {
    it(ruta, () => expect(conGuionLargo(leer(ruta))).toEqual([]));
  }

  it('base de datos: las opciones de "carga las tablas" sin guiones largos', () => {
    const bd = leer('(screens)/admin/base-datos/page.tsx');
    expect(bd).not.toContain('\u2014 Carga las tablas');
    expect(bd).toContain("label: 'Carga las tablas de la BD'");
    expect(bd).toContain("label: 'Carga las tablas primero'");
  });
});
