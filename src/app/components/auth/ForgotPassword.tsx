'use client';

import { useState } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';

interface ForgotPasswordProps {
  onSwitchToLogin?: () => void;
  onEmailSent?: (email: string) => void; // Ahora pasa el email
  onSwitchToSMS?: () => void;
  onSwitchToSecurityQuestions?: () => void;
  onCodeSent?: (email: string) => void; // Nuevo callback para cuando se envía código OTP
}

export default function ForgotPassword({ 
  onSwitchToLogin,
  onEmailSent,
  onSwitchToSMS,
  onSwitchToSecurityQuestions,
  onCodeSent
}: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

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
    setErrors({}); // Limpiar errores previos
    
    try {
      const { api } = await import('../../services');
      // ✅ Enviar código OTP para recuperación de contraseña
      const result = await api.sendPasswordRecoveryOTP(email);
      
      if (result.success) {
        // ✅ Código enviado exitosamente - redirigir automáticamente a verificación OTP
        onCodeSent?.(email); // Pasar email al callback para cambiar a vista OTP
        onEmailSent?.(email);
        // No mostrar mensaje de éxito, redirigir directamente
      } else {
        // ❌ Error al enviar código
        const errorMessage = result.error || result.message || 'Error al enviar el código de verificación';
        setErrors({ email: errorMessage });
      }
    } catch (error: unknown) {
      console.error('Error enviando código de recuperación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar el código de verificación';
      setErrors({ email: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    onSwitchToLogin?.();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
        <h2 className="text-page-title text-center mb-2 text-texto-fondo-oscuro">
          Recuperar Contraseña
        </h2>
        <p className="text-center mb-6 text-sm text-texto-fondo-oscuro">
          Ingresa tu correo electrónico y te enviaremos un código de verificación para restablecer tu contraseña
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
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
                borderColor: errors.email ? colors.danger : colorsWithOpacity.bordeVisible
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
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-botones-principales"
            style={{ backgroundColor: colors.botonesPrincipales }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.botonesPrincipales}
          >
            {isLoading ? 'Enviando código...' : 'Enviar Código de Verificación'}
          </button>
        </form>

        {(onSwitchToSMS || onSwitchToSecurityQuestions) && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
            <p className="text-center text-sm mb-4 text-texto-fondo-oscuro">
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2">
              {onSwitchToSMS && (
                <button
                  onClick={onSwitchToSMS}
                  className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm text-texto-fondo-oscuro"
                  style={{ borderColor: colorsWithOpacity.bordeSecundario }}
                  disabled={isLoading}
                >
                  Recuperar por SMS
                </button>
              )}
              {onSwitchToSecurityQuestions && (
                <button
                  onClick={onSwitchToSecurityQuestions}
                  className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm text-texto-fondo-oscuro"
                  style={{ borderColor: colorsWithOpacity.bordeSecundario }}
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
              className="text-sm transition-colors text-texto-fondo-oscuro hover:opacity-80"
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

