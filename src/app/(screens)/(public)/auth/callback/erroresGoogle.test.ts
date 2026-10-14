import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mensajeErrorGoogle, RUTA_ERROR_GOOGLE } from './erroresGoogle';

describe('Callback de Google: errores', () => {
  it('un error desconocido de la URL da un mensaje fijo, sin reflejar el texto', () => {
    const texto = 'Tu cuenta fue suspendida, llama al 555';
    const mensaje = mensajeErrorGoogle(texto);
    expect(mensaje).not.toContain(texto);
    expect(mensaje).toBe('Error en la autenticación. Por favor intenta de nuevo.');
  });

  it('los errores conocidos conservan su mensaje', () => {
    expect(mensajeErrorGoogle('access_denied')).toBe('Autorización cancelada');
    expect(mensajeErrorGoogle('authentication_failed')).toBe('No se pudo completar la autenticación');
  });

  it('los errores vuelven al acceso con error=google (la raíz / redirige a /home y lo perdía)', () => {
    expect(RUTA_ERROR_GOOGLE).toBe('/login?error=google');
  });

  it('la página ya no redirige a /?error= ni arma el mensaje con el parámetro', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(pagina).not.toMatch(/router\.push\('\/\?error=/);
    expect(pagina).not.toContain('`Error: ${errorParam}`');
    expect(pagina).toContain('mensajeErrorGoogle(errorParam)');
    expect(pagina).toContain('router.push(RUTA_ERROR_GOOGLE)');
  });
});
