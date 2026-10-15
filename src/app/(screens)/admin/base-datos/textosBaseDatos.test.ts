import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Revisión de los textos y la accesibilidad básica del Gestor de Base de Datos sobre el código
 * fuente (el entorno de pruebas no tiene DOM).
 */
const dir = join(process.cwd(), 'src', 'app', '(screens)', 'admin', 'base-datos');
const principal = readFileSync(join(dir, 'page.tsx'), 'utf-8');
const backup = readFileSync(join(dir, 'backup', 'page.tsx'), 'utf-8');

describe('Gestor de base de datos: textos para el usuario', () => {
  it('sin palabras sin acento ni nombres de variables internas', () => {
    for (const texto of ['Gestion de Backups', 'Automatizacion', 'todavia', 'ultimos']) {
      expect(backup, texto).not.toContain(texto);
    }
    // Textos visibles (las claves internas Critico/Atencion del estado no se muestran).
    for (const texto of ['/>Critico:', '/>Atencion:', 'indice(s)', 'alertas criticas', 'DATABASE_URL']) {
      expect(principal, texto).not.toContain(texto);
    }
  });

  it('el monitoreo no promete actualizar cada 10 s', () => {
    expect(principal).not.toContain('cada 10s');
  });

  it('el backup automático avisa que solo funciona con la pestaña abierta', () => {
    expect(backup).toContain('Solo funciona mientras esta pestaña está abierta');
  });
});

describe('Gestor de base de datos: accesibilidad básica', () => {
  it('la página de backup tiene h1', () => {
    expect(backup).toMatch(/<h1[\s>]/);
  });

  it('los botones de cerrar el menú tienen aria-label', () => {
    expect(principal).toMatch(/aria-label="Cerrar" onClick=\{\(\) => setMenuLateralOculto\(true\)\}/);
    expect(backup).toMatch(/aria-label="Cerrar"\s+onClick=\{\(\) => setMenuLateralOculto\(true\)\}/);
  });

  it('no hay div con role="button" (el diagrama es un botón real)', () => {
    expect(principal).not.toContain('role="button"');
  });

  it('el acceso a Inventario dice "Desactivar productos" (ya no se eliminan)', () => {
    expect(principal).toContain("{ label: 'Inventario', href: '/admin/inventario', description: 'Desactivar productos' }");
    expect(principal).not.toContain('Eliminar productos');
    // Los servicios tampoco se eliminan: se desactivan (admin/servicios/[id], modal "Desactivar servicio").
    expect(principal).toContain("{ label: 'Servicios', href: '/admin/servicios', description: 'Desactivar servicios' }");
  });

  it('si falla "Cargar tablas de la BD", el error se ve en Importación, Exportación y Truncate', () => {
    // Las tres vistas usan el mismo bloque: el botón y, debajo, el error de la carga con role alert.
    expect(principal.match(/\{bloqueCargarTablas\}/g)).toHaveLength(3);
    expect(principal).toMatch(/const bloqueCargarTablas = \([\s\S]*?Cargar tablas de la BD[\s\S]*?\{errorCargaTablas && \(\s*<p role="alert"/);
    const cargar = principal.slice(principal.indexOf('const cargarTablasDirectas = async'), principal.indexOf('const escapeSqlValue'));
    expect(cargar).toMatch(/setErrorCargaTablas\(resTablas\.error\)/);
    expect(cargar).toMatch(/setErrorCargaTablas\(null\)/);
  });

  it('sin sangría doble: ni el relleno extra del contenedor ni pl-11 para el botón del menú', () => {
    for (const [nombre, fuente] of [['principal', principal], ['backup', backup]] as const) {
      expect(fuente, nombre).not.toContain('px-4 md:px-8 lg:px-12');
      expect(fuente, nombre).not.toMatch(/relative pl-11/);
      expect(fuente, nombre).not.toMatch(/relative[^"]*overflow-hidden/);
    }
    // El campo de archivo y los selects no se salen del ancho en móvil.
    expect(principal).toMatch(/aria-label="Archivo a importar \(CSV o JSON\)"[\s\S]{0,200}className="mf-campo w-full min-w-0 max-w-full/);
  });

  it('el menú de secciones abre y cierra solo con clic o toque (no al pasar el mouse)', () => {
    for (const [nombre, fuente] of [['principal', principal], ['backup', backup]] as const) {
      expect(fuente, nombre).not.toMatch(/onMouseEnter=\{\(\) => setMenuLateralOculto/);
      expect(fuente, nombre).not.toMatch(/onMouseLeave=\{\(\) => setMenuLateralOculto/);
      expect(fuente, nombre).toMatch(/onClick=\{\(\) => setMenuLateralOculto\(\(v\) => !v\)\}/);
    }
  });

  it('objetivos de 44 px: botón del menú, cerrar, pestañas, opciones del menú y casillas del truncate', () => {
    for (const [nombre, fuente] of [['principal', principal], ['backup', backup]] as const) {
      const disparador = fuente.match(/aria-label="Mostrar menú de secciones"[\s\S]*?className="([^"]*)"/)![1];
      expect(disparador, nombre).toMatch(/\bh-11\b/);
      expect(disparador, nombre).toMatch(/\bw-11\b/);
      const cerrar = fuente.match(/aria-label="Cerrar"\s+onClick=\{\(\) => setMenuLateralOculto\(true\)\}\s+className="([^"]*)"/)![1];
      expect(cerrar, nombre).toMatch(/\bh-11\b/);
      expect(cerrar, nombre).toMatch(/\bw-11\b/);
    }
    // Pestañas Importación / Exportación / Truncate y opciones del menú lateral.
    expect(principal).toMatch(/onClick=\{\(\) => navegarVistaOperaciones\(item\.id\)\}\s+className="[^"]*\bmin-h-11\b/);
    expect(principal.match(/className="w-full text-left rounded px-3 py-2 text-sm min-h-11"/g)).toHaveLength(2);
    for (const casilla of ['RESTART IDENTITY', 'CASCADE']) {
      const etiqueta = principal.match(new RegExp(`<label className="([^"]*)"[^\\n]*\\n\\s*<input type="checkbox"[^\\n]*\\n\\s*${casilla}`));
      expect(etiqueta, casilla).not.toBeNull();
      expect(etiqueta![1], casilla).toMatch(/\bmin-h-11\b/);
    }
  });

  it('RESTART IDENTITY sin marcar al entrar y la confirmación con un placeholder que no es el texto a escribir', () => {
    expect(principal).toContain('useState<boolean>(OPCIONES_TRUNCATE_INICIALES.restartIdentity)');
    expect(principal).toContain('useState<boolean>(OPCIONES_TRUNCATE_INICIALES.cascade)');
    const campo = principal.match(/aria-label="Confirmación del TRUNCATE"[\s\S]*?placeholder=\{([^}]*)\}/)![1];
    expect(campo).toBe('PLACEHOLDER_CONFIRMACION');
  });

  it('la confirmación del TRUNCATE, el archivo a importar y la hora del backup tienen etiqueta', () => {
    expect(principal).toContain('aria-label="Confirmación del TRUNCATE"');
    expect(principal).toContain('aria-label="Archivo a importar (CSV o JSON)"');
    expect(backup).toContain('aria-label="Hora"');
    expect(backup).toContain('aria-label="Minuto"');
  });
});
