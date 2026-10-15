import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../../services/client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  direccionEntregaRegistrada,
  explicacionCancelarORevocar,
  insigniaDevolucion,
  puedeVerBotonCancelar,
  textoRevocacionEntregado,
} from './detallePedidoCliente';

const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const VENCE = '2026-11-20T05:59:59.999Z';
const ANTES = new Date('2026-11-18T12:00:00-06:00');

describe('"Cancelar pedido" y "Revocar compra" a la vez: una línea explica la diferencia', () => {
  const pagado = { estado: 'pagado' as const, puedeRevocar: true, revocableHasta: VENCE };

  it('"Cancelar pedido" se ve mientras el salón no empezó a preparar el pedido', () => {
    expect(puedeVerBotonCancelar({ estado: 'pendiente_pago' })).toBe(true);
    expect(puedeVerBotonCancelar({ estado: 'pagado' })).toBe(true);
    expect(puedeVerBotonCancelar({ estado: 'preparando' })).toBe(false);
    expect(puedeVerBotonCancelar({ estado: 'entregado' })).toBe(false);
  });

  it('con los dos botones visibles: la explicación breve', () => {
    expect(explicacionCancelarORevocar(pagado, ANTES)).toBe(
      'Las dos te devuelven lo que pagaste. «Cancelar pedido» solo se puede antes de que empecemos a prepararlo; «Revocar compra» es tu derecho por ley durante 5 días hábiles y sigue disponible aunque ya lo hayamos preparado o lo hayas recogido.',
    );
  });

  it('con uno solo de los botones: no hay nada que explicar', () => {
    expect(explicacionCancelarORevocar({ ...pagado, puedeRevocar: false }, ANTES)).toBeNull();
    expect(explicacionCancelarORevocar({ ...pagado, estado: 'entregado' }, ANTES)).toBeNull();
    expect(explicacionCancelarORevocar(pagado, new Date('2026-11-21T00:00:00-06:00'))).toBeNull();
  });

  it('la pantalla usa las mismas reglas que los botones y muestra la línea', () => {
    expect(pagina).toMatch(/\{puedeVerBotonCancelar\(pedido\) && \(/);
    expect(pagina).toMatch(/const explicacionBotones = explicacionCancelarORevocar\(pedido\);/);
    expect(pagina).toMatch(/\{explicacionBotones && \(/);
    expect(pagina).not.toContain('ESTADOS_CANCELABLES');
  });
});

describe('Insignia de una devolución del pedido', () => {
  it('etiqueta legible y color según el estado (aprobada en verde, no en advertencia)', () => {
    expect(insigniaDevolucion('aprobada')).toEqual({ texto: 'Aprobada', variante: 'success' });
    expect(insigniaDevolucion('pendiente')).toEqual({ texto: 'Pendiente', variante: 'warning' });
    expect(insigniaDevolucion('rechazada')).toEqual({ texto: 'Rechazada', variante: 'danger' });
    expect(insigniaDevolucion('cancelada')).toEqual({ texto: 'Cancelada por la clienta', variante: 'default' });
  });

  it('la pantalla ya no pinta el estado crudo con variante fija', () => {
    expect(pagina).not.toMatch(/<Badge variant="warning" size="sm" className="mr-2">\{d\.estado\}<\/Badge>/);
    expect(pagina).toMatch(/insigniaDevolucion\(d\.estado\)/);
  });
});

describe('Pedido revocado después de recogerlo: el encabezado lo dice', () => {
  const revocacion = (estado: string) => ({ id: 3, pedidoId: 9, estado, origen: 'revocacion_art56', monto: 350 });

  it('revocación pendiente: hay que entregar el pedido en el salón para el reembolso', () => {
    expect(textoRevocacionEntregado({ estado: 'entregado' }, [revocacion('pendiente')])).toBe(
      'Revocaste tu compra. Entrega tu pedido en el salón: al recibirlo te reembolsamos $350 por el mismo medio con el que pagaste.',
    );
  });

  it('revocación aprobada: ya se reembolsó', () => {
    expect(textoRevocacionEntregado({ estado: 'entregado' }, [revocacion('aprobada')])).toBe(
      'Revocaste tu compra: recibimos tu pedido y te reembolsamos $350 por el mismo medio con el que pagaste.',
    );
  });

  it('revocación rechazada: lo dice y a quién acudir', () => {
    expect(textoRevocacionEntregado({ estado: 'entregado' }, [revocacion('rechazada')])).toBe(
      'Revocaste tu compra, pero el salón rechazó la revocación. Si tienes dudas, comunícate con el salón.',
    );
  });

  it('sin revocación, con una devolución normal, cancelada, o con el pedido sin recoger: el texto de siempre', () => {
    expect(textoRevocacionEntregado({ estado: 'entregado' }, [])).toBeNull();
    expect(textoRevocacionEntregado({ estado: 'entregado' }, [{ ...revocacion('pendiente'), origen: undefined }])).toBeNull();
    expect(textoRevocacionEntregado({ estado: 'entregado' }, [revocacion('cancelada')])).toBeNull();
    expect(textoRevocacionEntregado({ estado: 'pagado' }, [revocacion('pendiente')])).toBeNull();
  });

  it('la pantalla lo usa antes del texto de recoger', () => {
    expect(pagina).toMatch(/const textoSiguiente = textoRevocacionEntregado\(pedido, devoluciones\) \?\? textoRecoger\(pedido\);/);
  });
});

describe('"Entrega registrada": solo con una dirección real de un pedido anterior', () => {
  it('la nota de recoger en el salón no es una dirección: no se muestra', () => {
    expect(direccionEntregaRegistrada('Recoge en el salón: te avisaremos cuando esté listo')).toBeNull();
    expect(direccionEntregaRegistrada('  recoger en el salon')).toBeNull();
    expect(direccionEntregaRegistrada('')).toBeNull();
    expect(direccionEntregaRegistrada(null)).toBeNull();
  });

  it('una dirección de envío de un pedido anterior sí se muestra como historial', () => {
    expect(direccionEntregaRegistrada('Av. Juárez 120, Col. Centro, Guadalajara, Jal.')).toBe('Av. Juárez 120, Col. Centro, Guadalajara, Jal.');
  });

  it('la pantalla decide con direccionEntregaRegistrada', () => {
    expect(pagina).toMatch(/const direccionAnterior = direccionEntregaRegistrada\(pedido\.direccionTextoCompleta\);/);
    expect(pagina).toMatch(/\{direccionAnterior && \(/);
  });
});

describe('Modal "Revocar compra": párrafos con el color de cuerpo', () => {
  it('los párrafos usan --texto-cuerpo, como los demás diálogos', () => {
    const modal = pagina.slice(pagina.indexOf('textoModalRevocacion(pedido).map'));
    expect(modal.slice(0, 300)).toContain("color: 'var(--texto-cuerpo)'");
  });
});
