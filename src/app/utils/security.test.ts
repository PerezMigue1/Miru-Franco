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
