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
