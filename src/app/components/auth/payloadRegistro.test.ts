import { describe, expect, it } from 'vitest';
import { documentoLegal } from '../../utils/documentosLegales';
import { construirPayloadRegistro, type ValoresRegistro } from './payloadRegistro';

/** Solo lo obligatorio: cuenta, teléfono, pregunta de seguridad y las dos casillas obligatorias. */
const MINIMO: ValoresRegistro = {
  name: 'Ana López',
  email: ' Ana@Correo.MX ',
  phone: '771 000 0000',
  password: 'Miru#Fr4nco!',
  birthDate: '',
  securityAnswer: 'Firulais',
  hairType: '',
  colorNatural: '',
  colorActual: '',
  productosUsados: '',
  hasAllergies: '',
  allergies: '',
  consienteDatosSensibles: false,
  hasChemicalTreatments: '',
  chemicalTreatments: '',
  aceptaTerminos: true,
  aceptaAvisoPrivacidad: true,
  recibePromociones: false,
};

const documentosVigentes = () =>
  (['terminos', 'aviso-privacidad'] as const).map((slug) => {
    const { version, hash } = documentoLegal(slug);
    return { slug, version, hash };
  });

describe('Payload del registro con correo', () => {
  it('lleva las tres casillas, los documentos aceptados (versión y hash vigentes) y la ruta de origen', () => {
    const payload = construirPayloadRegistro({ ...MINIMO, recibePromociones: true }, '¿Nombre de tu mascota?', '/register');
    expect(payload).toMatchObject({
      aceptaTerminos: true,
      aceptaAvisoPrivacidad: true,
      recibePromociones: true,
      documentos: documentosVigentes(),
      rutaOrigen: '/register',
    });
  });

  it('promociones sin marcar viaja como false (no se presume el sí)', () => {
    expect(construirPayloadRegistro(MINIMO, 'P', '/register').recibePromociones).toBe(false);
  });

  it('minimización: sin fecha de nacimiento ni perfil capilar no los manda', () => {
    const payload = construirPayloadRegistro(MINIMO, 'P', '/register');
    expect(payload).not.toHaveProperty('fechaNacimiento');
    expect(payload).not.toHaveProperty('perfilCapilar');
    expect(payload).not.toHaveProperty('consienteDatosSensibles');
  });

  it('el teléfono sigue yendo, normalizado a 10 dígitos', () => {
    expect(construirPayloadRegistro(MINIMO, 'P', '/register').telefono).toBe('7710000000');
  });

  it('no inventa el tipo de cabello: sin elegirlo no manda "liso"', () => {
    const payload = construirPayloadRegistro({ ...MINIMO, colorNatural: 'Castaño' }, 'P', '/register');
    expect(payload.perfilCapilar).toEqual({ colorNatural: 'Castaño' });
  });

  it('con datos capturados manda la fecha y el perfil capilar como hoy (lacio se guarda como liso)', () => {
    const payload = construirPayloadRegistro(
      { ...MINIMO, birthDate: '1995-05-10', hairType: 'lacio', hasAllergies: 'no', hasChemicalTreatments: 'yes', chemicalTreatments: 'Keratina' },
      'P',
      '/register',
    );
    expect(payload.fechaNacimiento).toBe('1995-05-10');
    expect(payload.perfilCapilar).toEqual({ tipoCabello: 'liso', tieneAlergias: false, tratamientosQuimicos: true, tratamientos: 'Keratina' });
  });

  it('con alergias manda el consentimiento de datos de salud', () => {
    const payload = construirPayloadRegistro(
      { ...MINIMO, hasAllergies: 'yes', allergies: 'Amoniaco', consienteDatosSensibles: true },
      'P',
      '/register',
    );
    expect(payload.perfilCapilar).toEqual({ tieneAlergias: true, alergias: 'Amoniaco' });
    expect(payload.consienteDatosSensibles).toBe(true);
  });

  it('cuenta, correo y pregunta de seguridad salen igual que antes', () => {
    const payload = construirPayloadRegistro(MINIMO, '¿Nombre de tu mascota?', '/register');
    expect(payload).toMatchObject({
      nombre: 'Ana López',
      email: 'ana@correo.mx',
      password: 'Miru#Fr4nco!',
      preguntaSeguridad: { pregunta: '¿Nombre de tu mascota?', respuesta: 'Firulais' },
    });
  });
});
