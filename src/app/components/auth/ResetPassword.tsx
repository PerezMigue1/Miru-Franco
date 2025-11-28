'use client';

import { useState } from 'react';
import { validatePassword } from '../../utils/security';

interface ResetPasswordProps {
  onSwitchToLogin?: () => void;
  onPasswordReset?: () => void;
  identifier?: string; // email o teléfono
}

export default function ResetPassword({ 
  onSwitchToLogin,
  onPasswordReset,
  identifier
}: ResetPasswordProps) {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // ✅ Usar validación centralizada de seguridad
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else {
      const validation = validatePassword(formData.password);
      if (!validation.valid) {
        newErrors.password = validation.message || 'La contraseña no cumple con los requisitos';
      }
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const { api } = await import('../../services');
      const urlParams = new URLSearchParams(window.location.search);
      // Obtener token de la URL o de sessionStorage (flujo interno)
      const tokenFromUrl = urlParams.get('token');
      const tokenFromStorage = sessionStorage.getItem('resetToken');
      const token = tokenFromUrl || tokenFromStorage;
      if (tokenFromStorage) {
        sessionStorage.removeItem('resetToken'); // Limpiar después de usarlo
      }
      
      await api.resetPassword(token, identifier || null, formData.password);
      setIsSuccess(true);
      onPasswordReset?.();
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al restablecer la contraseña. Intenta nuevamente.';
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-lg shadow-lg p-8 border" style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-page-title mb-2" style={{ color: '#F2F1ED' }}>
              Contraseña Restablecida
            </h2>
            <p className="mb-6" style={{ color: '#F2F1ED' }}>
              Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            {onSwitchToLogin && (
              <button
                onClick={onSwitchToLogin}
                className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#710014' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A64B63'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#710014'}
              >
                Ir a Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg shadow-lg p-8 border" style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)' }}>
        <h2 className="text-page-title text-center mb-2" style={{ color: '#F2F1ED' }}>
          Nueva Contraseña
        </h2>
        <p className="text-center mb-6 text-sm" style={{ color: '#F2F1ED' }}>
          Ingresa tu nueva contraseña
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#F2F1ED' }}
            >
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.password 
                    ? 'border-red-500 dark:border-red-600' 
                    : 'border-zinc-300 dark:border-zinc-700'
                } focus:outline-none focus:ring-2 transition-colors pr-12`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.password ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.password}
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Mínimo 8 caracteres, con mayúsculas, minúsculas y números
            </p>
          </div>

          <div>
            <label 
              htmlFor="confirmPassword" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#F2F1ED' }}
            >
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.confirmPassword 
                    ? 'border-red-500 dark:border-red-600' 
                    : 'border-zinc-300 dark:border-zinc-700'
                } focus:outline-none focus:ring-2 transition-colors pr-12`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.password ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {errors.general && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.general}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#710014' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A64B63'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#710014'}
          >
            {isLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}
          </button>
        </form>

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

