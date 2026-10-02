import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import robots from '../robots';
import { RUTAS_CON_SESION, requiereSesion, rutaLogin } from './rutasConSesion';

/** Rutas de /cliente que se ven sin sesión (catálogo, carritos de invitado, alias). */
const PUBLICAS = [
  '/cliente/carrito',
  '/cliente/galeria',
  '/cliente/mi-perfil',
  '/cliente/promociones',
  '/cliente/servicios-citas',
  '/cliente/servicios-citas/servicios/[id]',
  '/cliente/tienda-online',
  '/cliente/tienda-online/carrito',
  '/cliente/tienda-online/productos/[id]',
];

const PRIVADA = join(__dirname, '..', '(screens)', '(privada)');

function paginas(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return paginas(ruta);
    return nombre === 'page.tsx' ? ['/' + relative(PRIVADA, dir).split(sep).join('/')] : [];
  });
}

describe('rutasConSesion', () => {
  it('cada página de /cliente y /perfil es pública o exige sesión, sin rutas olvidadas', () => {
    const todas = [...paginas(join(PRIVADA, 'cliente')), ...paginas(join(PRIVADA, 'perfil'))];
    const sinClasificar = todas.filter((r) => !PUBLICAS.includes(r) && !requiereSesion(r));
    expect(sinClasificar).toEqual([]);
    expect(PUBLICAS.filter((r) => requiereSesion(r))).toEqual([]);
  });

  it('las subrutas heredan, pero no un prefijo parecido', () => {
    expect(requiereSesion('/cliente/tienda-online/checkout/elegir-domicilio')).toBe(true);
    expect(requiereSesion('/cliente/servicios-citas/mis-citas/abc')).toBe(true);
    expect(requiereSesion('/perfil')).toBe(true);
    expect(requiereSesion('/perfiles')).toBe(false);
    expect(requiereSesion('/operacion')).toBe(false);
    expect(requiereSesion('/admin')).toBe(false);
  });

  it('rutaLogin conserva ruta y query del destino', () => {
    expect(rutaLogin('/cliente/servicios-citas/calendario?servicioId=7')).toBe(
      '/login?returnUrl=%2Fcliente%2Fservicios-citas%2Fcalendario%3FservicioId%3D7',
    );
  });

  it('robots.txt sigue sin indexar las rutas con sesión ni los carritos', () => {
    const { disallow } = robots().rules as { disallow: string[] };
    for (const ruta of [...RUTAS_CON_SESION, '/cliente/carrito', '/cliente/tienda-online/carrito', '/cliente/mi-perfil']) {
      expect(disallow).toContain(ruta);
    }
  });
});
