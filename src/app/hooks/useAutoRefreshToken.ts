'use client';

import { useEffect, useRef } from 'react';
import { getToken, clearAuthData } from '../utils/security';
import { showAlert } from '../utils/toast';
import { getBackendBaseUrl } from '../services/config';

/**
 * Hook para renovar automáticamente el token y detectar cuando se inicia sesión en otro dispositivo
 * Verifica cada 30 segundos si el token sigue siendo válido
 * Si se detecta una nueva sesión en otro dispositivo, cierra automáticamente esta sesión
 */
export function useAutoRefreshToken() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Función para verificar el estado del token
    const checkTokenStatus = async () => {
      // Leer el token actual en cada ejecución: si el usuario cerró sesión, no hay token y no hacemos nada
      const currentToken = getToken();
      if (!currentToken) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      try {
        const BACKEND_BASE = getBackendBaseUrl();
        const response = await fetch(`${BACKEND_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include', // ⚠️ OBLIGATORIO: El backend tiene credentials: true
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            // Guardar nuevo token si se renueva
            localStorage.setItem('token', data.token);
            localStorage.setItem('authToken', data.token);
          }
        } else {
          // Solo cerrar sesión si el backend indica EXPLÍCITAMENTE que el token es inválido/expirado/revocado.
          // No cerrar en 500, 404, ni en 401 genérico (ej. "token aún válido, no renovar") para evitar
          // echar al admin cuando el refresh falla por error temporal o lógica del backend.
          const errorText = await response.text();
          let errorData: { message?: string; error?: string } = {};
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          const message = errorData.message || errorData.error || '';
          const lowerMessage = message.toLowerCase();

          const tokenRealmenteInvalido =
            response.status === 401 &&
            (lowerMessage.includes('expirado') ||
              lowerMessage.includes('inválido') ||
              lowerMessage.includes('invalid') ||
              lowerMessage.includes('revocado') ||
              lowerMessage.includes('otro dispositivo') ||
              lowerMessage.includes('cerrada desde otro dispositivo') ||
              lowerMessage.includes('nueva sesión en otro dispositivo') ||
              lowerMessage.includes('inactividad') ||
              lowerMessage.includes('sesión expirada'));

          if (!tokenRealmenteInvalido) {
            // Error temporal o mensaje que no indica sesión inválida: no cerrar sesión
            if (process.env.NODE_ENV === 'development') {
              console.warn('[useAutoRefreshToken] Refresh no OK, pero no se considera sesión inválida:', response.status, lowerMessage.slice(0, 80));
            }
            return;
          }

          clearAuthData();
          const isLoginPage =
            window.location.pathname === '/' ||
            window.location.pathname.includes('/auth') ||
            window.location.pathname.includes('/login') ||
            window.location.pathname.includes('/register');

          if (!isLoginPage) {
            const esOtroDispositivo =
              lowerMessage.includes('otro dispositivo') ||
              lowerMessage.includes('cerrada desde otro dispositivo') ||
              lowerMessage.includes('nueva sesión en otro dispositivo');
            if (esOtroDispositivo) {
              await showAlert('Se inició sesión en otro dispositivo. Tu sesión actual ha sido cerrada automáticamente.');
            } else if (lowerMessage.includes('inactividad') || lowerMessage.includes('sesión expirada')) {
              await showAlert('Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.');
            } else {
              await showAlert('Tu sesión ha expirado o ya no es válida. Por favor inicia sesión nuevamente.');
            }
            window.location.href = '/login';
          }
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        // No hacer nada si falla, el interceptor del cliente API manejará el error
      }
    };

    // Solo activar el intervalo si hay token (evita usar un token antiguo tras cerrar sesión)
    const token = getToken();
    if (!token) return;

    // Verificar cada 30 segundos para detectar rápidamente nuevas sesiones
    intervalRef.current = setInterval(checkTokenStatus, 30 * 1000);
    // No llamar refresh en el mismo tick que la carga: evita 401/condiciones de carrera al recargar la página
    const firstCheck = window.setTimeout(() => {
      void checkTokenStatus();
    }, 4000);

    return () => {
      window.clearTimeout(firstCheck);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

