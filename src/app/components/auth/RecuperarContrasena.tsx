'use client';

import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';

const PRIMARIO = {
  ['--btn-bg' as string]: 'var(--botones-principales)',
  ['--btn-bg-hover' as string]: 'var(--hover)',
  ['--btn-texto' as string]: '#F2F1ED',
} as React.CSSProperties;

const SECUNDARIO = {
  ['--btn-bg' as string]: 'transparent',
  ['--btn-texto' as string]: 'var(--menu-texto-principal)',
  ['--btn-borde' as string]: '1.5px solid var(--mf-linea-fuerte)',
  ['--btn-bg-hover' as string]: 'var(--nav-hover-bg)',
  ['--btn-borde-hover' as string]: 'var(--menu-texto-principal)',
} as React.CSSProperties;

interface ForgotPasswordProps {
  onSwitchToLogin?: () => void;
  onEmailSent?: () => void;
  onSwitchToSecurityQuestions?: () => void;
}

export default function ForgotPassword({ 
  onSwitchToLogin,
  onEmailSent,
  onSwitchToSecurityQuestions
}: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

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
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const { api } = await import('../../services');
      await api.forgotPassword(email, 'email');
      setIsSent(true);
    } catch (error: unknown) {
      console.error('Error enviando email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar el email';
      setErrors({ email: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    onSwitchToLogin?.();
  };

  const handleResendEmail = () => {
    setIsSent(false);
    setEmail('');
    onEmailSent?.();
  };

  if (isSent) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div>
          <div className="text-center">
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'color-mix(in srgb, var(--success) 18%, transparent)', color: 'var(--success-texto)' }}
            >
              <Check size={30} aria-hidden />
            </div>
            <h2 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              Email Enviado
            </h2>
            <p className="mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
              Hemos enviado un enlace de recuperación a <strong className="break-all" style={{ color: 'var(--menu-texto-principal)' }}>{email}</strong>
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
              Por favor revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleBackToLogin}
                className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={PRIMARIO}
              >
                Volver a Iniciar Sesión
              </button>
              <button
                onClick={handleResendEmail}
                className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={SECUNDARIO}
              >
                Reenviar Email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div>
        <h2 className="mf-titulo-pagina text-center mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Recuperar Contraseña
        </h2>
        <p className="text-center mb-6 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
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
            disabled={isLoading}
            className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={PRIMARIO}
          >
            {isLoading ? 'Enviando...' : 'Enviar Enlace'}
          </button>
        </form>

        {onSwitchToSecurityQuestions && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
            <p className="text-center text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2 mt-4">
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
