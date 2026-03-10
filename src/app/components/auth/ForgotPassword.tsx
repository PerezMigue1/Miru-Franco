'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Notification from '../ui/Notification';

interface ForgotPasswordProps {
  onSwitchToLogin?: () => void;
  onEmailSent?: (email: string) => void;
  onSwitchToSecurityQuestions?: () => void;
}

export default function ForgotPassword({ 
  onSwitchToLogin,
  onEmailSent,
  onSwitchToSecurityQuestions
}: ForgotPasswordProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Contador regresivo para rate limiting
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setRetryAfter(null);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.general;
        return newErrors;
      });
    }
  }, [countdown]);
  
  // Funcion para navegar usando router
  const handleSwitchToLogin = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      router.push('/login');
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string } = {};
    
    if (!email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevenir recarga de página
    
    if (!validateForm()) return;
    
    // Prevenir envío si hay rate limiting activo
    if (countdown !== null) {
      return;
    }
    
    setIsLoading(true);
    setRetryAfter(null);
    setCountdown(null);
    // NO limpiar todos los errores, solo el general para mantener errores de campos
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });
    
    try {
      const { api } = await import('../../services');
      
      // ✅ Solicitar enlace de recuperación directamente
      const result = await api.solicitarEnlaceRecuperacion(email);
      
      if (result.success) {
        // Llamar a onEmailSent para cambiar a la pantalla de éxito
        onEmailSent?.(email);
      } else {
        const errorMessage = result.error || result.message || 'Error al solicitar el enlace';
        setErrors({ general: errorMessage });
      }
    } catch (error: unknown) {
      // ✅ Manejar error 429 (Rate Limiting)
      const err = error as Error & { status?: number; retryAfter?: number };
      if (err.status === 429) {
        const retrySeconds = err.retryAfter || 60;
        setRetryAfter(retrySeconds);
        setCountdown(retrySeconds);
        setErrors({ 
          general: `Demasiados intentos. Espera ${retrySeconds} segundos antes de intentar nuevamente.` 
        });
      } else {
        console.error('Error en recuperación:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error al procesar la solicitud';
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    onSwitchToLogin?.();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: 'var(--borde-sutil)' }}>
        <h2 className="text-page-title text-center mb-2 text-texto-fondo-oscuro">
          Recuperar Contraseña
        </h2>
        <p className="text-center mb-6 text-sm text-texto-fondo-oscuro">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
        </p>
        
        {errors.general && (
          <div className="mb-4">
            <Notification
              type="error"
              message={errors.general}
            />
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium mb-2 text-texto-fondo-oscuro"
            >
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                  });
                }
              }}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors bg-texto-fondo-oscuro text-header-footer"
              style={{ 
                borderColor: errors.email ? 'var(--danger)' : 'var(--borde-visible)'
              }}
              placeholder="tu@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || countdown !== null}
            className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-botones-principales"
            style={{ backgroundColor: 'var(--botones-principales)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--botones-principales)'}
          >
            {isLoading 
              ? 'Enviando enlace...'
              : countdown !== null 
                ? `Espera ${countdown}s`
                : 'Enviar Enlace de Recuperación'
            }
          </button>
          
          {/* Mostrar contador regresivo si hay rate limiting */}
          {countdown !== null && countdown > 0 && (
            <div className="mt-4 p-3 rounded-lg border" style={{ 
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              borderColor: 'var(--warning)'
            }}>
              <p className="text-sm text-center" style={{ color: 'var(--warning)' }}>
                ⏱️ Puedes intentar nuevamente en: <strong>{countdown}</strong> segundos
              </p>
            </div>
          )}
        </form>

        {onSwitchToSecurityQuestions && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--borde-sutil)' }}>
            <p className="text-center text-sm mb-4 text-texto-fondo-oscuro">
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2">
              {onSwitchToSecurityQuestions && (
                <button
                  onClick={onSwitchToSecurityQuestions}
                  className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm text-texto-fondo-oscuro"
                  style={{ borderColor: 'var(--borde-secundario)' }}
                  disabled={isLoading}
                >
                  Recuperar por Preguntas de Seguridad
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={handleSwitchToLogin}
            className="text-sm transition-colors text-texto-fondo-oscuro hover:opacity-80"
            disabled={isLoading}
          >
            ← Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

