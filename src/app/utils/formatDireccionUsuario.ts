import type { DireccionUsuarioDTO } from '../services/perfil';

/** Título: calle + número interior (tabla `direcciones_usuario`). */
export function tituloCalleDireccion(d: DireccionUsuarioDTO): string {
  const n = d.numeroInterior?.trim();
  return n ? `${d.calle} ${n}` : d.calle;
}

/** Línea colonia, municipio, estado, CP (como en el diseño de checkout). */
export function lineaUbicacionDireccion(d: DireccionUsuarioDTO): string {
  const parts = [
    d.coloniaBarrio,
    d.municipioAlcaldia,
    d.estado,
    d.codigoPostal ? `CP ${d.codigoPostal}` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

/** Etiqueta amigable para `tipo_domicilio` (enum casa | trabajo). */
export function etiquetaTipoDomicilio(d: DireccionUsuarioDTO): string {
  return d.tipoDomicilio === 'trabajo' ? 'Trabajo' : 'Residencial';
}

/** Una línea compacta para resumen en tarjeta (envío a domicilio). */
export function lineaResumenEnvio(d: DireccionUsuarioDTO): string {
  const calle = tituloCalleDireccion(d);
  return `${calle} - ${d.coloniaBarrio}, ${d.municipioAlcaldia} - CP ${d.codigoPostal}`;
}
