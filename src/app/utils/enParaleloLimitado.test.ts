import { describe, expect, it } from 'vitest';
import { enParaleloLimitado } from './enParaleloLimitado';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('enParaleloLimitado', () => {
  it('nunca corre más de `limite` tareas a la vez y respeta el orden de los resultados', async () => {
    let enCurso = 0;
    let maximo = 0;
    const tarea = (valor: number, ms: number) => async () => {
      enCurso++;
      maximo = Math.max(maximo, enCurso);
      await esperar(ms);
      enCurso--;
      return valor;
    };

    const resultados = await enParaleloLimitado(
      [tarea(1, 30), tarea(2, 5), tarea(3, 20), tarea(4, 5), tarea(5, 10), tarea(6, 5), tarea(7, 5)],
      3,
    );

    expect(resultados).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(maximo).toBe(3);
  });

  it('conserva el tipo de cada resultado', async () => {
    const [texto, numero] = await enParaleloLimitado([async () => 'a', async () => 2] as const, 2);
    expect(texto.toUpperCase()).toBe('A');
    expect(numero + 1).toBe(3);
  });
});
