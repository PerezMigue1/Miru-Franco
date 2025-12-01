'use client';

import { useEffect, useRef } from 'react';
import { getToken, clearAuthData } from '../utils/security';
import { getBackendBaseUrl } from '../services/config';

/**
 * Hook para renovar automáticamente el token y detectar cuando se inicia sesión en otro dispositivo
 * Verifica cada 30 segundos si el token sigue siendo válido
 * Si se detecta una nueva sesión en otro dispositivo, cierra automáticamente esta sesión
 */
export function useAutoRefreshToken() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    
    // Función para verificar el estado del token
    const checkTokenStatus = async () => {
      try {
        const BACKEND_BASE = getBackendBaseUrl();
        const response = await fetch(`${BACKEND_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            // Guardar nuevo token si se renueva
            localStorage.setItem('token', data.token);
            localStorage.setItem('authToken', data.token);
          }
        } else {
          // Token inválido - verificar si es por nueva sesión en otro dispositivo
          const errorText = await response.text();
          let errorData;
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          const message = errorData.message || errorData.error || '';
          const lowerMessage = message.toLowerCase();
          
          clearAuthData();
          
          // Solo redirigir si estamos en una página protegida
          const isLoginPage = window.location.pathname === '/' || 
                             window.location.pathname.includes('/auth') ||
                             window.location.pathname.includes('/login') ||
                             window.location.pathname.includes('/register');
          
          if (!isLoginPage) {
            // Detectar si es por nueva sesión en otro dispositivo
            if (lowerMessage.includes('revocado') || 
                lowerMessage.includes('nueva sesión') ||
                lowerMessage.includes('otro dispositivo') ||
                lowerMessage.includes('sesión cerrada')) {
              alert('Se inició sesión en otro dispositivo. Tu sesión actual ha sido cerrada automáticamente.');
            }
            
            window.location.href = '/login';
          }
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        // No hacer nada si falla, el interceptor del cliente API manejará el error
      }
    };
    
    // Verificar cada 30 segundos para detectar rápidamente nuevas sesiones
    // Aumenta la frecuencia para que el cierre de sesión por otro dispositivo se note casi en tiempo real
    intervalRef.current = setInterval(checkTokenStatus, 30 * 1000);
    
    // Verificar inmediatamente al montar el componente
    checkTokenStatus();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

