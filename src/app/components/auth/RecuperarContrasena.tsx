'use client';

import { useState } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';

interface ForgotPasswordProps {
  onSwitchToLogin?: () => void;
  onEmailSent?: () => void;
  onSwitchToSMS?: () => void;
  onSwitchToSecurityQuestions?: () => void;
}

export default function ForgotPassword({ 
  onSwitchToLogin,
  onEmailSent,
  onSwitchToSMS,
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
        <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-page-title mb-2 text-texto-fondo-oscuro">
              Email Enviado
            </h2>
            <p className="mb-6 text-texto-fondo-oscuro">
              Hemos enviado un enlace de recuperación a <strong>{email}</strong>
            </p>
            <p className="text-sm mb-6" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
              Por favor revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleBackToLogin}
                className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors"
                style={{ backgroundColor: colors.botonesPrincipales }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.botonesPrincipales}
              >
                Volver a Iniciar Sesión
              </button>
              <button
                onClick={handleResendEmail}
                className="w-full py-3 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-texto-fondo-oscuro"
                style={{ borderColor: colorsWithOpacity.bordeSecundario }}
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
      <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
        <h2 className="text-page-title text-center mb-2 text-texto-fondo-oscuro">
          Recuperar Contraseña
        </h2>
        <p className="text-center mb-6 text-sm text-texto-fondo-oscuro">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-texto-fondo-oscuro">
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
              style={{ borderColor: errors.email ? colors.danger : colorsWithOpacity.bordeVisible }}
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
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: colors.botonesPrincipales }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.botonesPrincipales}
          >
            {isLoading ? 'Enviando...' : 'Enviar Enlace'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
          <p className="text-center text-sm" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
            Otras opciones de recuperación:
          </p>
          <div className="space-y-2 mt-4">
            {onSwitchToSMS && (
              <button
                onClick={onSwitchToSMS}
                className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm"
                style={{ borderColor: colorsWithOpacity.bordeSecundario, color: colors.textoFondoOscuro }}
                disabled={isLoading}
              >
                Recuperar por SMS
              </button>
            )}
            {onSwitchToSecurityQuestions && (
              <button
                onClick={onSwitchToSecurityQuestions}
                className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm"
                style={{ borderColor: colorsWithOpacity.bordeSecundario, color: colors.textoFondoOscuro }}
                disabled={isLoading}
              >
                Recuperar por Preguntas de Seguridad
              </button>
            )}
          </div>
        </div>

        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-sm transition-colors"
              style={{ color: colors.textoFondoOscuro }}
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
