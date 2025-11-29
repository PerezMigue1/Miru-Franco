'use client';

import { useEffect, useRef } from 'react';
import { getToken } from '../utils/security';
import { getBackendBaseUrl } from '../services/config';

/**
 * Hook para renovar automáticamente el token cada 10 minutos
 * según la guía de actualización del frontend
 */
export function useAutoRefreshToken() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    
    const refreshToken = async () => {
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
            // Guardar nuevo token
            localStorage.setItem('token', data.token);
            localStorage.setItem('authToken', data.token);
          }
        } else {
          // Token inválido, limpiar y redirigir
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          
          // Solo redirigir si estamos en una página protegida
          if (window.location.pathname !== '/' && !window.location.pathname.includes('/auth')) {
            window.location.href = '/';
          }
        }
      } catch (error) {
        console.error('Error renovando token:', error);
        // No hacer nada si falla, el interceptor del cliente API manejará el error
      }
    };
    
    // Renovar cada 10 minutos (600000 ms)
    intervalRef.current = setInterval(refreshToken, 10 * 60 * 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

