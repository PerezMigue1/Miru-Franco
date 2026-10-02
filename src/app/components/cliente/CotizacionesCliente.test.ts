import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CotizacionesCargando,
  CotizacionesError,
  CotizacionesVacio,
  ListaCotizaciones,
  formatearFechaEvento,
  formatearMXN,
} from './CotizacionesCliente';
import type { CotizacionApi } from '../../services/cotizaciones';

const base: CotizacionApi = {
  id: 7,
  clienteNombre: '',
  paqueteId: 1,
  paqueteTipoEvento: 'XV años',
  paquetePrecioEspecial: 4500,
  fechaEvento: '2026-11-20T00:00:00.000Z',
  cantidadPersonas: 4,
  monto: 4500,
  anticipo: 1000,
  estado: 'pendiente',
  notas: null,
};

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
/** Texto visible, sin etiquetas ni espacios duros de Intl. */
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/ | /g, ' ').replace(/\s+/g, ' ');

describe('Formato', () => {
  it('moneda MXN y fecha en español de México sin correrse un día', () => {
    expect(formatearMXN(1234.5).replace(/ /g, ' ')).toBe('$1,234.50');
    expect(formatearFechaEvento('2026-11-20T00:00:00.000Z')).toBe('viernes, 20 de noviembre de 2026');
  });
});

describe('Con datos', () => {
  it('cada tarjeta muestra tipo, fecha, personas, estado, monto, anticipo y saldo', () => {
    const t = texto(
      html(
        createElement(ListaCotizaciones, {
          cotizaciones: [
            base,
            { ...base, id: 8, paqueteTipoEvento: 'Boda', estado: 'confirmada', monto: 8900, anticipo: 8900, cantidadPersonas: 1 },
          ],
        }),
      ),
    );

    expect(t).toContain('XV años');
    expect(t).toContain('viernes, 20 de noviembre de 2026');
    expect(t).toContain('4 personas');
    expect(t).toContain('Pendiente');
    expect(t).toMatch(/Monto \$4,500\.00 Anticipo \$1,000\.00 Saldo pendiente \$3,500\.00/);

    expect(t).toContain('Boda');
    expect(t).toContain('1 persona ');
    expect(t).toContain('Confirmada');
    expect(t).toMatch(/Saldo pendiente \$0\.00/);
  });

  it('sin número de personas lo dice, y sin notas no pinta el bloque', () => {
    const t = texto(html(createElement(ListaCotizaciones, { cotizaciones: [{ ...base, cantidadPersonas: null }] })));
    expect(t).toContain('Personas por definir');
    expect(t).not.toContain('Notas del salón');
  });

  it('las notas se muestran como texto escapado, nunca como HTML', () => {
    const h = html(
      createElement(ListaCotizaciones, {
        cotizaciones: [{ ...base, notas: `Peinado "alto" & velo <img src=x onerror=alert(1)>` }],
      }),
    );
    expect(h).toContain('Notas del salón');
    expect(h).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(h).toContain('&amp; velo');
    expect(h).not.toContain('<img');
  });

  it('el estado cancelada usa la insignia de peligro con su texto', () => {
    const h = html(createElement(ListaCotizaciones, { cotizaciones: [{ ...base, estado: 'cancelada' }] }));
    expect(texto(h)).toContain('Cancelada');
    expect(h).toContain('var(--danger-texto)');
  });
});

describe('Otros estados', () => {
  it('cargando: skeleton ocupado y anunciado', () => {
    const h = html(createElement(CotizacionesCargando));
    expect(h).toContain('aria-busy="true"');
    expect(h).toContain('Cargando tus cotizaciones');
    expect(h.match(/mf-skeleton/g)?.length).toBeGreaterThanOrEqual(10);
  });

  it('vacío: mensaje y enlace a /contacto', () => {
    const h = html(createElement(CotizacionesVacio));
    expect(h).toContain('Aún no tienes cotizaciones');
    expect(h).toContain('href="/contacto"');
  });

  it('error: alerta y botón de reintentar', () => {
    const h = html(createElement(CotizacionesError, { onReintentar: () => undefined }));
    expect(h).toContain('role="alert"');
    expect(h).toContain('No pudimos cargar tus cotizaciones');
    expect(texto(h)).toContain('Reintentar');
    expect(h).toContain('<button');
  });
});
