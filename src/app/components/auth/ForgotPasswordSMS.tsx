'use client';

import { useState, useEffect } from 'react';

interface ForgotPasswordSMSProps {
  onSwitchToLogin?: () => void;
  onSwitchToEmail?: () => void;
  onSwitchToSecurityQuestions?: () => void;
  /** Llamado con email y token cuando el OTP es correcto (backend devuelve { success, token, email }) */
  onCodeVerified?: (email: string, token: string) => void;
}

export default function ForgotPasswordSMS({ 
  onSwitchToLogin,
  onSwitchToEmail,
  onSwitchToSecurityQuestions,
  onCodeVerified
}: ForgotPasswordSMSProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; code?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
    if (countdown === 0) {
      setCountdown(null);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  }, [countdown]);

  const validatePhone = () => {
    const newErrors: { phone?: string } = {};
    
    if (!phone) {
      newErrors.phone = 'El número de teléfono es requerido';
    } else if (!/^\+?[\d\s-()]{10,}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'El número de teléfono no es válido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCode = () => {
    const newErrors: { code?: string } = {};
    
    if (!code) {
      newErrors.code = 'El código es requerido';
    } else if (!/^\d{6}$/.test(code)) {
      newErrors.code = 'El código debe tener 6 dígitos';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone() || countdown !== null) return;
    setIsLoading(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.phone;
      delete next.general;
      return next;
    });
    try {
      const { api } = await import('../../services');
      const result = await api.sendSMSCode(phone);
      if (result.success) {
        setCodeSent(true);
        // Mensaje genérico para evitar enumeración de cuentas.
        setErrors({
          general: 'Si el numero esta registrado, se envio el codigo de verificacion por SMS.',
        });
        setTimeLeft(300);
        const interval = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrors({
          general: result.message || 'Si el numero esta registrado, se envio el codigo de verificacion por SMS.',
        });
      }
    } catch (error: unknown) {
      const err = error as Error & { status?: number; retryAfter?: number };
      if (err.status === 429) {
        const wait = err.retryAfter ?? 60;
        setCountdown(wait);
        setErrors({ phone: `Demasiados intentos. Espera ${wait} segundos.` });
      } else {
        setErrors({
          general: 'Si el numero esta registrado, se envio el codigo de verificacion por SMS.',
        });
      }
      console.error('Error enviando SMS:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCode()) return;
    setIsLoading(true);
    setErrors((prev) => ({ ...prev, code: undefined, general: undefined }));
    try {
      const { api } = await import('../../services');
      const result = await api.verifySMSCode(phone, code);
      if (result.success && result.token && result.email) {
        onCodeVerified?.(result.email, result.token);
      } else {
        setErrors({ code: result.error || result.message || 'Codigo incorrecto o expirado. Solicita uno nuevo.' });
      }
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      console.error('Error verificando código:', error);
      if (err.status === 400) {
        setErrors({ code: 'Codigo incorrecto o expirado. Solicita uno nuevo.' });
      } else {
        setErrors({ code: error instanceof Error ? error.message : 'No se pudo verificar el codigo. Intenta nuevamente.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (codeSent) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-lg shadow-lg p-8 border" style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)' }}>
          <h2 className="text-page-title text-center mb-2" style={{ color: '#F2F1ED' }}>
            Código de Verificación
          </h2>
          <p className="text-center text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            Hemos enviado un código de 6 dígitos a <strong>{phone}</strong>
          </p>
          
          <form onSubmit={handleVerifyCode} className="space-y-5">
            {errors.general && (
              <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                <p className="text-sm text-center" style={{ color: '#F2F1ED' }}>{errors.general}</p>
              </div>
            )}
            <div>
              <label 
                htmlFor="code" 
                className="block text-sm font-medium mb-2"
              style={{ color: '#F2F1ED' }}
              >
                Código de Verificación
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                  if (errors.code) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.code;
                      return newErrors;
                    });
                  }
                }}
                className={`w-full px-4 py-3 rounded-lg border text-center text-3xl tracking-widest ${
                  errors.code 
                    ? 'border-red-500 dark:border-red-600' 
                    : 'border-zinc-300 dark:border-zinc-700'
                } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.code ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
                placeholder="000000"
                disabled={isLoading}
                maxLength={6}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.code}
                </p>
              )}
            </div>

            {timeLeft > 0 && (
              <p className="text-sm text-center" style={{ color: 'rgba(242,241,237,0.7)' }}>
                El código expira en: <strong>{formatTime(timeLeft)}</strong>
              </p>
            )}

            {timeLeft === 0 && (
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode('');
                }}
                className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#F2F1ED' }}
              >
                Reenviar Código
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#710014' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#710014'}
            >
              {isLoading ? 'Verificando...' : 'Verificar Código'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setCodeSent(false);
                setCode('');
                setPhone('');
              }}
              className="text-sm transition-colors"
              style={{ color: '#F2F1ED' }}
              disabled={isLoading}
            >
              ← Cambiar número de teléfono
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg shadow-lg p-8 border" style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)' }}>
        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#F2F1ED' }}>
          Recuperar por SMS
        </h2>
        <p className="text-center mb-6 text-sm" style={{ color: '#F2F1ED' }}>
          Ingresa tu número de teléfono y te enviaremos un código de verificación
        </p>
        
        <form onSubmit={handleSendCode} className="space-y-5">
          {errors.general && (
            <div className="p-3 rounded-lg border" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
              <p className="text-sm text-center" style={{ color: '#F2F1ED' }}>{errors.general}</p>
            </div>
          )}
          <div>
            <label 
              htmlFor="phone" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#F2F1ED' }}
            >
              Número de Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.phone;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.phone 
                  ? 'border-red-500 dark:border-red-600' 
                  : 'border-zinc-300 dark:border-zinc-700'
              } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.phone ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
              placeholder="+1 234 567 8900"
              disabled={isLoading}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.phone}
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: 'rgba(242,241,237,0.7)' }}>
              Incluye el código de país (ej: +1, +52)
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || countdown !== null}
            className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#710014' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#710014'}
          >
            {isLoading ? 'Enviando...' : countdown !== null ? `Espera ${countdown}s` : 'Enviar Código SMS'}
          </button>
          {countdown !== null && countdown > 0 && (
            <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', borderColor: 'var(--warning)' }}>
              <p className="text-sm text-center" style={{ color: 'var(--warning)' }}>
                ⏱️ Puedes intentar nuevamente en: <strong>{countdown}</strong> segundos
              </p>
            </div>
          )}
        </form>

        {(onSwitchToEmail || onSwitchToSecurityQuestions) && (
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2">
              {onSwitchToEmail && (
                <button
                  onClick={onSwitchToEmail}
                  className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#F2F1ED' }}
                  disabled={isLoading}
                >
                  Recuperar por Email
                </button>
              )}
              {onSwitchToSecurityQuestions && (
                <button
                  onClick={onSwitchToSecurityQuestions}
                  className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#F2F1ED' }}
                  disabled={isLoading}
                >
                  Recuperar por Preguntas de Seguridad
                </button>
              )}
            </div>
          </div>
        )}

        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-sm transition-colors"
              style={{ color: '#F2F1ED' }}
              disabled={isLoading}
            >
              ← Volver a Iniciar Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

