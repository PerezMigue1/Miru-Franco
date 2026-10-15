import { sanitizeEmail, sanitizeInput } from '../../utils/security';
import { normalizarTelefonoRegistro } from '../../utils/phone';
import { requiereConsentimiento } from '../../utils/consentimientoDatosSensibles';
import { consentimientosAlta, type CasillasAlta } from '../legal/reglasAlta';
import type { DatosRegistro } from '../../services/auth';

/** Valores del formulario de registro (Register.tsx) que viajan al backend. */
export interface ValoresRegistro extends CasillasAlta {
  name: string;
  email: string;
  phone: string;
  password: string;
  birthDate: string;
  securityAnswer: string;
  hairType: string;
  colorNatural: string;
  colorActual: string;
  productosUsados: string;
  hasAllergies: 'yes' | 'no' | '';
  allergies: string;
  consienteDatosSensibles: boolean;
  hasChemicalTreatments: 'yes' | 'no' | '';
  chemicalTreatments: string;
}

/** Opción del formulario → enum TipoCabello del backend. */
const TIPO_CABELLO: Record<string, string> = { lacio: 'liso', ondulado: 'ondulado', rizado: 'rizado' };

/** Texto capturado y saneado, o undefined si quedó vacío (lo vacío no se manda). */
const texto = (valor: string) => (valor.trim() ? sanitizeInput(valor) : undefined);

/**
 * Cuerpo de POST /api/usuarios/registro. Minimización: la fecha de nacimiento y el perfil capilar solo
 * viajan si la clienta los capturó (nada se inventa: sin tipo de cabello elegido no se manda "liso").
 */
export function construirPayloadRegistro(v: ValoresRegistro, preguntaTexto: string, rutaOrigen: string): DatosRegistro {
  const alergias = v.hasAllergies === 'yes' ? texto(v.allergies) : undefined;
  const perfil: NonNullable<DatosRegistro['perfilCapilar']> = {
    tipoCabello: TIPO_CABELLO[v.hairType],
    colorNatural: texto(v.colorNatural),
    colorActual: texto(v.colorActual),
    productosUsados: texto(v.productosUsados),
    tieneAlergias: v.hasAllergies ? v.hasAllergies === 'yes' : undefined,
    alergias,
    tratamientosQuimicos: v.hasChemicalTreatments ? v.hasChemicalTreatments === 'yes' : undefined,
    tratamientos: v.hasChemicalTreatments === 'yes' ? texto(v.chemicalTreatments) : undefined,
  };
  const perfilCapilar = Object.fromEntries(Object.entries(perfil).filter(([, valor]) => valor !== undefined));

  return {
    nombre: sanitizeInput(v.name),
    email: sanitizeEmail(v.email),
    password: v.password,
    telefono: normalizarTelefonoRegistro(v.phone),
    ...(v.birthDate ? { fechaNacimiento: v.birthDate } : {}),
    preguntaSeguridad: {
      pregunta: sanitizeInput(preguntaTexto),
      respuesta: sanitizeInput(v.securityAnswer),
    },
    ...(Object.keys(perfilCapilar).length > 0 ? { perfilCapilar } : {}),
    ...consentimientosAlta(v),
    rutaOrigen,
    ...(alergias && requiereConsentimiento(alergias) ? { consienteDatosSensibles: v.consienteDatosSensibles } : {}),
  };
}
