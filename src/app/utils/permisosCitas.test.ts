import { describe, expect, it } from 'vitest';
import { puedeAtenderCita, puedeCrearSeguimientos } from './permisosCitas';

const conClaves = (claves: string[]) => (clave: string | undefined | null) =>
  !!clave && (claves.includes('*') || claves.includes(clave));

describe('botones de citas y seguimientos según la matriz de permisos', () => {
  it('admin, estilista y empleado (citas:escritura) atienden cualquier cita', () => {
    expect(puedeAtenderCita(conClaves(['*']), 'otra', 'yo')).toBe(true);
    expect(puedeAtenderCita(conClaves(['citas:escritura']), 'otra', 'yo')).toBe(true);
  });

  it('el becario (citas:asignadas) solo atiende las citas que tiene asignadas', () => {
    const becario = conClaves(['citas:asignadas', 'seguimientos:lectura']);
    expect(puedeAtenderCita(becario, 'bec-1', 'bec-1')).toBe(true);
    expect(puedeAtenderCita(becario, 'est-1', 'bec-1')).toBe(false);
    expect(puedeAtenderCita(becario, undefined, 'bec-1')).toBe(false);
    expect(puedeAtenderCita(becario, 'bec-1', undefined)).toBe(false);
  });

  it('solo quien tiene seguimientos:escritura ve el botón de nuevo seguimiento', () => {
    expect(puedeCrearSeguimientos(conClaves(['seguimientos:escritura']))).toBe(true);
    expect(puedeCrearSeguimientos(conClaves(['*']))).toBe(true);
    expect(puedeCrearSeguimientos(conClaves(['seguimientos:lectura']))).toBe(false);
  });
});
