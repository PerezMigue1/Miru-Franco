'use client';

import { useEffect, useState } from 'react';
import AvisoReglasEnDocumentos from '../../../components/legal/AvisoReglasEnDocumentos';
import { documentosAfectadosPorReglas, type DocumentoAfectado } from '../../../services/documentosLegales';
import { prepararValor } from './validacionConfiguracion';

/** Espera tras el último cambio antes de preguntar al backend (no una petición por tecla). */
const ESPERA_MS = 600;

/**
 * En Reglas: si el borrador (o lo ya guardado) cambia una regla que aparece en un documento legal vigente, avisa
 * "Este cambio requiere publicar una nueva versión de [documento]" con el botón que prepara esa versión. El documento
 * publicado no cambia solo: sus variables quedaron congeladas al publicarlo.
 */
export default function AvisoReglasDocumentos({ reglas }: { reglas: unknown }) {
  const [afectados, setAfectados] = useState<DocumentoAfectado[]>([]);
  const clave = JSON.stringify(prepararValor('reglas', reglas));

  useEffect(() => {
    let vigente = true;
    const t = setTimeout(() => {
      documentosAfectadosPorReglas(JSON.parse(clave))
        .then((lista) => vigente && setAfectados(lista))
        // Sin respuesta no se inventa un aviso; el panel de Documentos legales lo vuelve a revisar.
        .catch(() => vigente && setAfectados([]));
    }, ESPERA_MS);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [clave]);

  return <AvisoReglasEnDocumentos afectados={afectados} />;
}
