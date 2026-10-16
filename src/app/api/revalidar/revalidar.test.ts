import { afterEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag }));
const { POST } = await import('./route');
const { secretoValido } = await import('../../utils/revalidacion');

/** POST /api/revalidar: lo llama el backend al guardar contenido público; la caché de 60 s queda de respaldo. */
const SECRETO_PRUEBA = 'y'.repeat(40);
const pedir = (secreto?: string) =>
  POST(new Request('http://localhost/api/revalidar', { method: 'POST', headers: secreto ? { 'x-revalidar-secreto': secreto } : {} }));

describe('POST /api/revalidar', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    revalidateTag.mockReset();
  });

  it('sin REVALIDAR_SECRETO configurado responde 404 y no toca la caché', async () => {
    vi.stubEnv('REVALIDAR_SECRETO', '');
    expect((await pedir(SECRETO_PRUEBA)).status).toBe(404);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('con un secreto equivocado o sin él: 401', async () => {
    vi.stubEnv('REVALIDAR_SECRETO', SECRETO_PRUEBA);
    expect((await pedir('z'.repeat(40))).status).toBe(401);
    expect((await pedir()).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('con el secreto correcto vacía al momento la configuración y el contenido públicos', async () => {
    vi.stubEnv('REVALIDAR_SECRETO', SECRETO_PRUEBA);
    const r = await pedir(SECRETO_PRUEBA);
    expect(r.status).toBe(200);
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual(['configuracion-publica', 'contenido-publico']);
    expect(revalidateTag.mock.calls.every((c) => c[1]?.expire === 0)).toBe(true);
  });

  it('un secreto corto nunca vale', () => {
    expect(secretoValido('corto', 'corto')).toBe(false);
  });
});
