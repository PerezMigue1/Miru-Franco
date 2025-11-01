'use client';

import { useState } from 'react';

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
      const { api } = await import('@/lib/api');
      await api.forgotPassword(email, 'email');
      setIsSent(true);
    } catch (error: any) {
      console.error('Error enviando email:', error);
      setErrors({ email: error.message || 'Error al enviar el email' });
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
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 border border-zinc-200 dark:border-zinc-800">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">
              Email Enviado
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Hemos enviado un enlace de recuperación a <strong>{email}</strong>
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-6">
              Por favor revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleBackToLogin}
                className="w-full py-3 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Volver a Iniciar Sesión
              </button>
              <button
                onClick={handleResendEmail}
                className="w-full py-3 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
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
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-2xl font-bold text-center mb-2 text-zinc-900 dark:text-zinc-50">
          Recuperar Contraseña
        </h2>
        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300"
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
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.email 
                  ? 'border-red-500 dark:border-red-600' 
                  : 'border-zinc-300 dark:border-zinc-700'
              } bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 transition-colors`}
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
            className="w-full py-3 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
          </button>
        </form>

        {(onSwitchToSMS || onSwitchToSecurityQuestions) && (
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2">
              {onSwitchToSMS && (
                <button
                  onClick={onSwitchToSMS}
                  className="w-full py-2 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm"
                  disabled={isLoading}
                >
                  Recuperar por SMS
                </button>
              )}
              {onSwitchToSecurityQuestions && (
                <button
                  onClick={onSwitchToSecurityQuestions}
                  className="w-full py-2 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm"
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
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
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

