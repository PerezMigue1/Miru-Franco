'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Timer } from 'lucide-react';

const PRIMARIO = {
  ['--btn-bg' as string]: 'var(--botones-principales)',
  ['--btn-bg-hover' as string]: 'var(--hover)',
  ['--btn-texto' as string]: 'var(--marfil)',
} as React.CSSProperties;

const SECUNDARIO = {
  ['--btn-bg' as string]: 'transparent',
  ['--btn-texto' as string]: 'var(--menu-texto-principal)',
  ['--btn-borde' as string]: '1.5px solid var(--mf-linea-fuerte)',
  ['--btn-bg-hover' as string]: 'var(--nav-hover-bg)',
  ['--btn-borde-hover' as string]: 'var(--menu-texto-principal)',
} as React.CSSProperties;

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
        <div>
          <h2 className="mf-titulo-pagina text-center mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Código de Verificación
          </h2>
          <p className="text-center mb-6 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Hemos enviado un código de 6 dígitos a <strong style={{ color: 'var(--menu-texto-principal)' }}>{phone}</strong>
          </p>

          <form onSubmit={handleVerifyCode} className="space-y-5">
            {errors.general && (
              <div className="mb-4 p-3 rounded-[10px] border" role="status" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
                <p className="text-sm text-center" style={{ color: 'var(--menu-texto-principal)' }}>{errors.general}</p>
              </div>
            )}
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--menu-texto-principal)' }}
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
                className="mf-campo w-full px-4 py-3 text-center text-3xl tracking-widest"
                aria-invalid={Boolean(errors.code)}
                placeholder="000000"
                disabled={isLoading}
                maxLength={6}
              />
              {errors.code && (
                <p className="mt-1 text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>
                  {errors.code}
                </p>
              )}
            </div>

            {timeLeft > 0 && (
              <p className="text-sm text-center" style={{ color: 'var(--encabezados-alterno)' }}>
                El código expira en: <strong style={{ color: 'var(--menu-texto-principal)' }}>{formatTime(timeLeft)}</strong>
              </p>
            )}

            {timeLeft === 0 && (
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode('');
                }}
                className="mf-btn mf-btn-color w-full min-h-11 py-2 px-4 rounded-[10px] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={SECUNDARIO}
              >
                Reenviar Código
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={PRIMARIO}
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
              className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
              disabled={isLoading}
            >
              <ArrowLeft size={16} aria-hidden />
              Cambiar número de teléfono
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div>
        <h2 className="mf-titulo-pagina text-center mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Recuperar por SMS
        </h2>
        <p className="text-center mb-6 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
          Ingresa tu número de teléfono y te enviaremos un código de verificación
        </p>

        <form onSubmit={handleSendCode} className="space-y-5">
          {errors.general && (
            <div className="p-3 rounded-[10px] border" role="status" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
              <p className="text-sm text-center" style={{ color: 'var(--menu-texto-principal)' }}>{errors.general}</p>
            </div>
          )}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--menu-texto-principal)' }}
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
              className="mf-campo w-full px-4 py-3"
              aria-invalid={Boolean(errors.phone)}
              placeholder="+1 234 567 8900"
              disabled={isLoading}
            />
            {errors.phone && (
              <p className="mt-1 text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>
                {errors.phone}
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
              Incluye el código de país (ej: +1, +52)
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || countdown !== null}
            className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={PRIMARIO}
          >
            {isLoading ? 'Enviando...' : countdown !== null ? `Espera ${countdown}s` : 'Enviar Código SMS'}
          </button>
          {countdown !== null && countdown > 0 && (
            <div className="mt-4 p-3 rounded-[10px] border" style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)', borderColor: 'var(--warning)' }}>
              <p className="flex items-center justify-center gap-2 text-sm text-center" style={{ color: 'var(--warning-texto)' }}>
                <Timer size={16} aria-hidden className="shrink-0" />
                <span>Puedes intentar nuevamente en: <strong>{countdown}</strong> segundos</span>
              </p>
            </div>
          )}
        </form>

        {(onSwitchToEmail || onSwitchToSecurityQuestions) && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
            <p className="text-center text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2">
              {onSwitchToEmail && (
                <button
                  onClick={onSwitchToEmail}
                  className="mf-btn mf-btn-color w-full min-h-11 py-2 px-4 rounded-[10px] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={SECUNDARIO}
                  disabled={isLoading}
                >
                  Recuperar por Email
                </button>
              )}
              {onSwitchToSecurityQuestions && (
                <button
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

        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToLogin}
              className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
              disabled={isLoading}
            >
              <ArrowLeft size={16} aria-hidden />
              Volver a Iniciar Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
