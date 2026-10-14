import { describe, expect, it } from 'vitest';
import { textoTotalNotificaciones } from './textoNotificaciones';

describe('Notificaciones del admin: el encabezado dice lo que se lista', () => {
  it('plural correcto, sin "notificaciónes"', () => {
    expect(textoTotalNotificaciones(0)).toBe('0 notificaciones tuyas');
    expect(textoTotalNotificaciones(1)).toBe('1 notificación tuya');
    expect(textoTotalNotificaciones(7)).toBe('7 notificaciones tuyas');
  });

  it('no dice "en el sistema": el backend solo devuelve las de la propia cuenta', () => {
    expect(textoTotalNotificaciones(3)).not.toMatch(/sistema/);
  });
});
