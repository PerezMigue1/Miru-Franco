'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Timer } from 'lucide-react';
import Notification from '../ui/Notification';

const SECUNDARIO = {
  ['--btn-bg' as string]: 'transparent',
  ['--btn-texto' as string]: 'var(--menu-texto-principal)',
  ['--btn-borde' as string]: '1.5px solid var(--mf-linea-fuerte)',
  ['--btn-bg-hover' as string]: 'var(--nav-hover-bg)',
  ['--btn-borde-hover' as string]: 'var(--menu-texto-principal)',
} as React.CSSProperties;

interface ForgotPasswordProps {
  onSwitchToLogin?: () => void;
  onEmailSent?: (email: string) => void;
  onSwitchToSecurityQuestions?: () => void;
  onSwitchToSMS?: () => void;
}

export default function ForgotPassword({ 
  onSwitchToLogin,
  onEmailSent,
  onSwitchToSecurityQuestions,
  onSwitchToSMS
}: ForgotPasswordProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <div className="w-full max-w-md mx-auto">
      <div>
        <h2 className="mf-titulo-pagina text-center mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Recuperar Contraseña
        </h2>
        <p className="text-center mb-6 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
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
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--menu-texto-principal)' }}
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
              className="mf-campo w-full px-4 py-3"
              aria-invalid={Boolean(errors.email)}
              placeholder="tu@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>
                {errors.email}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || countdown !== null}
            className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              ['--btn-bg' as string]: 'var(--botones-principales)',
              ['--btn-bg-hover' as string]: 'var(--hover)',
              ['--btn-texto' as string]: '#F2F1ED',
            }}
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
            <div className="mt-4 p-3 rounded-[10px] border" style={{ 
              backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)',
              borderColor: 'var(--warning)'
            }}>
              <p className="flex items-center justify-center gap-2 text-sm text-center" style={{ color: 'var(--warning-texto)' }}>
                <Timer size={16} aria-hidden className="shrink-0" />
                <span>Puedes intentar nuevamente en: <strong>{countdown}</strong> segundos</span>
              </p>
            </div>
          )}
        </form>

        {(onSwitchToSecurityQuestions || onSwitchToSMS) && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
            <p className="text-center text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2">
              {onSwitchToSMS && (
                <button
                  type="button"
                  onClick={onSwitchToSMS}
                  className="mf-btn mf-btn-color w-full min-h-11 py-2 px-4 rounded-[10px] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={SECUNDARIO}
                  disabled={isLoading}
                >
                  Recuperar por SMS
                </button>
              )}
              {onSwitchToSecurityQuestions && (
                <button
                  type="button"
                  onClick={onSwitchToSecurityQuestions}
                  className="mf-btn mf-btn-color w-full min-h-11 py-2 px-4 rounded-[10px] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={SECUNDARIO}
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
            className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold underline-offset-4 hover:underline"
            style={{ color: 'var(--menu-texto-principal)' }}
            disabled={isLoading}
          >
            <ArrowLeft size={16} aria-hidden />
            Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
