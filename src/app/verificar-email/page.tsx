'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { colors, colorsWithOpacity } from '../utils/colors';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu correo electrónico...');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('Token o email no proporcionado');
      return;
    }

    const verifyEmail = async () => {
      try {
        const { api } = await import('../services');
        const result = await api.verifyEmail(token, email);

        if (result.success) {
          setStatus('success');
          setMessage(result.message || '¡Correo electrónico verificado exitosamente!');
          setTimeout(() => {
            router.push('/?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Error al verificar el correo');
        }
      } catch (error) {
        console.error('Error verificando email:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Error al verificar el correo');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: colors.fondoGeneral }}>
      <div className="max-w-md w-full">
        <div 
          className="rounded-lg shadow-lg p-8 border text-center"
          style={{ 
            backgroundColor: colors.headerFooter,
            borderColor: colorsWithOpacity.bordeSutil 
          }}
        >
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: colors.menuTextoPrincipal }}></div>
              <h2 className="text-page-title mb-4 text-texto-fondo-oscuro">
                Verificando...
              </h2>
              <p className="text-sm" style={{ color: colorsWithOpacity.textoFondoOscuro80 }}>
                {message}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto" style={{ color: colors.success }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-page-title mb-4 text-texto-fondo-oscuro">
                ¡Verificación Exitosa!
              </h2>
              <p className="text-sm mb-6" style={{ color: colorsWithOpacity.textoFondoOscuro80 }}>
                {message}
              </p>
              <p className="text-xs" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
                Redirigiendo al login...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto" style={{ color: colors.danger }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-page-title mb-4 text-texto-fondo-oscuro">
                Error en la Verificación
              </h2>
              <p className="text-sm mb-6" style={{ color: colorsWithOpacity.textoFondoOscuro80 }}>
                {message}
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: colors.botonesPrincipales }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.botonesPrincipales}
              >
                Ir al Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.fondoGeneral }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: colors.menuTextoPrincipal }}></div>
          <p className="text-texto-fondo-oscuro">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

