import { describe, expect, it } from 'vitest';
import {
  FORM_PROMOCION_VACIO,
  cuerpoPerfil,
  cuerpoPregunta,
  cuerpoPromocion,
  estadoPromocion,
  formPromocionDesde,
  validarPerfil,
  validarPregunta,
  validarPromocion,
} from './logicaContenido';

describe('Promociones', () => {
  it('título y descripción obligatorios; enlace interno; desde <= hasta; imagen de Cloudinary', () => {
    expect(validarPromocion({ ...FORM_PROMOCION_VACIO })).toEqual({
      titulo: 'Escribe el título.',
      descripcion: 'Escribe la descripción.',
    });
    const base = { ...FORM_PROMOCION_VACIO, titulo: 'Martes', descripcion: 'x' };
    expect(validarPromocion(base)).toEqual({});
    expect(validarPromocion({ ...base, enlace: 'https://otro.sitio' }).enlace).toMatch(/empiece con "\/"/);
    expect(validarPromocion({ ...base, enlace: '//otro.sitio' }).enlace).toBeDefined();
    expect(validarPromocion({ ...base, enlace: '/cliente/tienda-online' }).enlace).toBeUndefined();
    expect(validarPromocion({ ...base, vigenteDesde: '2026-11-02', vigenteHasta: '2026-11-01' }).vigenteHasta).toMatch(/fecha de inicio/);
    expect(validarPromocion({ ...base, imagenUrl: 'https://example.com/a.jpg' }).imagenUrl).toMatch(/Cloudinary/);
    expect(validarPromocion({ ...base, titulo: 'a'.repeat(121) }).titulo).toMatch(/120/);
  });

  it('el cuerpo manda null en lo vacío para borrarlo', () => {
    expect(cuerpoPromocion({ ...FORM_PROMOCION_VACIO, titulo: ' Martes ', descripcion: ' 15% ', activa: true })).toEqual({
      titulo: 'Martes',
      descripcion: '15%',
      imagenUrl: null,
      enlace: null,
      vigenteDesde: null,
      vigenteHasta: null,
      activa: true,
      destacada: false,
    });
  });

  it('formulario desde una promoción guardada', () => {
    const p = { id: 1, titulo: 'T', descripcion: 'D', imagenUrl: null, enlace: '/x', vigenteDesde: '2026-10-01', vigenteHasta: null, activa: true, destacada: false, orden: 0 };
    expect(formPromocionDesde(p)).toEqual({ titulo: 'T', descripcion: 'D', imagenUrl: '', enlace: '/x', vigenteDesde: '2026-10-01', vigenteHasta: '', activa: true, destacada: false });
  });

  it('estado según hoy en México: oculta, programada, vencida o publicada', () => {
    const p = { activa: true, vigenteDesde: '2026-10-10', vigenteHasta: '2026-10-20' };
    expect(estadoPromocion({ ...p, activa: false }, '2026-10-15')).toBe('oculta');
    expect(estadoPromocion(p, '2026-10-09')).toBe('programada');
    expect(estadoPromocion(p, '2026-10-21')).toBe('vencida');
    expect(estadoPromocion(p, '2026-10-20')).toBe('publicada');
    expect(estadoPromocion({ activa: true, vigenteDesde: null, vigenteHasta: null }, '2026-10-20')).toBe('publicada');
  });
});

describe('Preguntas frecuentes', () => {
  it('pregunta y respuesta obligatorias con su largo máximo', () => {
    expect(validarPregunta({ pregunta: '', respuesta: '', visible: true })).toEqual({ pregunta: 'Escribe la pregunta.', respuesta: 'Escribe la respuesta.' });
    expect(validarPregunta({ pregunta: 'a'.repeat(201), respuesta: 'b', visible: true }).pregunta).toMatch(/200/);
    expect(cuerpoPregunta({ pregunta: ' ¿Hay estacionamiento? ', respuesta: ' No. ', visible: false })).toEqual({ pregunta: '¿Hay estacionamiento?', respuesta: 'No.', visible: false });
  });
});

describe('Equipo', () => {
  it('presentación de hasta 600 y foto de Cloudinary', () => {
    expect(validarPerfil({ mostrarEnSitio: true, fotoPublica: '', bioPublica: 'a'.repeat(601) }).bioPublica).toMatch(/600/);
    expect(validarPerfil({ mostrarEnSitio: true, fotoPublica: 'http://x/y.jpg', bioPublica: '' }).fotoPublica).toMatch(/Cloudinary/);
    expect(validarPerfil({ mostrarEnSitio: true, fotoPublica: 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg', bioPublica: 'Hola' })).toEqual({});
    expect(cuerpoPerfil({ mostrarEnSitio: true, fotoPublica: ' ', bioPublica: ' Hola ' })).toEqual({ mostrarEnSitio: true, fotoPublica: null, bioPublica: 'Hola' });
  });
});
