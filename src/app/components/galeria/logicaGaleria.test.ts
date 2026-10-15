import { describe, expect, it } from 'vitest';
import type { FotoPanel } from '../../services/galeria';
import {
  MENSAJE_ELEGIR_PERSONAS,
  MENSAJE_ILUSTRATIVA,
  cuerpoFoto,
  errorTextoAlternativo,
  estadoDeFoto,
  explicacionPublicar,
  filtrarFotos,
  formularioDesdeFoto,
  FORMULARIO_VACIO,
  moverFoto,
  puedeGestionarGaleria,
} from './logicaGaleria';

const foto = (cambios: Partial<FotoPanel> = {}): FotoPanel => ({
  id: 1,
  url: 'https://res.cloudinary.com/demo/image/upload/galeria/a.jpg',
  alt: 'Corte',
  orden: 0,
  visible: false,
  ilustrativa: false,
  sinPersonasIdentificables: true,
  revisada: true,
  publicable: true,
  servicio: null,
  consentimiento: null,
  subidoPor: null,
  creadoEn: '2026-10-01T00:00:00.000Z',
  ...cambios,
});

describe('Permisos de la galería', () => {
  it('gestiona quien tiene galeria:gestionar o el comodín; la becaria (galeria:lectura) solo ve', () => {
    expect(puedeGestionarGaleria(['galeria:gestionar'])).toBe(true);
    expect(puedeGestionarGaleria(['*'])).toBe(true);
    expect(puedeGestionarGaleria(['galeria:lectura'])).toBe(false);
    expect(puedeGestionarGaleria([])).toBe(false);
  });
});

describe('Estado y filtros', () => {
  it('estado de cada foto: sin revisar manda sobre lo demás; luego ilustrativa, visible u oculta', () => {
    expect(estadoDeFoto(foto({ revisada: false, visible: true }))).toBe('sin_revisar');
    expect(estadoDeFoto(foto({ ilustrativa: true }))).toBe('ilustrativa');
    expect(estadoDeFoto(foto({ visible: true }))).toBe('visible');
    expect(estadoDeFoto(foto())).toBe('oculta');
  });

  it('filtra por servicio y por estado', () => {
    const fotos = [
      foto({ id: 1, visible: true, servicio: { id: 3, nombre: 'Corte', categoria: 'Cabello', activo: true } }),
      foto({ id: 2, revisada: false, sinPersonasIdentificables: null }),
      foto({ id: 3, ilustrativa: true }),
      foto({ id: 4 }),
    ];
    const ids = (f: Parameters<typeof filtrarFotos>[1]) => filtrarFotos(fotos, f).map((x) => x.id);
    expect(ids({ servicioId: '', estado: 'todas' })).toEqual([1, 2, 3, 4]);
    expect(ids({ servicioId: '3', estado: 'todas' })).toEqual([1]);
    expect(ids({ servicioId: 'ninguno', estado: 'todas' })).toEqual([2, 3, 4]);
    expect(ids({ servicioId: '', estado: 'visible' })).toEqual([1]);
    expect(ids({ servicioId: '', estado: 'oculta' })).toEqual([2, 3, 4]);
    expect(ids({ servicioId: '', estado: 'ilustrativa' })).toEqual([3]);
    expect(ids({ servicioId: '', estado: 'sin_revisar' })).toEqual([2]);
  });
});

describe('Reordenar con subir y bajar', () => {
  it('intercambia con la vecina dentro de lo que se ve (filtro aplicado) y devuelve la lista completa', () => {
    expect(moverFoto([1, 2, 3, 4], 3, -1)).toEqual([1, 3, 2, 4]);
    expect(moverFoto([1, 2, 3, 4], 3, 1)).toEqual([1, 2, 4, 3]);
    // Con filtro: solo se ven 1 y 4; bajar la 1 la pone después de la 4
    expect(moverFoto([1, 2, 3, 4], 1, 1, [1, 4])).toEqual([4, 2, 3, 1]);
  });

  it('en los extremos no cambia nada', () => {
    expect(moverFoto([1, 2], 1, -1)).toBeNull();
    expect(moverFoto([1, 2], 2, 1)).toBeNull();
  });
});

describe('Formulario por foto', () => {
  it('texto alternativo obligatorio de hasta 200 caracteres', () => {
    expect(errorTextoAlternativo('  ')).toMatch(/obligatorio/);
    expect(errorTextoAlternativo('a'.repeat(201))).toMatch(/200/);
    expect(errorTextoAlternativo('Corte bob')).toBeNull();
  });

  it('no se puede publicar sin elegir si aparece una clienta (con su autorización) o nadie identificable', () => {
    expect(explicacionPublicar({ ...FORMULARIO_VACIO })).toBe(MENSAJE_ELEGIR_PERSONAS);
    expect(explicacionPublicar({ ...FORMULARIO_VACIO, personas: 'clienta' })).toMatch(/autorización/);
    expect(explicacionPublicar({ ...FORMULARIO_VACIO, personas: 'clienta', autorizacion: { consentimientoId: '4', nombre: 'Ana', fecha: '' } })).toBeNull();
    expect(explicacionPublicar({ ...FORMULARIO_VACIO, personas: 'ninguna' })).toBeNull();
    expect(explicacionPublicar({ ...FORMULARIO_VACIO, personas: 'ninguna', ilustrativa: true })).toBe(MENSAJE_ILUSTRATIVA);
  });

  it('una foto anterior ya publicada sin revisar puede seguir publicada mientras no se revise', () => {
    const form = formularioDesdeFoto(foto({ visible: true, sinPersonasIdentificables: null, revisada: false }));
    expect(form.personas).toBeNull();
    expect(explicacionPublicar(form, { yaPublicadaSinRevisar: true })).toBeNull();
  });

  it('el cuerpo manda la declaración o la autorización elegida, nunca las dos', () => {
    const base = { ...FORMULARIO_VACIO, alt: ' Bob corto ', servicioId: '3', orden: '2', visible: true };
    expect(cuerpoFoto({ ...base, personas: 'ninguna' })).toEqual({ alt: 'Bob corto', servicioId: 3, orden: 2, visible: true, ilustrativa: false, sinPersonasIdentificables: true });
    expect(cuerpoFoto({ ...base, personas: 'clienta', autorizacion: { consentimientoId: '4', nombre: 'Ana', fecha: '' } })).toEqual({
      alt: 'Bob corto',
      servicioId: 3,
      orden: 2,
      visible: true,
      ilustrativa: false,
      consentimientoId: '4',
    });
    expect(cuerpoFoto({ ...base, personas: 'clienta', visible: false })).toMatchObject({ sinPersonasIdentificables: false, consentimientoId: null, visible: false });
    expect(cuerpoFoto({ ...base, servicioId: '', personas: null, visible: false })).toEqual({ alt: 'Bob corto', servicioId: null, orden: 2, visible: false, ilustrativa: false });
  });

  it('una autorización revocada no se precarga: hay que elegir otra (o declarar que no aparece nadie)', () => {
    const f = foto({ sinPersonasIdentificables: false, consentimiento: { id: '2', nombre: 'Bea', fecha: '2026-10-01T00:00:00.000Z', vigente: false } });
    const form = formularioDesdeFoto(f);
    expect(form).toMatchObject({ personas: 'clienta', autorizacion: null });
    expect(explicacionPublicar(form)).toMatch(/autorización/);
  });

  it('formulario desde una foto guardada', () => {
    const f = foto({
      alt: 'Recogido',
      orden: 4,
      visible: true,
      sinPersonasIdentificables: false,
      servicio: { id: 5, nombre: 'Peinado', categoria: 'Peinados', activo: true },
      consentimiento: { id: '9', nombre: 'Ana López', fecha: '2026-10-01T00:00:00.000Z', vigente: true },
    });
    expect(formularioDesdeFoto(f)).toEqual({
      alt: 'Recogido',
      servicioId: '5',
      orden: '4',
      visible: true,
      ilustrativa: false,
      personas: 'clienta',
      autorizacion: { consentimientoId: '9', nombre: 'Ana López', fecha: '2026-10-01T00:00:00.000Z' },
    });
  });
});
