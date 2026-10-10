import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * La solicitud de factura del portal: el backend la registra como 'solicitada' y descarta folio, UUID,
 * URLs y monto (los captura caja al timbrar). La pantalla no debe pedir un "folio deseado" que se perdería
 * sin aviso, ni mandarlo en el cuerpo.
 */
const PAGINA = join(__dirname, '..', '(screens)', '(privada)', 'cliente', 'facturas', 'page.tsx');
const fuente = readFileSync(PAGINA, 'utf8');

describe('Portal: solicitar factura', () => {
  it('no muestra el campo de referencia o folio deseado', () => {
    expect(fuente).not.toMatch(/folio deseado/i);
    expect(fuente).not.toMatch(/folioSolicitud/);
  });

  it('crearFactura solo manda tipo, pedido y estado solicitada', () => {
    const llamada = fuente.slice(fuente.indexOf('await crearFactura({'), fuente.indexOf('});', fuente.indexOf('await crearFactura({')));
    expect(llamada).toContain("tipo: 'cfdi'");
    expect(llamada).toContain('pedidoId: pid');
    expect(llamada).toContain("estado: 'solicitada'");
    expect(llamada).not.toMatch(/folio/);
  });
});
