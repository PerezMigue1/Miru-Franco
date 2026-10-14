import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cuerpoSolicitudCodigo, destinoVinculacion, mensajeErrorVinculacion } from './vinculacion';

describe('Página /oauth/alexa', () => {
  // Sin DOM no se puede enviar el formulario: se comprueba que la página use el contrato de arriba.
  const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

  it('manda redirect_uri y state en el POST y redirige solo al destino del backend', () => {
    expect(pagina).toContain('cuerpoSolicitudCodigo(redirectUri, state, clientId)');
    expect(pagina).toContain('destinoVinculacion(codeResult, state)');
    expect(pagina).toContain('mensajeErrorVinculacion(err)');
    expect(pagina).not.toMatch(/\$\{redirectUri\}\?code=/);
  });
});

describe('Vinculación con Alexa: el destino lo decide el backend', () => {
  it('el POST a /api/oauth/code lleva redirect_uri y state (y client_id solo si la URL lo trae)', () => {
    expect(cuerpoSolicitudCodigo('https://layla.amazon.com/api/skill/link/X', 'abc', null)).toEqual({
      redirect_uri: 'https://layla.amazon.com/api/skill/link/X',
      state: 'abc',
    });
    expect(cuerpoSolicitudCodigo('https://layla.amazon.com/api/skill/link/X', 'abc', 'skill-1')).toEqual({
      redirect_uri: 'https://layla.amazon.com/api/skill/link/X',
      state: 'abc',
      client_id: 'skill-1',
    });
  });

  it('redirige a la redirectUri validada que devuelve el backend, con code y state', () => {
    const destino = destinoVinculacion(
      { success: true, code: 'c0d3', redirectUri: 'https://layla.amazon.com/api/skill/link/X' },
      'e s/t',
    );
    expect(destino).toBe('https://layla.amazon.com/api/skill/link/X?code=c0d3&state=e+s%2Ft');
  });

  it('respeta los parámetros que ya traiga la redirectUri del backend', () => {
    const destino = destinoVinculacion(
      { success: true, code: 'c0d3', redirectUri: 'https://pitangui.amazon.com/link?vendor=M1' },
      'abc',
    );
    expect(destino).toBe('https://pitangui.amazon.com/link?vendor=M1&code=c0d3&state=abc');
  });

  it('sin redirectUri del backend no hay destino (nunca se usa la redirect_uri de la URL)', () => {
    expect(destinoVinculacion({ success: true, code: 'c0d3' }, 'abc')).toBeNull();
  });

  it('sin code o sin éxito no hay destino', () => {
    expect(destinoVinculacion({ success: true, redirectUri: 'https://layla.amazon.com/x' }, 'abc')).toBeNull();
    expect(destinoVinculacion({ success: false, code: 'c', redirectUri: 'https://layla.amazon.com/x' }, 'abc')).toBeNull();
  });

  it('una redirectUri que no es http(s) no se usa', () => {
    expect(destinoVinculacion({ success: true, code: 'c', redirectUri: 'javascript:alert(1)' }, 'abc')).toBeNull();
    expect(destinoVinculacion({ success: true, code: 'c', redirectUri: 'no es url' }, 'abc')).toBeNull();
  });

  it('un 400 del backend (redirect_uri o client_id no autorizados) da un mensaje en español', () => {
    const err = Object.assign(new Error('redirect_uri no autorizada'), { status: 400 });
    expect(mensajeErrorVinculacion(err)).toBe(
      'Este enlace de vinculación no es válido. Vuelve a iniciar la vinculación desde la app de Alexa.',
    );
  });

  it('otros errores conservan su mensaje', () => {
    expect(mensajeErrorVinculacion(new Error('Sin conexión'))).toBe('Sin conexión');
    expect(mensajeErrorVinculacion('raro')).toBe('No se pudo iniciar sesión.');
  });
});
