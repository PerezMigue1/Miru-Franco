'use client';

import { useEffect, useState } from 'react';
import { CONFIGURACION_POR_OMISION, cargarConfiguracionPublicaCliente, type ConfiguracionPublica } from '../services/configuracionSitio';

/**
 * Configuración del sitio en componentes de cliente. El primer pintado usa los valores por omisión (los de hoy, sin
 * saltos raros) y en cuanto responde el API se cambian por los guardados en Admin > Configuración del sitio.
 */
export function useConfiguracionPublica(): ConfiguracionPublica {
  const [config, setConfig] = useState(CONFIGURACION_POR_OMISION);
  useEffect(() => {
    let vigente = true;
    void cargarConfiguracionPublicaCliente().then((c) => {
      if (vigente) setConfig(c);
    });
    return () => {
      vigente = false;
    };
  }, []);
  return config;
}
