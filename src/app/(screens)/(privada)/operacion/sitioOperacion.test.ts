// Operaciones > Horario y días inhábiles, y Equipo en el sitio: el personal con permiso los administra.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const leer = (...p: string[]) => readFileSync(join(__dirname, ...p), 'utf8');
const layout = readFileSync(join(__dirname, '..', '..', '..', 'components', 'layouts', 'OperacionLayout.tsx'), 'utf8');

describe('Panel de operaciones: sitio', () => {
  it('el menú muestra las dos secciones solo con su permiso', () => {
    expect(layout).toContain("{ label: 'Horario y días inhábiles', href: '/operacion/horario', icon: CalendarOff, permiso: 'horario:editar' }");
    expect(layout).toContain("href: '/operacion/equipo-sitio', icon: Contact, permiso: ['equipo:publico', 'configuracion:editar'] }");
  });

  it('cada página exige su permiso (defensa en profundidad) y usa los endpoints de operación', () => {
    const horario = leer('horario', 'page.tsx');
    expect(horario).toContain('<OperacionLayout permisoRequerido={PERMISO_HORARIO}>');
    expect(horario).toContain("export const PERMISO_HORARIO = 'horario:editar';");
    expect(horario).toContain('guardarHorarioOperacion');
    expect(horario).toContain('guardarDiasInhabilesOperacion');
    const equipo = leer('equipo-sitio', 'page.tsx');
    expect(equipo).toContain('<OperacionLayout permisoRequerido={PERMISOS_EQUIPO_SITIO}>');
    expect(equipo).toContain('<SeccionEquipo />');
  });

  it('el servicio va a /api/operacion-sitio (no al endpoint del admin) y un 403 se queda en pantalla', () => {
    const servicio = readFileSync(join(__dirname, '..', '..', '..', 'services', 'operacionSitio.ts'), 'utf8');
    expect(servicio).toContain("'/api/operacion-sitio/horario'");
    expect(servicio).toContain("'/api/operacion-sitio/dias-inhabiles'");
    expect(servicio).not.toContain('/api/configuracion-sitio');
    expect(servicio).toContain('skip403Redirect: true');
  });
});
