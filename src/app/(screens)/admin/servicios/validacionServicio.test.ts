import { describe, expect, it } from 'vitest';
import { validarServicio } from './validacionServicio';

const base = { nombre: 'Corte', categoria: 'Estilismo y Belleza', duracion: '60', precio: '350' };

describe('Servicio nuevo: validación en el front', () => {
  it('un servicio completo pasa', () => {
    expect(validarServicio(base)).toBeNull();
  });

  it('exige un precio mayor que 0 (vacío no se guarda como $0)', () => {
    expect(validarServicio({ ...base, precio: '' })).toBe('El precio debe ser mayor que 0.');
    expect(validarServicio({ ...base, precio: '0' })).toBe('El precio debe ser mayor que 0.');
    expect(validarServicio({ ...base, precio: '-10' })).toBe('El precio debe ser mayor que 0.');
  });
});
