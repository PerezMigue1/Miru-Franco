'use client';

import { useEffect } from 'react';
import { documentoLegal } from '../../utils/documentosLegales';
import { precargarVersionesVigentes } from '../../services/consentimientos';
import CasillaDocumento, { EnlaceDocumento } from './CasillaDocumento';
import type { CampoCasillaAlta, CasillasAlta as ValoresCasillasAlta } from './reglasAlta';

/** Sufijo del id de cada casilla (el id completo es `${idBase}-${sufijo}`). */
export const SUFIJO_CASILLA_ALTA: Record<CampoCasillaAlta, string> = {
  aceptaTerminos: 'terminos',
  aceptaAvisoPrivacidad: 'aviso',
  recibePromociones: 'promociones',
};

export const CAMPOS_CASILLA_ALTA: readonly CampoCasillaAlta[] = ['aceptaTerminos', 'aceptaAvisoPrivacidad', 'recibePromociones'];

/** Texto de cada casilla del alta, con el enlace a su documento. */
export function EtiquetaCasillaAlta({ campo }: { campo: CampoCasillaAlta }) {
  if (campo === 'aceptaTerminos') {
    return (
      <>
        Acepto los <EnlaceDocumento href={documentoLegal('terminos').ruta}>Términos y condiciones</EnlaceDocumento>
      </>
    );
  }
  if (campo === 'aceptaAvisoPrivacidad') {
    return (
      <>
        Acepto el <EnlaceDocumento href={documentoLegal('aviso-privacidad').ruta}>Aviso de privacidad</EnlaceDocumento>
      </>
    );
  }
  return (
    <>
      Quiero recibir promociones y novedades (opcional). Puedes cambiarlo cuando quieras, como explica el{' '}
      <EnlaceDocumento href={`${documentoLegal('aviso-privacidad').ruta}#finalidades`}>Aviso de privacidad</EnlaceDocumento>
    </>
  );
}

interface CasillasAltaProps {
  idBase: string;
  valores: ValoresCasillasAlta;
  onCambio: (campo: CampoCasillaAlta, marcada: boolean) => void;
  errores?: Partial<Record<CampoCasillaAlta, string | null | undefined>>;
  disabled?: boolean;
}

/** Las tres casillas del alta para formularios con estado propio (el registro con Google). */
export default function CasillasAlta({ idBase, valores, onCambio, errores = {}, disabled }: CasillasAltaProps) {
  // Al enviar, el alta lleva la versión vigente de Términos y Aviso (la publicada en el panel, si hay).
  useEffect(() => {
    void precargarVersionesVigentes();
  }, []);
  return (
    <div className="space-y-1">
      {CAMPOS_CASILLA_ALTA.map((campo) => (
        <CasillaDocumento
          key={campo}
          id={`${idBase}-${SUFIJO_CASILLA_ALTA[campo]}`}
          name={campo}
          checked={valores[campo]}
          onChange={(e) => onCambio(campo, e.target.checked)}
          disabled={disabled}
          aria-required={campo !== 'recibePromociones' ? true : undefined}
          error={errores[campo]}
        >
          <EtiquetaCasillaAlta campo={campo} />
        </CasillaDocumento>
      ))}
    </div>
  );
}
