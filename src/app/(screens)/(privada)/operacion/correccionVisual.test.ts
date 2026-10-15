// Corrección visual del panel de operación (revisión a 375 y 1440 px): tamaño de página, columnas,
// títulos que coinciden con su miga, KPI condicionados y clases de diseño que se pueden comprobar.
// Sin DOM: las páginas se pintan con renderToStaticMarkup (los efectos no corren: se ve el estado de
// carga) y lo que solo aparece con datos se revisa en el código fuente.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ComponentType, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sesion = vi.hoisted(() => ({ permisos: [] as string[] }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined, back: () => undefined }),
  useParams: () => ({ id: 'c-1' }),
  usePathname: () => '/operacion',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../../../components/layouts/OperacionLayout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../../utils/permisos', async (original) => {
  const real = await original<typeof import('../../../utils/permisos')>();
  return {
    ...real,
    usePermisos: () => ({
      permisos: sesion.permisos,
      tienePermiso: (clave: string | readonly string[] | undefined | null) => real.evaluarPermiso(sesion.permisos, clave),
    }),
  };
});

const {
  COLUMNAS_TABLA_CITAS,
  TAMANO_PAGINA_CITAS,
  accionesCita,
  fuenteVentasHoy,
  posicionMenu,
  tonoSiHay,
} = await import('./_lib/panelOperacion');
const { default: MenuMasAcciones } = await import('./_lib/MenuMasAcciones');
const { getBreadcrumbsForPath } = await import('../../../utils/breadcrumbs');

// Las páginas se importan al cargar el archivo (la primera transformación es lenta y no debe contar en el tiempo de cada prueba).
const Paginas = {
  inicio: (await import('./page')).default,
  gestionCitas: (await import('./gestion-citas/page')).default,
  ejecucion: (await import('./ejecucion-servicios/page')).default,
  comisiones: (await import('./comisiones/page')).default,
  agenda: (await import('./agenda-calendario/page')).default,
  cola: (await import('./cola-atencion/page')).default,
  cobroSinCita: (await import('./cobro-sin-cita/page')).default,
  seguimiento: (await import('./seguimiento-post-servicio/page')).default,
};

const leer = (...partes: string[]) => readFileSync(join(__dirname, ...partes), 'utf8');
const leerComponente = (...partes: string[]) => readFileSync(join(__dirname, '..', '..', '..', 'components', ...partes), 'utf8');

const pintar = (Pagina: ComponentType) => renderToStaticMarkup(createElement(Pagina));
const texto = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const h1 = (html: string) => texto(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
const conClaves = (claves: string[]) => (clave: string | readonly string[] | undefined | null) =>
  typeof clave === 'string' && (claves.includes('*') || claves.includes(clave));

afterEach(() => {
  sesion.permisos = [];
});

describe('H1 gestión de citas: páginas cortas y tabla que cabe', () => {
  it('pide 25 citas por página (con 100 la página medía más de 11.000 px)', () => {
    expect(TAMANO_PAGINA_CITAS).toBe(25);
  });

  it('fecha, inicio y fin van en "Horario" y la especialista bajo el servicio: 6 columnas en vez de 9', () => {
    // Con 7 columnas el ancho mínimo (unos 1.108 px) seguía pasando el marco de 1.062 px a 1440.
    expect([...COLUMNAS_TABLA_CITAS]).toEqual(['Cliente', 'Horario', 'Servicio', 'Estado', 'Riesgo IA', 'Acciones']);
  });

  it('cliente y servicio pueden saltar de línea (con ancho mínimo) para que la tabla quepa', () => {
    const fuente = leer('gestion-citas', 'page.tsx');
    const fila = fuente.slice(fuente.indexOf('<TableRow key={cita.id}>'), fuente.indexOf('</TableRow>', fuente.indexOf('<TableRow key={cita.id}>')));
    expect(fila.match(/<TableCell className="min-w-24" style=\{\{ whiteSpace: 'normal' \}\}>/g)?.length).toBe(2);
    expect(fila).toContain('cita.especialistaNombre');
  });

  it('la página usa las constantes compartidas y no su propio tamaño de 100', () => {
    const fuente = leer('gestion-citas', 'page.tsx');
    expect(fuente).toMatch(/TAMANO_PAGINA_CITAS[\s\S]*from '\.\.\/_lib\/panelOperacion'/);
    expect(fuente).not.toMatch(/TAMANO_PAGINA_CITAS\s*=\s*\d+/);
    expect(fuente).toContain('headers={[...COLUMNAS_TABLA_CITAS]}');
  });

  it('la acción sugerida del riesgo va en title (y para lector de pantalla), no como párrafo visible', () => {
    const fuente = leer('gestion-citas', 'page.tsx');
    expect(fuente).toMatch(/title=\{riesgo\.accionSugerida\}/);
    expect(fuente).toMatch(/<span className="sr-only">[^<]*\{riesgo\.accionSugerida\}/);
    expect(fuente).not.toMatch(/<p[^>]*>\s*\{riesgos\[cita\.id\]\.accionSugerida\}/);
  });

  it('acción principal a la vista (check-in o check-out) y el resto en "Más"', () => {
    expect(accionesCita('pendiente', false)).toEqual({ principal: 'checkin', secundarias: ['reprogramar', 'cancelar'], conMenu: true });
    expect(accionesCita('confirmada', true)).toEqual({ principal: 'checkin', secundarias: ['reprogramar', 'cancelar'], conMenu: true });
    expect(accionesCita('en_curso', false)).toEqual({ principal: 'checkout', secundarias: ['reprogramar', 'cancelar'], conMenu: true });
    expect(accionesCita('completada', false)).toEqual({ principal: null, secundarias: [], conMenu: false });
    // Una cita cancelada con anticipo por reembolsar sigue teniendo "Más".
    expect(accionesCita('cancelada', true)).toEqual({ principal: null, secundarias: [], conMenu: true });
  });

  it('las acciones del anticipo, reprogramar y cancelar viven dentro del menú "Más"', () => {
    const fuente = leer('gestion-citas', 'page.tsx');
    const menu = fuente.slice(fuente.indexOf('<MenuMasAcciones'), fuente.indexOf('{!acciones.principal && !acciones.conMenu'));
    expect(menu).toContain('acciones={(cerrar) => (');
    expect(menu).toContain('<AccionesAnticipo');
    expect(menu).toContain('openReprogramar(cita)');
    expect(menu).toContain('openCancelar(cita.id)');
    expect(menu).not.toContain('handleCheckIn');
  });

  it('el menú "Más" es un popover nativo ligado a su botón', () => {
    const html = renderToStaticMarkup(
      createElement(MenuMasAcciones, { etiqueta: 'Más acciones de la cita de Ana', acciones: () => createElement('button', null, 'Reprogramar') }),
    );
    const boton = html.match(/<button[^>]*popoverTarget="([^"]+)"[^>]*>/i);
    expect(boton, 'el botón "Más" abre el popover con popovertarget').not.toBeNull();
    const id = boton![1];
    expect(boton![0]).toContain(`aria-controls="${id}"`);
    expect(boton![0]).toContain('aria-expanded="false"');
    expect(boton![0]).toContain('aria-label="Más acciones de la cita de Ana"');
    expect(html).toMatch(new RegExp(`<div[^>]*id="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*popover="manual"`));
    expect(texto(html)).toContain('Reprogramar');
  });

  it('el botón "Más" y sus acciones miden 44 px', () => {
    const html = renderToStaticMarkup(
      createElement(MenuMasAcciones, { etiqueta: 'Más acciones de la cita de Ana', acciones: () => createElement('button', null, 'Reprogramar') }),
    );
    const boton = html.match(/<button[^>]*popoverTarget="[^"]+"[^>]*>/i)?.[0] ?? '';
    expect(boton).toContain('!min-h-11');
    // Las acciones son botones hijos directos del contenedor: la regla los alcanza (y gana a min-h-9 de size="sm").
    expect(html).toContain('[&amp;&gt;button]:min-h-11');
  });

  it('con un diálogo propio abierto dentro del menú, Escape y el clic fuera no cierran el menú', () => {
    const fuente = readFileSync(join(__dirname, '_lib', 'MenuMasAcciones.tsx'), 'utf8');
    // popover="auto" se cerraba con Escape aunque el diálogo del anticipo estuviera guardando: el diálogo
    // desaparecía sin desmontarse y el body se quedaba sin scroll. Con "manual" el menú decide cuándo cerrar.
    expect(fuente).not.toContain('popover="auto"');
    expect(fuente).toMatch(/if \(e\.key !== 'Escape' \|\| conDialogo\(\)\) return;/);
    expect(fuente).toMatch(/if \(conDialogo\(\)\) return;[\s\S]{0,300}contains\(e\.target\)/);
    expect(fuente).toContain("document.addEventListener('keydown', alTeclear)");
    expect(fuente).toContain("document.addEventListener('pointerdown', alTocarFuera)");
  });

  it('el menú se abre debajo del botón, alineado a su borde derecho, y arriba si no cabe', () => {
    const ventana = { ancho: 1440, alto: 900 };
    expect(posicionMenu({ top: 100, bottom: 136, right: 1300 }, ventana)).toEqual({ right: 140, top: 140, maxHeight: 752 });
    // Cerca del borde de abajo: se abre hacia arriba.
    expect(posicionMenu({ top: 820, bottom: 856, right: 1300 }, ventana)).toEqual({ right: 140, bottom: 84, maxHeight: 808 });
    // Nunca pegado al borde derecho de la ventana.
    expect(posicionMenu({ top: 100, bottom: 136, right: 1439 }, ventana).right).toBe(8);
  });

  it('el título es "Gestión de citas", igual que su miga', async () => {
    sesion.permisos = ['citas:escritura'];
    expect(h1(pintar(Paginas.gestionCitas))).toBe('Gestión de citas');
  });
});

describe('Acciones destructivas de fila con contorno de peligro (Button outline-danger)', () => {
  it('"Cancelar cita" en el menú y "Quitar" comisión; el relleno de peligro queda para confirmar en el diálogo', () => {
    const citas = leer('gestion-citas', 'page.tsx');
    expect(citas).toMatch(/<Button size="sm" variant="outline-danger" onClick=\{\(\) => \{ cerrar\(\); openCancelar\(cita\.id\); \}\}>Cancelar cita<\/Button>/);
    expect(citas).toMatch(/<Button variant="danger" onClick=\{handleCancelar\}/);
    expect(leer('comisiones', 'page.tsx')).toMatch(/variant="outline-danger" onClick=\{\(\) => quitar\(s\)\}/);
    const pedidos = leerComponente('pedidos', 'PanelPedidosOnline.tsx');
    const cancelar = pedidos.slice(pedidos.lastIndexOf('<Button', pedidos.indexOf('Cancelar pedido')), pedidos.indexOf('Cancelar pedido'));
    expect(cancelar).toContain('variant="outline-danger"');
  });
});

describe('H4 ejecución de servicios: sin columnas vacías y acciones que saltan de línea', () => {
  it('une inicio, fin y duración en "Horario" y quita "Productos" (siempre vacía)', async () => {
    const html = pintar(Paginas.ejecucion);
    const encabezados = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => texto(m[1]));
    expect(encabezados).toEqual(['Cliente', 'Servicio', 'Especialista', 'Horario', 'Estado', 'Acciones']);
  });

  it('los botones de la fila van en flex-wrap', () => {
    const fuente = leer('ejecucion-servicios', 'page.tsx');
    const idx = fuente.indexOf("{servicio.estado === 'pendiente' && (");
    const contenedor = fuente.slice(fuente.lastIndexOf('<div', idx), idx);
    expect(contenedor).toContain('flex flex-wrap');
  });
});

describe('H10 ficha de la clienta: el historial de citas cabe', () => {
  it('sin columna "Especialista": va bajo el servicio y la celda puede saltar de línea', () => {
    const fuente = leer('clientes-crm', '[id]', 'page.tsx');
    expect(fuente).toContain("headers={['Servicio', 'Fecha', 'Precio', 'Estado']}");
    expect(fuente).not.toContain("'Especialista', 'Precio'");
    const fila = fuente.slice(fuente.indexOf('const especialista = r(c.especialista)'), fuente.indexOf('</TableRow>', fuente.indexOf('const especialista = r(c.especialista)')));
    expect(fila).toMatch(/whiteSpace: 'normal'/);
    expect(fila).toContain('especialista.nombre');
  });
});

describe('H12 comisiones: el periodo no se corta a 375 px', () => {
  it('una columna por debajo de 420 px y dos desde ahí', async () => {
    sesion.permisos = ['comisiones:ver_propias'];
    const html = pintar(Paginas.comisiones);
    const form = html.match(/<form[^>]*class="([^"]+)"/)?.[1] ?? '';
    expect(form.split(/\s+/)).toEqual(expect.arrayContaining(['grid', 'grid-cols-1', 'min-[420px]:grid-cols-2']));
    expect(form.split(/\s+/)).not.toContain('grid-cols-2');
    // El botón ocupa las dos columnas solo cuando hay dos (col-span-2 en una columna crea una implícita).
    const boton = html.match(/<button[^>]*type="submit"[^>]*class="([^"]+)"/)?.[1] ?? html.match(/<button[^>]*class="([^"]+)"[^>]*type="submit"/)?.[1] ?? '';
    expect(boton.split(/\s+/)).toContain('min-[420px]:col-span-2');
    expect(boton.split(/\s+/)).not.toContain('col-span-2');
  });
});

describe('H15 agenda: celdas táctiles en móvil y cuadrícula baja en escritorio', () => {
  it('cuadradas por debajo de lg (con alto mínimo de 44 px) y de alto fijo desde lg', async () => {
    const html = pintar(Paginas.agenda);
    const celda = html.match(/<button[^>]*aria-pressed="false"[^>]*class="([^"]+)"/)?.[1] ?? html.match(/<button[^>]*class="([^"]+)"[^>]*aria-pressed/)?.[1] ?? '';
    const clases = celda.split(/\s+/);
    expect(clases).toEqual(expect.arrayContaining(['aspect-square', 'min-h-11', 'lg:aspect-auto', 'lg:h-16']));
  });

  it('en escritorio ancho el detalle del día va al lado del calendario', () => {
    const fuente = leer('agenda-calendario', 'page.tsx');
    expect(fuente).toMatch(/className="[^"]*xl:grid-cols-\[[^"]+\][^"]*"/);
  });

  it('el título coincide con la miga: "Agenda y calendario"', async () => {
    expect(h1(pintar(Paginas.agenda))).toBe(getBreadcrumbsForPath('/operacion/agenda-calendario').at(-1)?.label);
  });
});

describe('H18 inicio de operación: "Ventas de hoy" según el permiso', () => {
  it('con caja:lectura usa el resumen de caja; con solo ventas:escritura, las ventas del día como el punto de venta; sin ninguno, nada', () => {
    expect(fuenteVentasHoy(conClaves(['caja:lectura', 'ventas:escritura']))).toBe('resumen');
    expect(fuenteVentasHoy(conClaves(['ventas:escritura']))).toBe('ventas');
    expect(fuenteVentasHoy(conClaves(['citas:asignadas']))).toBeNull();
    expect(fuenteVentasHoy(conClaves(['*']))).toBe('resumen');
  });

  it('una empleada que vende ve la tarjeta, sin "No disponible para tu rol"', async () => {
    sesion.permisos = ['ventas:escritura', 'citas:escritura'];
    const html = pintar(Paginas.inicio);
    expect(html).toContain('Ventas de hoy');
    expect(html).not.toContain('No disponible para tu rol');
  });

  it('sin ningún permiso de ventas la tarjeta no aparece', async () => {
    sesion.permisos = ['citas:asignadas'];
    const html = pintar(Paginas.inicio);
    expect(html).not.toContain('Ventas de hoy');
    expect(html).not.toContain('No disponible para tu rol');
  });

  it('las ventas del día se suman con resumenVentasCobradas (mismo cálculo que el punto de venta)', () => {
    const fuente = leer('page.tsx');
    expect(fuente).toContain('listarVentas({ desde: hoy, limit: 100 })');
    expect(fuente).toContain('resumenVentasCobradas(');
    // El aviso de "no disponible" ya no existe: o se calcula o la tarjeta no se pinta.
    expect(fuente).not.toContain('No disponible para tu rol');
  });
});

describe('H19 títulos con mayúscula solo al inicio y la misma etiqueta que la miga', () => {
  it.each([
    ['cola-atencion', Paginas.cola, [] as string[]],
    ['ejecucion-servicios', Paginas.ejecucion, [] as string[]],
    ['cobro-sin-cita', Paginas.cobroSinCita, ['ventas:escritura']],
    ['gestion-citas', Paginas.gestionCitas, ['citas:escritura']],
    ['seguimiento-post-servicio', Paginas.seguimiento, ['seguimientos:lectura']],
  ])('%s: el h1 es la etiqueta de su miga', (ruta, Pagina, permisos) => {
    sesion.permisos = permisos;
    expect(h1(pintar(Pagina))).toBe(getBreadcrumbsForPath(`/operacion/${ruta}`).at(-1)?.label);
  });

  it('subtítulos y diálogos sin mayúscula tipo título', async () => {
    expect(texto(pintar(Paginas.cola))).toContain('Lista de turnos');
    expect(leer('clientes-crm', '[id]', 'page.tsx')).toContain('Historial de citas');
    expect(leer('clientes-crm', '[id]', 'page.tsx')).toContain('Seguimiento posterior al servicio');
    expect(leerComponente('personal', 'PanelHorasExtra.tsx')).toContain('Horas extra del mes');
    expect(leerComponente('personal', 'PanelSolicitudes.tsx')).toContain('Solicitudes de permisos');
    for (const titulo of ['Cola de Atención', 'Ejecución de Servicios', 'Cobro sin Cita', 'Gestión de Citas', 'Seguimiento Post-Servicio', 'Lista de Turnos', 'Historial de Citas']) {
      for (const archivo of ['cola-atencion', 'ejecucion-servicios', 'cobro-sin-cita', 'gestion-citas', 'seguimiento-post-servicio']) {
        expect(leer(archivo, 'page.tsx')).not.toContain(titulo);
      }
      expect(leer('clientes-crm', '[id]', 'page.tsx')).not.toContain(titulo);
    }
  });

  it('"Requieren acción" se pinta de peligro solo si hay alguno', () => {
    expect(tonoSiHay(0, 'peligro')).toBe('normal');
    expect(tonoSiHay(3, 'peligro')).toBe('peligro');
    const fuente = leer('seguimiento-post-servicio', 'page.tsx');
    const kpi = fuente.slice(fuente.indexOf('etiqueta="Requieren acción"') - 80, fuente.indexOf('/>', fuente.indexOf('etiqueta="Requieren acción"')));
    expect(kpi).toContain("tono={tonoSiHay(requierenAccion, 'peligro')}");
    expect(kpi).not.toContain('tono="peligro"');
  });
});
