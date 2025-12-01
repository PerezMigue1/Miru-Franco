'use client';

import { useAutoRefreshToken } from '../hooks/useAutoRefreshToken';

/**
 * Componente que verifica periódicamente el estado del token
 * Detecta cuando se inicia sesión en otro dispositivo y cierra automáticamente esta sesión
 */
export function TokenChecker() {
  useAutoRefreshToken();
  return null; // Este componente no renderiza nada
}

