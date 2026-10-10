import { describe, expect, it, vi } from 'vitest';

// Entorno node sin DOM: useEffect se ejecuta en cuanto se registra, como al montar.
vi.mock('react', () => ({ useEffect: (efecto: () => void) => efecto() }));
vi.mock('../hooks/useAutoRefreshToken', () => ({ useAutoRefreshToken: () => undefined }));
vi.mock('../utils/datosSensiblesStorage', () => ({ sanearAlmacenamientoNavegador: vi.fn() }));

describe('TokenChecker', () => {
  it('limpia los datos de salud del navegador al cargar la app', async () => {
    const { TokenChecker } = await import('./TokenChecker');
    const { sanearAlmacenamientoNavegador } = await import('../utils/datosSensiblesStorage');

    TokenChecker();

    expect(sanearAlmacenamientoNavegador).toHaveBeenCalledTimes(1);
  });
});
