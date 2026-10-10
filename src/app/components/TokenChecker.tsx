'use client';

import { useEffect } from 'react';
import { useAutoRefreshToken } from '../hooks/useAutoRefreshToken';
import { sanearAlmacenamientoNavegador } from '../utils/datosSensiblesStorage';

/**
 * Componente que verifica periódicamente el estado del token
 * Detecta cuando se inicia sesión en otro dispositivo y cierra automáticamente esta sesión
 * Al montar (vive en el layout raíz) quita del navegador los datos de salud que hayan dejado
 * versiones anteriores.
 */
export function TokenChecker() {
  useAutoRefreshToken();
  useEffect(() => {
    sanearAlmacenamientoNavegador();
  }, []);
  return null; // Este componente no renderiza nada
}
