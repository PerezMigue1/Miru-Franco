import { describe, expect, it } from 'vitest';
import { HORARIO_SALON } from './contactoSalon';

describe('horario del salón (una sola fuente para footer, contacto, términos y recoger en el salón)', () => {
  it('el texto visible es el confirmado por la dueña', () => {
    expect(HORARIO_SALON.texto).toBe(
      'Lunes a viernes de 9:30 a 19:30 h. Sábados de 9:30 a 19:00 h. Domingos cerrado.',
    );
  });

  it('las frases por separado (una por línea) arman el mismo texto', () => {
    expect(HORARIO_SALON.frases).toEqual([
      'Lunes a viernes de 9:30 a 19:30 h.',
      'Sábados de 9:30 a 19:00 h.',
      'Domingos cerrado.',
    ]);
    expect(HORARIO_SALON.frases.join(' ')).toBe(HORARIO_SALON.texto);
  });
});
