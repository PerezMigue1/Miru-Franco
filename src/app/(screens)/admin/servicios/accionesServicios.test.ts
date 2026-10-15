import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as acciones from './accionesServicios';
import { CLASE_BOTON_CABECERA } from './accionesServicios';

const lista = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const detalle = readFileSync(join(__dirname, '[id]', 'page.tsx'), 'utf8');

/** Etiquetas de apertura <Button ...> cuyo contenido incluye `texto`. */
function botonesCon(fuente: string, texto: string): string[] {
  return [...fuente.matchAll(/<Button\b([^>]|=>)*?>([\s\S]*?)<\/Button>/g)]
    .filter((m) => m[0].includes(texto))
    .map((m) => m[0]);
}

describe('Admin servicios: "Desactivar" no se confunde con el botón principal', () => {
  it('no repite a mano el estilo de contorno de peligro: usa la variante del sistema', () => {
    expect('ESTILO_DESACTIVAR' in acciones).toBe(false);
  });

  it('en cada tarjeta y en el detalle, "Desactivar" es variant="outline-danger" sin estilo en línea', () => {
    const tarjeta = botonesCon(lista, '>Desactivar<').find((b) => b.includes('setServicioToDelete'));
    expect(tarjeta).toBeDefined();
    expect(tarjeta).toMatch(/variant="outline-danger"/);
    expect(tarjeta).not.toContain('style=');
    const cabecera = botonesCon(detalle, 'Desactivar').find((b) => b.includes('setShowDeleteModal(true)'));
    expect(cabecera).toBeDefined();
    expect(cabecera).toMatch(/variant="outline-danger"/);
    expect(cabecera).not.toContain('style=');
  });

  it('el botón del modal que confirma sí sigue en rojo lleno', () => {
    expect(botonesCon(lista, 'handleConfirmarEliminar')[0]).toMatch(/variant="danger"/);
    expect(botonesCon(detalle, 'handleEliminar')[0]).toMatch(/variant="danger"/);
  });
});

describe('Admin servicios: cabecera', () => {
  it('"Ver Paquetes" es un Button del sistema, sin estilo en línea de enlace azul', () => {
    const verPaquetes = botonesCon(lista, 'Ver Paquetes')[0];
    expect(verPaquetes).toMatch(/variant="outline"/);
    expect(verPaquetes).not.toContain('texto-enlace-sobre-calido');
    expect(verPaquetes).not.toMatch(/style=\{\{/);
  });

  it('en móvil los botones de la cabecera ocupan todo el ancho (w-full por debajo de 640 px)', () => {
    expect(CLASE_BOTON_CABECERA).toBe('w-full sm:w-auto');
    for (const texto of ['Ver Paquetes', '+ Crear Paquete', '+ Nuevo Servicio']) {
      expect(botonesCon(lista, texto)[0], texto).toContain('className={CLASE_BOTON_CABECERA}');
    }
    for (const texto of ['Cancelar', 'Guardar cambios']) {
      const boton = botonesCon(detalle, texto).find((b) => !b.includes('setShowDeleteModal(false)'));
      expect(boton, texto).toContain('className={CLASE_BOTON_CABECERA}');
    }
  });
});
