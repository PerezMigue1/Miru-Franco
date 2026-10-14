/**
 * Lógica pura de Gestión de personal (sin React).
 */
import type { EmpleadoApi } from '../../../services/empleados';

/** Fila del listado: solo datos reales (sin horario ni servicios del mes, que no hay de dónde sacar). */
export interface EmpleadoFila {
  id: string;
  nombre: string;
  rol: string;
  activo: boolean;
  comisiones: string;
}

export function mapearEmpleado(e: EmpleadoApi): EmpleadoFila {
  return {
    id: e.id || e.usuarioId,
    nombre: e.nombre ?? '-',
    rol: e.puesto ?? 'Empleado',
    // "Dar de baja" desactiva el perfil (no lo borra): el listado lo sigue trayendo y se marca.
    activo: e.activo !== false,
    comisiones: e.comisionPorcentaje != null ? `${e.comisionPorcentaje}%` : '-',
  };
}

/** Cuántos perfiles están activos y el texto del encabezado. */
export function resumenEmpleados(filas: EmpleadoFila[]): { activos: number; texto: string } {
  const activos = filas.filter((f) => f.activo).length;
  return { activos, texto: `${activos} empleado${activos === 1 ? '' : 's'} activo${activos === 1 ? '' : 's'}` };
}

/** Lo que de verdad hace "Dar de baja" (DELETE /api/empleados/:id pone activo = false). */
export const TEXTO_CONFIRMAR_BAJA =
  'Su perfil de empleado se desactivará: dejará de contar como activo, pero su historial se conserva y puedes reactivarlo desde Editar.';

/** Guardar el horario solo si se cargó el aprobado: si la carga falló, no se guarda encima. */
export function puedeGuardarHorario(e: { cargado: boolean; cargando: boolean; guardando: boolean }): boolean {
  return e.cargado && !e.cargando && !e.guardando;
}
