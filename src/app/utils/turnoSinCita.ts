import type { CrearCitaSinCitaPayload } from '../services/citas';

/** Formulario de recepción para alguien que llega sin cita (cola de atención y ejecución de servicios). */
export interface FormTurnoSinCita {
  /** invitada: persona sin cuenta (nombre y teléfono); registrada: clienta elegida de la búsqueda. */
  modo: 'invitada' | 'registrada';
  nombre: string;
  telefono: string;
  clienteId: string;
  servicioId: string;
  especialistaId: string;
}

export const FORM_TURNO_VACIO: FormTurnoSinCita = { modo: 'invitada', nombre: '', telefono: '', clienteId: '', servicioId: '', especialistaId: '' };

/** Mismas reglas que el DTO del backend (nombre hasta 120, teléfono hasta 20 con dígitos, espacios, +, ( ) y -). */
export function validarTurnoSinCita(f: FormTurnoSinCita): string | null {
  if (f.modo === 'invitada') {
    const nombre = f.nombre.trim();
    if (!nombre) return 'Escribe el nombre de la persona';
    if (nombre.length > 120) return 'El nombre admite hasta 120 caracteres';
    const tel = f.telefono.trim();
    if (tel && (tel.length > 20 || !/^[0-9+()\s-]+$/.test(tel))) return 'Teléfono inválido: usa solo números, espacios, +, ( ) y -';
  } else if (!f.clienteId) {
    return 'Busca y elige a la clienta';
  }
  if (!f.servicioId) return 'Elige el servicio';
  if (!f.especialistaId) return 'Elige quién la atiende';
  return null;
}

export function payloadTurnoSinCita(f: FormTurnoSinCita, iniciarAhora: boolean): CrearCitaSinCitaPayload {
  const comun = { servicioId: Number(f.servicioId), especialistaId: f.especialistaId, iniciarAhora };
  if (f.modo === 'registrada') return { clienteId: f.clienteId, ...comun };
  const tel = f.telefono.trim();
  return { nombre: f.nombre.trim(), ...(tel ? { telefono: tel } : {}), ...comun };
}
