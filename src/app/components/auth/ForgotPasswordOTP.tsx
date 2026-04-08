'use client';

import { useState, useEffect, useRef } from 'react';

interface ForgotPasswordOTPProps {
  email: string;
  onCodeVerified?: (email: string, token: string) => void;
  onBack?: () => void;
  onSwitchToLogin?: () => void;
}

export default function ForgotPasswordOTP({ 
  email, 
  onCodeVerified,
  onBack,
  onSwitchToLogin
}: ForgotPasswordOTPProps) {
  const [codigoOTP, setCodigoOTP] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos en segundos
  const [countdown, setCountdown] = useState<number | null>(null);
  const emailEnviadoRef = useRef<string | null>(null);

  // Contador regresivo para expiración del código
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Contador regresivo para rate limiting
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setError('');
      setMensaje('');
    }
  }, [countdown]);

  // Validación del código OTP
  const validarOTP = (codigo: string): string => {
    if (!codigo.trim()) {
      return 'El código OTP es obligatorio';
    }
    if (codigo.length < 6) {
      return 'El código OTP debe tener 6 dígitos';
    }
    if (!/^[0-9]+$/.test(codigo)) {
      return 'El código OTP solo puede contener números';
    }
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Solo números, máximo 6
    setCodigoOTP(value);
    
    // Validación en tiempo real
    const errorValidacion = validarOTP(value);
    setError(errorValidacion);
    
    // Limpiar mensaje cuando el usuario empiece a escribir
    if (mensaje && value) {
      setMensaje('');
    }
  };

  const handleVerificarOTP = async () => {
    // Validación antes de enviar
    const errorValidacion = validarOTP(codigoOTP);
    if (errorValidacion) {
      setError(errorValidacion);
      setMensaje('');
      return;
    }

    setIsLoading(true);
    setError('');
    setMensaje('');

    try {
      const { api } = await import('../../services');
      // ✅ Verificar código OTP de recuperación
      const result = await api.verifyPasswordRecoveryOTP(email, codigoOTP);
      
      if (result.success && result.token) {
        // ✅ Código verificado, recibimos token temporal
        setMensaje('✅ Código verificado correctamente. Redirigiendo...');
        setError('');
        setTimeout(() => {
          onCodeVerified?.(email, result.token!);
        }, 1500);
      } else {
        // ❌ Código incorrecto
        setMensaje(result.error || 'Error al verificar el código');
        setError('El código es incorrecto o ha expirado');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setMensaje('❌ Error de conexión al verificar el código');
      setError('No se pudo conectar con el servidor. Por favor, verifica tu conexión e intenta de nuevo.');
      console.error('Error verificando código de recuperación:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReenviarOTP = async () => {
    // Prevenir envío si hay rate limiting activo
    if (countdown !== null) {
      return;
    }
    
    setIsResending(true);
    setError('');
    setMensaje('');
    setCountdown(null);

    try {
      const { api } = await import('../../services');
      const result = await api.sendPasswordRecoveryOTP(email);
      
      if (result.success) {
        setMensaje('✅ Código reenviado correctamente');
        setTimeLeft(300); // Reiniciar contador
        emailEnviadoRef.current = email;
      } else {
        setMensaje(result.error || 'Error al reenviar el código');
        setError('No se pudo reenviar el código. Intenta nuevamente.');
      }
    } catch (err: unknown) {
      // ✅ Manejar error 429 (Rate Limiting)
      const error = err as Error & { status?: number; retryAfter?: number };
      if (error.status === 429) {
        const retrySeconds = error.retryAfter || 60;
        setCountdown(retrySeconds);
        setMensaje(`Demasiados intentos. Espera ${retrySeconds} segundos antes de intentar nuevamente.`);
        setError('');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setMensaje('❌ Error de conexión al reenviar el código');
        setError('No se pudo conectar con el servidor. Por favor, verifica tu conexión e intenta de nuevo.');
        console.error('Error reenviando código de recuperación:', errorMessage);
      }
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: 'var(--borde-sutil)' }}>
        <h2 className="text-page-title text-center mb-2 text-texto-fondo-oscuro">
          Verificar Código
        </h2>
        <p className="text-center mb-6 text-sm text-texto-fondo-oscuro">
          Hemos enviado un código de verificación de 6 dígitos a <strong>{email}</strong>
        </p>
        
        <div className="space-y-5">
          <div>
            <label 
              htmlFor="codigoOTP" 
              className="block text-sm font-medium mb-2 text-texto-fondo-oscuro"
            >
              Código de Verificación
            </label>
            <input
              type="text"
              id="codigoOTP"
              value={codigoOTP}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors text-center text-2xl tracking-widest bg-texto-fondo-oscuro text-header-footer"
              style={{ 
                borderColor: error ? 'var(--danger)' : 'var(--borde-visible)'
              }}
              placeholder="000000"
              maxLength={6}
              disabled={isLoading}
              autoComplete="one-time-code"
            />
            {error && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {mensaje && !error && (
              <p className={`mt-1 text-sm ${mensaje.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {mensaje}
              </p>
            )}
          </div>

          {timeLeft > 0 && (
            <p className="text-center text-sm" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
              El código expira en: <strong>{formatTime(timeLeft)}</strong>
            </p>
          )}

          {timeLeft === 0 && (
            <div className="text-center">
              <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>
                El código ha expirado
              </p>
              <button
                onClick={handleReenviarOTP}
                disabled={isResending || countdown !== null}
                className="text-sm font-medium transition-colors text-texto-fondo-oscuro hover:opacity-80 disabled:opacity-50"
                style={{ color: 'var(--botones-principales)' }}
              >
                {isResending 
                  ? 'Reenviando...' 
                  : countdown !== null 
                    ? `Espera ${countdown}s` 
                    : 'Reenviar código'
                }
              </button>
              
              {/* Mostrar contador regresivo si hay rate limiting */}
              {countdown !== null && countdown > 0 && (
                <div className="mt-3 p-3 rounded-lg border" style={{ 
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  borderColor: 'var(--warning)'
                }}>
                  <p className="text-sm text-center" style={{ color: 'var(--warning)' }}>
                    ⏱️ Puedes intentar nuevamente en: <strong>{countdown}</strong> segundos
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleVerificarOTP}
            disabled={isLoading || codigoOTP.length < 6}
            className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-botones-principales"
            style={{ backgroundColor: 'var(--botones-principales)' }}
            onMouseEnter={(e) => {
              if (!isLoading && codigoOTP.length >= 6) {
                e.currentTarget.style.backgroundColor = 'var(--hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && codigoOTP.length >= 6) {
                e.currentTarget.style.backgroundColor = 'var(--botones-principales)';
              }
            }}
          >
            {isLoading ? 'Verificando...' : 'Verificar Código'}
          </button>

          {timeLeft > 0 && (
            <>
              <button
                onClick={handleReenviarOTP}
                disabled={isResending || countdown !== null}
                className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm text-texto-fondo-oscuro disabled:opacity-50"
                style={{ borderColor: 'var(--borde-secundario)' }}
              >
                {isResending 
                  ? 'Reenviando...' 
                  : countdown !== null 
                    ? `Espera ${countdown}s` 
                    : 'Reenviar código'
                }
              </button>
              
              {/* Mostrar contador regresivo si hay rate limiting */}
              {countdown !== null && countdown > 0 && (
                <div className="mt-3 p-3 rounded-lg border" style={{ 
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  borderColor: 'var(--warning)'
                }}>
                  <p className="text-sm text-center" style={{ color: 'var(--warning)' }}>
                    ⏱️ Puedes intentar nuevamente en: <strong>{countdown}</strong> segundos
                  </p>
                </div>
              )}
            </>
          )}

          {onBack && (
            <div className="text-center">
              <button
                onClick={onBack}
                className="text-sm transition-colors text-texto-fondo-oscuro hover:opacity-80"
                disabled={isLoading}
              >
                ← Cambiar email
              </button>
            </div>
          )}

          {onSwitchToLogin && (
            <div className="text-center">
              <button
                onClick={onSwitchToLogin}
                className="text-sm transition-colors text-texto-fondo-oscuro hover:opacity-80"
                disabled={isLoading}
              >
                ← Volver a Iniciar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

