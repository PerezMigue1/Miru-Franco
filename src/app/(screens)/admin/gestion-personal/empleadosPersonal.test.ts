import { describe, expect, it } from 'vitest';
import type { EmpleadoApi } from '../../../services/empleados';
import { TEXTO_CONFIRMAR_BAJA, mapearEmpleado, puedeGuardarHorario, resumenEmpleados } from './empleadosPersonal';

const emp = (id: string, activo: boolean): EmpleadoApi =>
  ({ id, usuarioId: id, nombre: `Persona ${id}`, puesto: 'Estilista', activo, comisionPorcentaje: 10 }) as EmpleadoApi;

describe('Gestión de personal: dar de baja desactiva y se nota', () => {
  it('la fila marca si el perfil está inactivo', () => {
    expect(mapearEmpleado(emp('a', false)).activo).toBe(false);
    expect(mapearEmpleado(emp('b', true)).activo).toBe(true);
  });

  it('el contador solo cuenta activos', () => {
    const r = resumenEmpleados([emp('a', true), emp('b', false), emp('c', true)].map(mapearEmpleado));
    expect(r.activos).toBe(2);
    expect(r.texto).toBe('2 empleados activos');
    expect(resumenEmpleados([emp('a', true)].map(mapearEmpleado)).texto).toBe('1 empleado activo');
  });

  it('la fila no inventa servicios ni horario del mes', () => {
    const fila = mapearEmpleado(emp('a', true)) as unknown as Record<string, unknown>;
    expect(fila).not.toHaveProperty('servicios');
    expect(fila).not.toHaveProperty('horario');
  });

  it('el modal dice lo que pasa: se desactiva, no se elimina', () => {
    expect(TEXTO_CONFIRMAR_BAJA).toMatch(/desactiv/i);
    expect(TEXTO_CONFIRMAR_BAJA).not.toMatch(/eliminar/i);
  });
});

describe('Horario del salón: no se guarda encima si no se cargó', () => {
  it('si la carga falló, Guardar queda deshabilitado', () => {
    expect(puedeGuardarHorario({ cargado: false, cargando: false, guardando: false })).toBe(false);
  });

  it('con el horario cargado se puede guardar', () => {
    expect(puedeGuardarHorario({ cargado: true, cargando: false, guardando: false })).toBe(true);
    expect(puedeGuardarHorario({ cargado: true, cargando: false, guardando: true })).toBe(false);
  });
});
