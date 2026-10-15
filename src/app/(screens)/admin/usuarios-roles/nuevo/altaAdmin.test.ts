// Alta de usuario desde admin (propuesta del verificador, integrada y ampliada con la revisión visual).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn(async (_ruta: string, _cuerpo: unknown, _base?: unknown) => ({ data: { id: 'u-1', email: 'a@b.mx' } })) }));
vi.mock('../../../../services/client', () => ({ apiClient: { post, get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const { createUsuario, validarAltaUsuario } = await import('../../../../services/usuarios');
const { default: Input } = await import('../../../../components/ui/Input');
const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

afterEach(() => post.mockClear());

describe('Alta admin: casillas', () => {
  it('la pantalla pasa a la validación el valor real de las casillas (no un true fijo)', () => {
    expect(pagina).toMatch(/validarAltaUsuario\(\{[^}]*\baceptaTerminos,\s*aceptaAviso\s*\}\)/);
  });

  it('ninguna casilla legal empieza marcada y cada obligatoria enlaza su documento', () => {
    expect(pagina).toMatch(/const \[aceptaTerminos, setAceptaTerminos\] = useState\(false\)/);
    expect(pagina).toMatch(/const \[aceptaAviso, setAceptaAviso\] = useState\(false\)/);
    expect(pagina).toMatch(/id="alta-acepta-terminos"[\s\S]{0,500}<EnlaceDocumento href=\{documentoLegal\('terminos'\)\.ruta\}[^>]*>/);
    expect(pagina).toMatch(/id="alta-acepta-aviso"[\s\S]{0,500}<EnlaceDocumento href=\{documentoLegal\('aviso-privacidad'\)\.ruta\}[^>]*>/);
  });

  it('el mensaje de cada casilla se calcula antes de validar y se pinta junto a ella', () => {
    expect(pagina).toMatch(/setErroresCasillas\(erroresConsentimientoAlta\(\{ aceptaTerminos, aceptaAviso \}\)\);[\s\S]{0,40}const errorValidacion = validarAltaUsuario/);
    expect(pagina).toMatch(/id="alta-acepta-terminos"[\s\S]{0,400}error=\{erroresCasillas\.aceptaTerminos\}/);
    expect(pagina).toMatch(/id="alta-acepta-aviso"[\s\S]{0,400}error=\{erroresCasillas\.aceptaAviso\}/);
  });

  it('promociones: el personal no puede activarlas (casilla deshabilitada, con nota) y el alta nunca manda true', () => {
    expect(pagina).toMatch(/id="alta-recibe-promociones"[\s\S]{0,120}checked=\{false\}[\s\S]{0,40}disabled/);
    expect(pagina).toContain('{NOTA_PROMOCIONES_PANEL}');
    expect(pagina).not.toMatch(/recibePromociones:\s*(true|recibePromo)/);
    expect(pagina).not.toContain('setRecibePromo');
  });
});

describe('Alta admin: campos marcados (revisión visual)', () => {
  it('Nombre, email, contraseña y teléfono muestran su error junto al campo', () => {
    expect(pagina).toMatch(/label="Nombre completo \*"[\s\S]{0,400}error=\{erroresCampos\.nombre\}/);
    expect(pagina).toMatch(/label="Email \*"[\s\S]{0,400}error=\{erroresCampos\.email \?\?/);
    expect(pagina).toMatch(/label="Contraseña \*"[\s\S]{0,400}error=\{erroresCampos\.password\}/);
    expect(pagina).toMatch(/label="Teléfono \*"[\s\S]{0,400}error=\{erroresCampos\.telefono\}/);
    expect(pagina).toMatch(/const faltanCampos = erroresCamposAlta\(\{[^}]*\}\);\s*setErroresCampos\(faltanCampos\);/);
  });

  it('con error, el campo queda inválido y ligado a su mensaje (aria-invalid y aria-describedby)', () => {
    const html = renderToStaticMarkup(createElement(Input, { id: 'alta-nombre', label: 'Nombre completo *', error: 'Escribe el nombre completo.' }));
    expect(html).toMatch(/<input[^>]*aria-invalid="true"[^>]*aria-describedby="alta-nombre-ayuda"/);
    expect(html).toContain('id="alta-nombre-ayuda" role="alert"');
  });

  it('las casillas del formulario usan la misma casilla de 44 px (sin checkbox nativo suelto de 13 px)', () => {
    expect(pagina).not.toMatch(/<input type="checkbox"/);
    expect(pagina).toMatch(/<CasillaDocumento\s+id="alta-tiene-alergias"/);
    expect(pagina).toMatch(/<CasillaDocumento\s+id="alta-tratamientos"/);
  });

  it('en móvil los enlaces de las casillas tienen objetivo de 44 px', () => {
    const enlaces = pagina.match(/<EnlaceDocumento[^>]*>/g) ?? [];
    expect(enlaces.length).toBeGreaterThanOrEqual(2);
    for (const e of enlaces) expect(e).toContain('className={enlaceCasilla}');
    expect(pagina).toMatch(/const enlaceCasilla = '[^']*max-sm:min-h-11[^']*'/);
  });
});

describe('Alta admin: minimización y datos de salud (punto 26)', () => {
  const ALTA = {
    nombre: 'Ana López', email: 'ana@correo.mx', password: 'Miru#Fr4nco!', telefono: '7710000000',
    fechaNacimiento: '', pregunta: '', respuesta: '', tipoCabello: '', aceptaTerminos: true, aceptaAviso: true,
  };

  it('sin fecha de nacimiento ni tipo de cabello el alta es válida (el DTO ya los hace opcionales)', () => {
    expect(validarAltaUsuario(ALTA)).toBeNull();
  });

  it('las alergias capturadas viajan aunque no se elija tipo de cabello (y no se manda tipoCabello vacío)', async () => {
    await createUsuario({
      nombre: 'Ana', email: 'ana@correo.mx', password: 'Miru#Fr4nco!', telefono: '7710000000',
      perfilCapilar: { tipoCabello: '', tieneAlergias: true, alergias: 'Látex', tratamientosQuimicos: false },
      aceptaTerminos: true, aceptaAvisoPrivacidad: true, consienteDatosSensibles: true,
    });
    const cuerpo = post.mock.calls[0][1] as { perfilCapilar?: Record<string, unknown> };
    expect(cuerpo.perfilCapilar).toMatchObject({ tieneAlergias: true, alergias: 'Látex' });
    expect(cuerpo.perfilCapilar).not.toHaveProperty('tipoCabello', '');
  });

  it('fecha de nacimiento y tipo de cabello dicen "(opcional)" y no son obligatorios', () => {
    expect(pagina).toMatch(/<Input label="Fecha de nacimiento \(opcional\)"[^/]*\/>/);
    expect(pagina).not.toMatch(/<Input label="Fecha de nacimiento[^/]*required/);
    expect(pagina).toMatch(/label="Tipo de cabello \(opcional\)"/);
    expect(pagina).not.toMatch(/label="Tipo de cabello[^"]*"[\s\S]{0,200}required/);
  });

  it('el perfil capilar se arma solo con lo capturado y la casilla de salud sale cuando hay alergias escritas', () => {
    expect(pagina).toContain('perfilCapilar: perfilCapilarAlta({');
    expect(pagina).toMatch(/\{requiereConsentimiento\(alergiasEnviadas\) && \(\s*<CasillaDatosSalud\s+quien="personal"/);
    expect(pagina).toContain('...(requiereConsentimiento(alergiasEnviadas) ? { consienteDatosSensibles: true } : {})');
  });
});

describe('Alta desde admin: foco en la casilla de salud', () => {
  it('si falta el consentimiento de datos de salud, lleva el foco a su casilla (como las otras 3 pantallas)', () => {
    expect(pagina).toMatch(
      /if \(faltaConsentimiento\) \{\s*document\.getElementById\('alta-consiente-salud'\)\?\.focus\(\);\s*return;\s*\}/,
    );
  });
});
