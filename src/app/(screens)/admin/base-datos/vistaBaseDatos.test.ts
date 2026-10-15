import { describe, expect, it } from 'vitest';
import {
  MONITOREO_INTERVALO_MS,
  OPCIONES_TRUNCATE_INICIALES,
  PESTANAS_MONITOREO,
  PLACEHOLDER_CONFIRMACION,
  modoImportacion,
  opcionesTablaTruncate,
  textoIntervaloMonitoreo,
  vistaDesdeRuta,
} from './vistaBaseDatos';

describe('Gestor de base de datos: cada subruta abre su vista', () => {
  it('monitoreo/actividad y monitoreo/locks abren Actividad y Locks, no el Resumen', () => {
    expect(vistaDesdeRuta('/admin/base-datos/monitoreo/actividad')).toEqual({ principal: 'monitoreo', monitoreo: 'actividad' });
    expect(vistaDesdeRuta('/admin/base-datos/monitoreo/locks')).toEqual({ principal: 'monitoreo', monitoreo: 'locks' });
  });

  it('las demás rutas siguen igual', () => {
    expect(vistaDesdeRuta('/admin/base-datos')).toEqual({ principal: 'operaciones', operaciones: 'importar' });
    expect(vistaDesdeRuta('/admin/base-datos/monitoreo')).toEqual({ principal: 'monitoreo', monitoreo: 'resumen' });
    expect(vistaDesdeRuta('/admin/base-datos/monitoreo/tablas')).toEqual({ principal: 'monitoreo', monitoreo: 'tablas' });
    expect(vistaDesdeRuta('/admin/base-datos/monitoreo/indices')).toEqual({ principal: 'monitoreo', monitoreo: 'indices' });
    expect(vistaDesdeRuta('/admin/base-datos/operaciones/truncate')).toEqual({ principal: 'operaciones', operaciones: 'truncate' });
    expect(vistaDesdeRuta('/admin/base-datos/diagrama')).toEqual({ principal: 'diagrama' });
    expect(vistaDesdeRuta('/admin/base-datos/consultar')).toEqual({ principal: 'consultar' });
    expect(vistaDesdeRuta('/admin/base-datos/backup')).toEqual({ principal: 'backup' });
  });

  it('las pestañas de monitoreo incluyen Actividad y Locks', () => {
    expect(PESTANAS_MONITOREO.map((p) => p.id)).toEqual(['resumen', 'tablas', 'indices', 'actividad', 'locks']);
  });
});

describe('Importación: modo permitido según la metadata del backend', () => {
  const meta = [
    { tabla: 'productos', modosPermitidos: ['append' as const], conflictKeys: [] },
    { tabla: 'servicios', modosPermitidos: ['append' as const, 'missing_only' as const, 'upsert' as const], conflictKeys: ['id'] },
  ];

  it('productos solo admite append: no se manda missing_only', () => {
    expect(modoImportacion(meta, 'productos')).toBe('append');
  });

  it('si la tabla admite missing_only, se prefiere (no duplica ni sobrescribe)', () => {
    expect(modoImportacion(meta, 'servicios')).toBe('missing_only');
  });
});

describe('Truncate: la primera tabla se puede elegir', () => {
  it('con tablas cargadas, la primera opción es un marcador vacío', () => {
    const opciones = opcionesTablaTruncate(['citas', 'pedidos']);
    expect(opciones[0]).toEqual({ value: '', label: 'Selecciona una tabla' });
    expect(opciones.slice(1).map((o) => o.value)).toEqual(['citas', 'pedidos']);
  });

  it('sin tablas pide cargarlas', () => {
    expect(opcionesTablaTruncate([])).toEqual([{ value: '', label: 'Carga las tablas de la BD' }]);
  });
});

describe('Truncate: opciones y confirmación sin nada prellenado', () => {
  it('RESTART IDENTITY y CASCADE empiezan sin marcar', () => {
    expect(OPCIONES_TRUNCATE_INICIALES).toEqual({ restartIdentity: false, cascade: false });
  });

  it('el placeholder de la confirmación no es el texto a escribir (no parece ya lleno)', () => {
    expect(PLACEHOLDER_CONFIRMACION).toBe('Escribe la confirmación');
    expect(PLACEHOLDER_CONFIRMACION).not.toMatch(/TRUNCATE|IMPORTAR/);
  });
});

describe('Monitoreo: el texto del intervalo coincide con el real', () => {
  it('dice cada 30 s porque el intervalo es de 30 000 ms', () => {
    expect(MONITOREO_INTERVALO_MS).toBe(30_000);
    expect(textoIntervaloMonitoreo()).toBe('cada 30 s');
  });
});

describe('Menú de secciones de Backup: ningún enlace da 404', () => {
  it('cada /admin/base-datos/... del menú tiene su página', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = join(process.cwd(), 'src', 'app', '(screens)', 'admin', 'base-datos');
    const fuente = readFileSync(join(dir, 'backup', 'page.tsx'), 'utf-8');
    const rutas = [...fuente.matchAll(/href: '\/admin\/base-datos\/([a-z/-]+)'/g)].map((m) => m[1]);
    expect(rutas).toContain('diagrama');
    expect(rutas).toContain('consultar');
    for (const ruta of rutas) {
      expect(existsSync(join(dir, ...ruta.split('/'), 'page.tsx')), ruta).toBe(true);
    }
  });
});
