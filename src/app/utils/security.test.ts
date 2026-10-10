import { describe, expect, it } from 'vitest';
import {
  hasDangerousCharacters,
  sanitizeInput,
  sanitizeEmail,
  validatePassword,
} from './security';

describe('security utils', () => {
  it('accepts a strong password without personal data', () => {
    const result = validatePassword('Fuerte#2026', {
      nombre: 'Miguel',
      email: 'user@example.com',
      telefono: '5512345678',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('compara contra el día de nacimiento real aunque se guarde a medianoche UTC (hora de México)', () => {
    const tzAnterior = process.env.TZ;
    process.env.TZ = 'America/Mexico_City';
    try {
      // 2000-01-01 a medianoche UTC es 31/12/1999 en México: antes se comparaba contra 1999.
      const result = validatePassword('Clave#2000Zz', { fechaNacimiento: '2000-01-01T00:00:00.000Z' });
      expect(result.errors).toContain('La contraseña no puede contener tu fecha de nacimiento');
    } finally {
      process.env.TZ = tzAnterior;
    }
  });

  describe('datos personales: igual que el backend, solo campos de 3 o más caracteres', () => {
    it('el día de nacimiento (1 o 2 caracteres) no rechaza contraseñas con ese dígito', () => {
      expect(validatePassword('Gato#2471Xy', { fechaNacimiento: '1990-05-01' }).valid).toBe(true);
    });

    it('el mes de nacimiento no se compara', () => {
      expect(validatePassword('Sol#1958Qz', { fechaNacimiento: '1990-01-15' }).valid).toBe(true);
    });

    it('un nombre de 2 letras no se compara', () => {
      expect(validatePassword('Alto#2048Qz', { nombre: 'Al' }).valid).toBe(true);
    });

    it('una parte local del correo de 2 letras no se compara', () => {
      expect(validatePassword('Yoga#2048Qz', { email: 'yo@x.com' }).valid).toBe(true);
    });

    it('sigue rechazando el año de nacimiento', () => {
      const result = validatePassword('Gato#1990Xy', { fechaNacimiento: '1990-05-01' });
      expect(result.errors).toContain('La contraseña no puede contener tu fecha de nacimiento');
    });

    it('sigue rechazando el nombre', () => {
      const result = validatePassword('Miguel#2048Qz', { nombre: 'Miguel' });
      expect(result.errors).toContain('La contraseña no puede contener tu nombre');
    });
  });

  it('rejects weak password patterns', () => {
    const result = validatePassword('password123');
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('detects dangerous html/script-like inputs', () => {
    expect(hasDangerousCharacters('<script>alert(1)</script>')).toBe(true);
    expect(hasDangerousCharacters('texto normal')).toBe(false);
  });

  it('sanitizes and normalizes input/email', () => {
    expect(sanitizeInput('<b>Hola</b>')).toContain('&lt;b&gt;');
    expect(sanitizeEmail('  USER@MAIL.COM ')).toBe('user@mail.com');
  });
});
