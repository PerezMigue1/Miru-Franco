import { describe, expect, it } from 'vitest';
import { etiquetaEstadoEnvio, etiquetaEstadoFactura, etiquetaTipoNotificacion } from './estados';

describe('etiquetaTipoNotificacion: el portal nunca muestra la clave interna', () => {
  it.each([
    ['pedido_creado', 'Pedido'],
    ['pedido_cancelado_pagado', 'Pedido'],
    ['pedido_recordatorio_recoger', 'Pedido'],
    ['cita_recordatorio', 'Cita'],
    ['cita_reprogramada', 'Cita'],
    ['venta', 'Compra en salón'],
    ['pago_revision', 'Pago'],
  ])('%s se muestra como "%s"', (tipo, etiqueta) => {
    expect(etiquetaTipoNotificacion(tipo)).toBe(etiqueta);
  });

  it('un tipo desconocido o vacío se muestra como "Aviso", sin guiones bajos', () => {
    expect(etiquetaTipoNotificacion('algo_nuevo')).toBe('Aviso');
    expect(etiquetaTipoNotificacion(undefined)).toBe('Aviso');
  });
});

describe('etiquetaEstadoFactura', () => {
  it.each([
    ['solicitada', 'Solicitada'],
    ['timbrada', 'Timbrada'],
    ['emitida', 'Emitida'],
    ['cancelada', 'Cancelada'],
  ])('%s se muestra como "%s"', (estado, etiqueta) => {
    expect(etiquetaEstadoFactura(estado)).toBe(etiqueta);
  });

  it('sin estado muestra una raya', () => {
    expect(etiquetaEstadoFactura(null)).toBe('—');
  });
});

describe('etiquetaEstadoEnvio (EstadoEnvio del backend)', () => {
  it.each([
    ['preparando', 'En preparación'],
    ['en_transito', 'En tránsito'],
    ['entregado', 'Entregado'],
    ['fallido', 'No se pudo entregar'],
  ])('%s se muestra como "%s"', (estado, etiqueta) => {
    expect(etiquetaEstadoEnvio(estado)).toBe(etiqueta);
  });
});
