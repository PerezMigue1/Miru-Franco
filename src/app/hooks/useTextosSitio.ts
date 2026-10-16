'use client';

import type { ReactNode } from 'react';
import { useConfiguracionPublica } from './useConfiguracionPublica';
import { piezasTexto, textoSitio, TEXTOS_POR_OMISION, type Variables } from '../utils/textosSitio';
import type { ConfiguracionPublica } from '../services/configuracionSitio';

/** Variables comunes a todos los textos: las reglas vigentes y el nombre del salón. */
export function variablesBase(config: Pick<ConfiguracionPublica, 'reglas' | 'salon'>): Variables {
  return { ...config.reglas.variables, nombreSalon: config.salon.nombre };
}

/**
 * Textos del sitio en componentes de cliente: `t(clave, contexto)` devuelve el texto guardado en Admin > Textos del
 * sitio (o el de hoy si el API no responde) con las variables de reglas, el nombre del salón y las de contexto.
 * `piezas` permite que una variable sea una pieza de React (un monto con cifras tabulares, un enlace).
 */
export function useTextosSitio() {
  const config = useConfiguracionPublica();
  const { textos } = config;
  const base = variablesBase(config);
  const t = (clave: string, contexto: Variables = {}) => textoSitio(textos, clave, { ...base, ...contexto });
  const piezas = (clave: string, contexto: Variables, nodos: Record<string, ReactNode>) =>
    piezasTexto(textos[clave] ?? TEXTOS_POR_OMISION[clave] ?? '', { ...base, ...contexto }, nodos);
  return { t, piezas, textos, config };
}
