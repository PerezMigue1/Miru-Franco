'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors, colorsWithOpacity } from '../../utils/colors';

interface ForgotPasswordProps {
  onSwitchToLogin?: () => void;
  onEmailSent?: (email: string) => void;
  onSwitchToSMS?: () => void;
  onSwitchToSecurityQuestions?: () => void;
}

export default function ForgotPassword({ 
  onSwitchToLogin,
  onEmailSent,
  onSwitchToSMS,
  onSwitchToSecurityQuestions
}: ForgotPasswordProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  
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
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({}); // Limpiar errores previos
    
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
      console.error('Error en recuperación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar la solicitud';
      setErrors({ general: errorMessage });
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
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
        </p>
        
        {errors.general && (
          <div className="mb-4 p-4 rounded-lg border" style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)'
          }}>
            <p className="text-sm text-center text-red-600 dark:text-red-400">
              {errors.general}
            </p>
          </div>
        )}
        
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
            {isLoading 
              ? 'Enviando enlace...'
              : 'Enviar Enlace de Recuperación'
            }
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

