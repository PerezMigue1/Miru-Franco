import { describe, expect, it } from 'vitest';
import {
  citaGestionablePorClienta,
  mensajeErrorCancelarCita,
  tituloConfirmacionCita,
} from './citaGestionable';

const AHORA = new Date('2026-10-14T18:00:00.000Z');
const MANANA = '2026-10-15T18:00:00.000Z';
const AYER = '2026-10-13T18:00:00.000Z';

describe('Reprogramar y cancelar una cita desde el portal', () => {
  it.each(['pendiente', 'confirmada', 'reprogramada'] as const)('una cita %s en el futuro se puede gestionar', (estado) => {
    expect(citaGestionablePorClienta({ estado, fechaHoraInicio: MANANA }, AHORA)).toBe(true);
  });

  it.each(['pendiente', 'confirmada', 'reprogramada'] as const)('una cita %s que ya pasó no se puede gestionar', (estado) => {
    expect(citaGestionablePorClienta({ estado, fechaHoraInicio: AYER }, AHORA)).toBe(false);
  });

  it.each(['cancelada', 'completada', 'en_curso', 'no_asistio'] as const)('una cita %s no se puede gestionar aunque sea futura', (estado) => {
    expect(citaGestionablePorClienta({ estado, fechaHoraInicio: MANANA }, AHORA)).toBe(false);
  });

  it('sin fecha válida no se puede gestionar', () => {
    expect(citaGestionablePorClienta({ estado: 'pendiente', fechaHoraInicio: '' }, AHORA)).toBe(false);
  });
});

describe('Error al cancelar una cita', () => {
  it('no muestra el texto crudo del backend cuando la cita ya no está vigente', () => {
    const err = Object.assign(new Error("No se puede cancelar una cita en estado 'completada'"), {
      status: 400,
      data: { message: "No se puede cancelar una cita en estado 'completada'" },
    });
    expect(mensajeErrorCancelarCita(err)).toBe('Esta cita ya no se puede cancelar.');
  });

  it('un 5xx muestra el texto genérico en español', () => {
    const err = Object.assign(new Error('boom'), { status: 503, data: {} });
    expect(mensajeErrorCancelarCita(err)).toMatch(/no está disponible/);
  });
});

describe('Título de la confirmación de la cita', () => {
  it('dice confirmada solo si la cita está confirmada', () => {
    expect(tituloConfirmacionCita('confirmada')).toBe('¡Cita confirmada!');
  });

  it('una cita pendiente se anuncia como agendada', () => {
    expect(tituloConfirmacionCita('pendiente')).toBe('¡Cita agendada!');
  });
});
