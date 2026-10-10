import { describe, expect, it } from 'vitest';
import {
  esTelefonoMexicoValido,
  normalizarTelefonoRegistro,
  telefonoEnCampo,
  telefonoEscrito,
  telefonoPegado,
  telefonoSinLada,
} from './phone';

describe('telefonoSinLada: quita la lada de México sin recortar nunca', () => {
  it.each([
    ['+52 771 123 4567', '7711234567'],
    ['5217711234567', '7711234567'],
    ['521 771 123 4567', '7711234567'],
    ['7711234567', '7711234567'],
    ['5255123456', '5255123456'],
  ])('%s queda en %s y es válido', (entrada, esperado) => {
    expect(telefonoSinLada(entrada)).toBe(esperado);
    expect(esTelefonoMexicoValido(entrada)).toBe(true);
    expect(normalizarTelefonoRegistro(entrada)).toBe(esperado);
  });

  it('11 dígitos que empiezan con 52 no se tocan y dan error', () => {
    expect(telefonoSinLada('52 771 123 456')).toBe('52771123456');
    expect(esTelefonoMexicoValido('52 771 123 456')).toBe(false);
  });

  it('14 dígitos no se recortan y dan error', () => {
    expect(telefonoSinLada('52771123456789')).toBe('52771123456789');
    expect(esTelefonoMexicoValido('52771123456789')).toBe(false);
  });

  it.each(['+1 771 123 4567', '77112', 'abc', '0771234567'])('%s da error', (entrada) => {
    expect(esTelefonoMexicoValido(entrada)).toBe(false);
  });

  it('el número de 10 dígitos debe empezar con 2 a 9 (521 de 12 dígitos no queda en 1...)', () => {
    expect(telefonoSinLada('521771123456')).toBe('1771123456');
    expect(esTelefonoMexicoValido('521771123456')).toBe(false);
    expect(esTelefonoMexicoValido('1771123456')).toBe(false);
  });
});

describe('teléfono en el campo', () => {
  it('escrito tecla por tecla: solo dígitos y hasta 13 (10 más la lada 521)', () => {
    expect(telefonoEscrito('+52 1')).toBe('521');
    expect(telefonoEscrito('52177112345678')).toBe('5217711234567');
  });

  it('pegado: quita la lada y no recorta', () => {
    expect(telefonoPegado('+52 771 123 4567')).toBe('7711234567');
    expect(telefonoPegado('52771123456789')).toBe('52771123456789');
  });

  it('varios dígitos de golpe cuentan como pegado; uno solo, como escrito', () => {
    expect(telefonoEnCampo('', '+52 771 123 4567')).toBe('7711234567');
    expect(telefonoEnCampo('52771123456', '527711234567')).toBe('527711234567');
    expect(telefonoEnCampo('', '52771123456789')).toBe('52771123456789');
    expect(telefonoEnCampo('5217711234567', '52177112345678')).toBe('5217711234567');
  });
});
