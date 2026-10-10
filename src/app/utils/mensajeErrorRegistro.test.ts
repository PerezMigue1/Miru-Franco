import { describe, expect, it } from 'vitest';
import { mensajeErrorRegistro } from './mensajeErrorRegistro';

describe('mensajeErrorRegistro', () => {
  it('el 409 de correo duplicado usa el mensaje del backend y dice qué hacer', () => {
    expect(mensajeErrorRegistro(new Error('El email ya está registrado'))).toBe(
      'El email ya está registrado. Inicia sesión o recupera tu contraseña.',
    );
  });

  it('si el mensaje ya dice qué hacer, no lo repite', () => {
    const texto = 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.';
    expect(mensajeErrorRegistro(new Error(texto))).toBe(texto);
  });

  it('sin mensaje usa un texto claro', () => {
    expect(mensajeErrorRegistro(new Error(''))).toBe('Error al crear la cuenta');
    expect(mensajeErrorRegistro('x')).toBe('Error al crear la cuenta');
  });

  it('faltan campos: pide revisar los obligatorios', () => {
    expect(mensajeErrorRegistro(new Error('Faltan campos obligatorios'))).toBe(
      'Por favor, verifica que todos los campos obligatorios estén completos.',
    );
  });

  it('otros errores se muestran tal cual', () => {
    expect(mensajeErrorRegistro(new Error('Datos inválidos'))).toBe('Datos inválidos');
  });
});
