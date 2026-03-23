'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../services/client';
import { getBackendBaseUrl } from '../../../../services/config';
import { saveToken } from '../../../../utils/security';
import { normalizarUsuarioAlmacenado } from '../../../../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../../../../utils/userStorageSync';
import { api } from '../../../../services/auth';
import { mergePerfilEnLocalStorage } from '../../../../services/perfil';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Autenticando con Google...');

  useEffect(() => {
    const handleCallback = async () => {
      // ✅ Según GUIA_ACTUALIZAR_FRONTEND_OAUTH_SEGURO.md
      // Ahora leemos 'code' en lugar de 'token'
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorId = searchParams.get('id');

      // Detectar errores de Vercel (404: NOT_FOUND, DEPLOYMENT_NOT_FOUND)
      if (errorId?.includes('DEPLOYMENT_NOT_FOUND')) {
        setStatus('error');
        setMessage('Error de configuración: La URL de callback no coincide con el deployment. Por favor, verifica la configuración de Google OAuth en el backend.');
        setTimeout(() => {
          router.push('/?error=callback_config_error');
        }, 3000);
        return;
      }

      // Si hay error de OAuth (ej: usuario canceló)
      if (errorParam) {
        setStatus('error');
        let errorMessage = 'Error en la autenticación. Por favor intenta de nuevo.';
        switch (errorParam) {
          case 'authentication_failed':
            errorMessage = 'No se pudo completar la autenticación';
            break;
          case 'access_denied':
            errorMessage = 'Autorización cancelada';
            break;
          case 'callback_config_error':
            errorMessage = 'Error de configuración: La URL de callback no está correctamente configurada. Por favor, contacta al administrador.';
            break;
          default:
            errorMessage = `Error: ${errorParam}`;
        }
        setMessage(errorMessage);
        setTimeout(() => {
          router.push('/?error=google_auth_failed');
        }, 3000);
        return;
      }

      // Si hay código, intercambiarlo por token
      if (code) {
        try {
          setMessage('Intercambiando código por token...');
          const BACKEND_BASE = getBackendBaseUrl();
          
          // ✅ Intercambiar código por token según la guía
          const data = await apiClient.post<{ 
            success: boolean; 
            token?: string; 
            user?: unknown;
            message?: string;
            error?: string;
          }>('/api/auth/exchange-code', { code }, BACKEND_BASE);
          
          if (data.success && data.token) {
            // Guardar token usando utilidad de seguridad
            saveToken(data.token);
            
            // Opcional: Guardar información del usuario si viene en la respuesta (user o usuario)
            const userData = (data as { user?: unknown; usuario?: unknown }).user ?? (data as { user?: unknown; usuario?: unknown }).usuario;
            if (userData) {
              localStorage.setItem('user', JSON.stringify(normalizarUsuarioAlmacenado(userData)));
              emitMiruUserStorageUpdated();
            }

            // Completar nombre/foto/rol en localStorage (Google suele mandar poco en el primer JSON).
            try {
              const prof = await api.getProfile();
              if (prof.success && prof.data) {
                mergePerfilEnLocalStorage(prof.data);
              }
            } catch {
              /* sin red o /me: el header se actualizará al entrar a /perfil */
            }

            setStatus('success');
            setMessage('¡Autenticación exitosa! Redirigiendo...');
            
            // Esperar un momento para mostrar el mensaje de éxito
            setTimeout(() => {
              router.push('/home');
            }, 1500);
          } else {
            setStatus('error');
            setMessage(data.message || data.error || 'Error al obtener token');
            setTimeout(() => {
              router.push('/?error=auth_failed');
            }, 3000);
          }
        } catch (error: unknown) {
          console.error('Error intercambiando código:', error);
          setStatus('error');
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Error al intercambiar código por token';
          setMessage(errorMessage);
          setTimeout(() => {
            router.push('/?error=auth_failed');
          }, 3000);
        }
      } else {
        // No hay código ni error, redirigir al login
        setStatus('error');
        setMessage('Código de autenticación no proporcionado');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-fondo-general px-4">
      <div className="text-center max-w-md w-full">
        <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: 'var(--borde-sutil)' }}>
          {status === 'loading' && (
            <>
              <div className="mx-auto w-16 h-16 mb-4">
                <svg className="animate-spin h-16 w-16 text-menu-texto-principal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-page-title mb-2 text-texto-fondo-oscuro">
                {message}
              </h2>
              <p className="text-sm text-texto-fondo-oscuro" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                Por favor espera...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-texto-fondo-oscuro" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-texto-fondo-oscuro">
                ¡Autenticación Exitosa!
              </h2>
              <p className="text-sm" style={{ color: 'rgba(242,241,237,0.7)' }}>
                {message}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto w-16 h-16 bg-danger rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-texto-fondo-oscuro" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-texto-fondo-oscuro">
                Error de Autenticación
              </h2>
              <p className="text-sm mb-4" style={{ color: 'rgba(242,241,237,0.7)' }}>
                {message}
              </p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-6 py-2 rounded-lg font-medium transition-colors bg-botones-principales text-texto-fondo-oscuro hover:opacity-90"
                style={{ backgroundColor: 'var(--botones-principales)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--botones-principales)'}
              >
                Volver al Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-fondo-general">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-menu-texto-principal mx-auto mb-4"></div>
          <p className="text-texto-fondo-oscuro">Cargando...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
