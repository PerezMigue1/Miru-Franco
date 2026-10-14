import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { filasDatosCuenta } from './datosCuenta';

const fila = (filas: ReturnType<typeof filasDatosCuenta>, etiqueta: string) => {
  const f = filas.find((x) => x.etiqueta === etiqueta);
  expect(f, `falta la fila ${etiqueta}`).toBeDefined();
  return f!;
};

/** "Datos de tu cuenta": la insignia Validado solo donde el dato existe y está verificado. */
describe('filasDatosCuenta', () => {
  it('el correo confirmado lleva la insignia Validado', () => {
    const filas = filasDatosCuenta({ id: 'u-1', email: 'a@b.mx', telefono: '7711234567', confirmado: true });
    expect(fila(filas, 'E-mail').validado).toBe(true);
  });

  it('el correo sin confirmar no lleva la insignia', () => {
    const filas = filasDatosCuenta({ id: 'u-1', email: 'a@b.mx', confirmado: false });
    expect(fila(filas, 'E-mail').validado).toBe(false);
  });

  it('el teléfono (nadie lo verifica) y el ID nunca llevan la insignia; vacío se muestra con raya', () => {
    const filas = filasDatosCuenta({ id: 'u-1', email: 'a@b.mx', telefono: '', confirmado: true });
    expect(fila(filas, 'Teléfono')).toMatchObject({ valor: '—', validado: false });
    expect(fila(filas, 'ID de cuenta').validado).toBe(false);
  });

  it('el ID de cuenta no se puede modificar; correo y teléfono sí', () => {
    const filas = filasDatosCuenta({ id: 'u-1', email: 'a@b.mx', confirmado: true });
    expect(fila(filas, 'ID de cuenta').modificar).toBeNull();
    expect(fila(filas, 'E-mail').modificar).toBe('correo');
    expect(fila(filas, 'Teléfono').modificar).toBe('telefono');
  });
});

describe('UserProfile: Datos de tu cuenta', () => {
  const fuente = readFileSync(join(__dirname, 'UserProfile.tsx'), 'utf8');

  it('arma las filas con filasDatosCuenta y la insignia depende de fila.validado', () => {
    expect(fuente).toContain('filasDatosCuenta(user)');
    expect(fuente).toMatch(/\{fila\.validado && <Badge[^>]*>Validado<\/Badge>\}/);
  });

  it('Modificar solo aparece si la fila se puede modificar', () => {
    expect(fuente).toMatch(/\{fila\.modificar && \(/);
  });
});
