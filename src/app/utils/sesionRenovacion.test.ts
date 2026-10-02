import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Entorno node: localStorage en memoria antes de importar security.ts.
const almacen = new Map<string, string>();
vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', {
  getItem: (k: string) => almacen.get(k) ?? null,
  setItem: (k: string, v: string) => void almacen.set(k, v),
  removeItem: (k: string) => void almacen.delete(k),
});

let security: typeof import('./security');
beforeAll(async () => {
  security = await import('./security');
});
beforeEach(() => almacen.clear());

const MIN = 60 * 1000;

describe('sesionPorRenovar', () => {
  it('no renueva en cada carga: con 15 min de ventana recién emitida, no toca', () => {
    security.markSessionRefreshed(15 * 60);
    expect(security.sesionPorRenovar()).toBe(false);
    expect(security.sesionPorRenovar(Date.now() + 9 * MIN)).toBe(false);
  });

  it('renueva cuando faltan menos de 5 min para el límite', () => {
    security.markSessionRefreshed(15 * 60);
    expect(security.sesionPorRenovar(Date.now() + 11 * MIN)).toBe(true);
    expect(security.sesionPorRenovar(Date.now() + 14.9 * MIN)).toBe(true);
  });

  it('no lo intenta si el límite ya pasó (el backend lo rechazaría) ni si no se conoce', () => {
    security.markSessionRefreshed(15 * 60);
    expect(security.sesionPorRenovar(Date.now() + 16 * MIN)).toBe(false);

    security.markSessionRefreshed(undefined); // respuesta sin el dato (sesión anterior al cambio)
    expect(security.sesionPorRenovar(Date.now() + 11 * MIN)).toBe(false);
  });

  it('login y refresh guardan el límite; clearAuthData lo borra', () => {
    security.markSessionStart(4 * 60);
    expect(security.sesionPorRenovar()).toBe(true);

    security.clearAuthData();
    expect(security.sesionPorRenovar()).toBe(false);
  });
});
