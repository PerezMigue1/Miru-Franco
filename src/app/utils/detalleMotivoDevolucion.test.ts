import { describe, expect, it } from 'vitest';
import { detalleMotivoDevolucion } from './politicaDevolucion';

describe('detalleMotivoDevolucion', () => {
  it('quita el prefijo [Tipo · Causa] cuando la fila ya trae tipo y causa en columnas', () => {
    expect(detalleMotivoDevolucion({ tipo: 'reembolso', motivo: '[Reembolso · Defecto de fábrica] El frasco llegó roto' })).toBe('El frasco llegó roto');
    expect(detalleMotivoDevolucion({ tipo: 'cambio', motivo: '[Cambio · Producto sellado sin abrir]' })).toBe('');
  });

  it('las solicitudes anteriores sin tipo muestran el motivo completo', () => {
    expect(detalleMotivoDevolucion({ tipo: null, motivo: '[Cambio · Producto sellado sin abrir] Otro tono' })).toBe('[Cambio · Producto sellado sin abrir] Otro tono');
    expect(detalleMotivoDevolucion({ tipo: null, motivo: null })).toBe('');
  });
});
