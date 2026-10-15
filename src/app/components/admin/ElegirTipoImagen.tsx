'use client';

import { useId } from 'react';
import type { TipoImagenGaleria } from '../../utils/cloudinary';
import { OPCIONES_TIPO_IMAGEN } from './tipoImagenGaleria';

type Props = {
  valor: TipoImagenGaleria | null;
  onCambiar: (tipo: TipoImagenGaleria) => void;
  disabled?: boolean;
  /** Mensaje de error bajo las opciones (por ejemplo, si intentó subir sin elegir). */
  error?: string | null;
};

/**
 * Selector obligatorio, sin opción preseleccionada: foto real de un trabajo del salón o imagen ilustrativa.
 * Cada opción mide al menos 44 px de alto.
 */
export default function ElegirTipoImagen({ valor, onCambiar, disabled, error }: Props) {
  const nombre = useId();
  const idError = `${nombre}-error`;
  return (
    <fieldset className="space-y-1" aria-describedby={error ? idError : undefined}>
      <legend className="text-sm font-semibold text-menu-texto-principal">¿Qué vas a subir? (obligatorio)</legend>
      {OPCIONES_TIPO_IMAGEN.map((opcion) => (
        <label
          key={opcion.valor}
          className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-menu-texto-principal"
        >
          <input
            type="radio"
            name={nombre}
            value={opcion.valor}
            checked={valor === opcion.valor}
            onChange={() => onCambiar(opcion.valor)}
            disabled={disabled}
            required
            className="h-5 w-5 shrink-0"
          />
          {opcion.texto}
        </label>
      ))}
      {error && (
        <p id={idError} role="alert" className="text-xs font-medium text-[var(--danger-texto)]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
