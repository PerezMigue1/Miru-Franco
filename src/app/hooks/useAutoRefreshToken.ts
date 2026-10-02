'use client';

import { useEffect, useRef } from 'react';
import { hasSession, clearAuthData, sesionPorRenovar } from '../utils/security';
import { showAlert } from '../utils/toast';
import { runSharedAccessTokenRefresh } from '../utils/tokenRefresh';
import { rutaLogin } from '../utils/rutasConSesion';

/**
 * Renueva el token antes de que el backend deje de aceptar el refresh (ver sesionPorRenovar):
 * comprueba al cargar y cada 30 s, pero solo llama a /auth/refresh cuando faltan menos de 5 min.
 * Antes refrescaba en cada carga y cada 30 s: cada refresh rota la cookie, y una recarga que
 * cortaba esa respuesta dejaba al navegador con el token viejo, que caía pasados 30 s de gracia.
 * Si el backend rechaza el refresh (sesión vencida o cerrada en otro dispositivo), cierra la sesión.
 */
export function useAutoRefreshToken() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Función para verificar el estado del token
    const checkTokenStatus = async () => {
      // Revisar la sesión en cada ejecución: si el usuario cerró sesión, no hacemos nada
      if (!hasSession()) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      if (!sesionPorRenovar()) return;

      try {
        const result = await runSharedAccessTokenRefresh();

        if (result.kind === 'ok') {
          return;
        }

        if (result.kind === 'failed') {
          return;
        }

        // result.kind === 'unauthorized'
        const lowerMessage = result.message.toLowerCase();

        const tokenRealmenteInvalido =
          lowerMessage.includes('expirado') ||
          lowerMessage.includes('inválido') ||
          lowerMessage.includes('invalid') ||
          lowerMessage.includes('revocado') ||
          lowerMessage.includes('otro dispositivo') ||
          lowerMessage.includes('cerrada desde otro dispositivo') ||
          lowerMessage.includes('nueva sesión en otro dispositivo') ||
          lowerMessage.includes('inactividad') ||
          lowerMessage.includes('sesión expirada') ||
          // Con la cookie httpOnly, un 401 genérico del refresh significa que la cookie ya no
          // llega (expiró o se borró): el frontend no tiene otra forma de saberlo.
          lowerMessage.trim() === 'unauthorized';

        if (!tokenRealmenteInvalido) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[useAutoRefreshToken] Refresh 401 pero no se considera sesión inválida:', lowerMessage.slice(0, 80));
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
          // Al entrar vuelve a la página donde venció la sesión; replace para que "atrás" no regrese aquí.
          window.location.replace(rutaLogin(window.location.pathname + window.location.search));
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        // No hacer nada si falla, el interceptor del cliente API manejará el error
      }
    };

    // Solo activar el intervalo si hay sesión (evita refrescar tras cerrar sesión)
    if (!hasSession()) return;

    // El margen es de 5 min: comprobar cada 30 s basta aunque el navegador frene los timers.
    intervalRef.current = setInterval(checkTokenStatus, 30 * 1000);
    // Primera comprobación casi al cargar: si una recarga cortó un refresh, el siguiente sale
    // enseguida, con el token viejo aún dentro de sus 30 s de gracia.
    const firstCheck = window.setTimeout(() => {
      void checkTokenStatus();
    }, 1000);

    return () => {
      window.clearTimeout(firstCheck);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

