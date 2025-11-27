'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { colors, colorsWithOpacity } from '../../utils/colors';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Autenticando con Google...');

  useEffect(() => {
    const token = searchParams.get('token');
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorCode = searchParams.get('code');
    const errorId = searchParams.get('id');

    // Detectar errores de Vercel (404: NOT_FOUND, DEPLOYMENT_NOT_FOUND)
    if (errorCode === '404' || errorId?.includes('DEPLOYMENT_NOT_FOUND')) {
      setStatus('error');
      setMessage('Error de configuración: La URL de callback no coincide con el deployment. Por favor, verifica la configuración de Google OAuth en el backend.');
      setTimeout(() => {
        router.push('/?error=callback_config_error');
      }, 3000);
      return;
    }

    if (success === 'true' && token) {
      // ✅ Guardar token según guía GUIA_FRONTEND_GOOGLE_OAUTH.md
      try {
        localStorage.setItem('token', token);
        // También guardar como 'authToken' para compatibilidad con la guía
        localStorage.setItem('authToken', token);
        
        // Intentar obtener datos del usuario del token o hacer una petición al backend
        // Por ahora solo guardamos el token
        setStatus('success');
        setMessage('¡Autenticación exitosa! Redirigiendo...');
        
        // Esperar un momento para mostrar el mensaje de éxito
        setTimeout(() => {
          router.push('/home');
        }, 1500);
      } catch (err) {
        console.error('Error guardando token:', err);
        setStatus('error');
        setMessage('Error al guardar la sesión');
        setTimeout(() => {
          router.push('/?error=auth_failed');
        }, 2000);
      }
    } else if (error) {
      console.error('Error en autenticación de Google:', error);
      setStatus('error');
      
      let errorMessage = 'Error al autenticar con Google';
      switch (error) {
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
          errorMessage = `Error: ${error}`;
      }
      
      setMessage(errorMessage);
      setTimeout(() => {
        router.push('/?error=google_auth_failed');
      }, 2000);
    } else {
      // No hay token ni error, redirigir al login
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-fondo-general px-4">
      <div className="text-center max-w-md w-full">
        <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
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
              <p className="text-sm text-texto-fondo-oscuro" style={{ color: colors.textoFondoOscuro || 'rgba(242,241,237,0.7)' }}>
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
                style={{ backgroundColor: colors.botonesPrincipales }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.botonesPrincipales}
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

