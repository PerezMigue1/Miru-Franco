import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Entorno node: localStorage y sessionStorage en memoria.
const local = new Map<string, string>();
const sesion = new Map<string, string>();
function storageEnMemoria(almacen: Map<string, string>) {
  return {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
  };
}
vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com'); // services/perfil la exige en el navegador
vi.stubGlobal('window', { location: { protocol: 'https:', hostname: 'localhost' } });
vi.stubGlobal('localStorage', storageEnMemoria(local));
vi.stubGlobal('sessionStorage', storageEnMemoria(sesion));

let quitarDatosSalud: typeof import('./datosSensiblesStorage').quitarDatosSalud;
let sanearAlmacenamientoNavegador: typeof import('./datosSensiblesStorage').sanearAlmacenamientoNavegador;
let mergePerfilEnLocalStorage: typeof import('../services/perfil').mergePerfilEnLocalStorage;
beforeAll(async () => {
  ({ quitarDatosSalud, sanearAlmacenamientoNavegador } = await import('./datosSensiblesStorage'));
  ({ mergePerfilEnLocalStorage } = await import('../services/perfil'));
});

beforeEach(() => {
  local.clear();
  sesion.clear();
});

const usuarioHeredado = {
  id: 'u-1',
  nombre: 'Ana López',
  email: 'ana@example.com',
  rol: 'cliente',
  foto: 'https://res.cloudinary.com/demo/image/upload/ana.jpg',
  telefono: '7711234567',
  alergias: 'Amoniaco',
  tieneAlergias: true,
  tratamientos: ['decoloración'],
  perfilCapilar: { tipoCabello: 'rizado', tratamientosQuimicos: 'alisado' },
};

describe('quitarDatosSalud', () => {
  it('quita las claves de salud en cualquier nivel sin mutar el original', () => {
    const original = {
      id: 'c-1',
      cliente: { nombre: 'Ana', alergias: 'Amoniaco', perfilCapilar: { tipo: 'liso' } },
      historial: [{ notasMedicas: 'x', fecha: '2026-01-01' }],
      embarazo: true,
    };
    const copia = JSON.parse(JSON.stringify(original));

    expect(quitarDatosSalud(original)).toEqual({
      id: 'c-1',
      cliente: { nombre: 'Ana' },
      historial: [{ fecha: '2026-01-01' }],
    });
    expect(original).toEqual(copia);
  });

  it('deja intactos los valores primitivos', () => {
    expect(quitarDatosSalud('dark')).toBe('dark');
    expect(quitarDatosSalud(3)).toBe(3);
    expect(quitarDatosSalud(null)).toBeNull();
  });
});

describe('sanearAlmacenamientoNavegador', () => {
  it('un user heredado con alergias, tratamientos y teléfono queda solo con los campos permitidos', () => {
    local.set('user', JSON.stringify(usuarioHeredado));

    sanearAlmacenamientoNavegador();

    expect(JSON.parse(local.get('user')!)).toEqual({
      id: 'u-1',
      nombre: 'Ana López',
      email: 'ana@example.com',
      rol: 'cliente',
      foto: 'https://res.cloudinary.com/demo/image/upload/ana.jpg',
    });
  });

  it('un user corrupto (JSON inválido) se borra', () => {
    local.set('user', '{"id":"u-1","alergias":');

    sanearAlmacenamientoNavegador();

    expect(local.has('user')).toBe(false);
  });

  it('otra clave propia con JSON anidado pierde perfilCapilar y alergias', () => {
    local.set(
      'miru-cart',
      JSON.stringify([{ id: 'p-1', cliente: { perfilCapilar: { tipo: 'liso' }, alergias: 'x' } }])
    );

    sanearAlmacenamientoNavegador();

    expect(JSON.parse(local.get('miru-cart')!)).toEqual([{ id: 'p-1', cliente: {} }]);
  });

  it('también limpia las claves propias en sessionStorage', () => {
    sesion.set('user', JSON.stringify(usuarioHeredado));

    sanearAlmacenamientoNavegador();

    expect(JSON.parse(sesion.get('user')!)).not.toHaveProperty('alergias');
    expect(JSON.parse(sesion.get('user')!)).not.toHaveProperty('telefono');
  });

  it('los valores que no son JSON y las claves ajenas quedan intactos', () => {
    local.set('theme', 'dark');
    local.set('manualLogout', 'true');
    local.set('otra-libreria', JSON.stringify({ alergias: 'no es nuestra' }));

    sanearAlmacenamientoNavegador();

    expect(local.get('theme')).toBe('dark');
    expect(local.get('manualLogout')).toBe('true');
    expect(JSON.parse(local.get('otra-libreria')!)).toEqual({ alergias: 'no es nuestra' });
  });

  it('no reescribe una clave que ya estaba limpia', () => {
    const limpio = JSON.stringify([{ id: 'p-1', cantidad: 2 }]);
    local.set('miru-cart', limpio);
    const setItem = vi.spyOn(localStorage, 'setItem');

    sanearAlmacenamientoNavegador();

    expect(setItem).not.toHaveBeenCalledWith('miru-cart', expect.anything());
    expect(local.get('miru-cart')).toBe(limpio);
    setItem.mockRestore();
  });

  it('no lanza si el almacenamiento está bloqueado (Safari privado)', () => {
    const bloqueado = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    vi.stubGlobal('localStorage', bloqueado);
    vi.stubGlobal('sessionStorage', bloqueado);
    try {
      expect(() => sanearAlmacenamientoNavegador()).not.toThrow();
    } finally {
      vi.stubGlobal('localStorage', storageEnMemoria(local));
      vi.stubGlobal('sessionStorage', storageEnMemoria(sesion));
    }
  });
});

describe('mergePerfilEnLocalStorage (regresión)', () => {
  it('sobre un user heredado con alergias no las conserva', () => {
    local.set('user', JSON.stringify(usuarioHeredado));

    mergePerfilEnLocalStorage({ id: 'u-1', nombre: 'Ana López', email: 'ana@example.com' } as never);

    const guardado = JSON.parse(local.get('user')!);
    expect(guardado).not.toHaveProperty('alergias');
    expect(guardado).not.toHaveProperty('tratamientos');
    expect(guardado).not.toHaveProperty('perfilCapilar');
    expect(guardado).not.toHaveProperty('telefono');
  });
});
