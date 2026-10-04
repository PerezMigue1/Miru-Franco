import { describe, expect, it } from 'vitest';
import type { PerfilUsuarioCompleto } from '../services/perfil';
import {
  VALORES_PERFIL_VACIOS,
  cuerpoGuardarPerfil,
  formularioPerfilHabilitado,
  valoresDesdePerfil,
} from './perfilDatosForm';

const PERFIL = {
  id: 'u-1',
  nombre: 'Clienta',
  email: 'clienta@example.com',
  telefono: '7710000000',
  alergias: 'Amoniaco',
  recibePromociones: false,
  aceptaAvisoPrivacidad: true,
} as PerfilUsuarioCompleto;

describe('perfil de la clienta: no guardar sin haber cargado el perfil', () => {
  it('si getMiPerfil falló (sin perfil), el formulario queda deshabilitado aunque ya no esté cargando', () => {
    expect(formularioPerfilHabilitado({ cargando: false, enviando: false, perfil: null })).toBe(false);
  });

  it('se habilita solo con el perfil cargado y sin un guardado en curso', () => {
    expect(formularioPerfilHabilitado({ cargando: false, enviando: false, perfil: PERFIL })).toBe(true);
    expect(formularioPerfilHabilitado({ cargando: true, enviando: false, perfil: PERFIL })).toBe(false);
    expect(formularioPerfilHabilitado({ cargando: false, enviando: true, perfil: PERFIL })).toBe(false);
  });

  it('sin perfil cargado no arma ningún PATCH: los valores vacíos no pueden borrar las alergias', () => {
    expect(cuerpoGuardarPerfil(null, VALORES_PERFIL_VACIOS)).toBeNull();
  });

  it('guardar sin tocar las alergias reenvía las mismas, nunca vacío', () => {
    const cuerpo = cuerpoGuardarPerfil(PERFIL, { ...valoresDesdePerfil(PERFIL), consienteDatosSensibles: true });
    expect(cuerpo?.alergias).toBe('Amoniaco');
    expect(cuerpo?.consienteDatosSensibles).toBe(true);
  });
});
