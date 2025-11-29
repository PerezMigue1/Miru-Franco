'use client';

import { useState, useEffect } from 'react';
import { validatePassword, removeToken } from '../../utils/security';

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
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Timer para mostrar tiempo restante del token (10 minutos)
  useEffect(() => {
    const expires = localStorage.getItem('resetPasswordExpires');
    if (expires) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, parseInt(expires) - Date.now());
        setTimeRemaining(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          setErrors({ general: 'El token ha expirado. Por favor inicia el proceso nuevamente.' });
          // Limpiar tokens temporales
          localStorage.removeItem('resetPasswordToken');
          localStorage.removeItem('resetPasswordEmail');
          localStorage.removeItem('resetPasswordExpires');
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // ✅ Usar validación centralizada de seguridad completa
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else {
      const validation = validatePassword(formData.password);
      if (!validation.valid) {
        // Mostrar el primer error o todos los errores
        newErrors.password = validation.errors?.[0] || validation.message || 'La contraseña no cumple con los requisitos';
        setPasswordErrors(validation.errors || []);
      } else {
        setPasswordErrors([]);
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
    
    // Validación en tiempo real de contraseña
    if (field === 'password') {
      const validation = validatePassword(value);
      if (!validation.valid && validation.errors) {
        setPasswordErrors(validation.errors);
      } else {
        setPasswordErrors([]);
      }
      
      // Actualizar indicador de fortaleza
      setPasswordStrength(validation.strength || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const { api } = await import('../../services');
      const urlParams = new URLSearchParams(window.location.search);
      
      // Obtener token de la URL, sessionStorage o localStorage
      const tokenFromUrl = urlParams.get('token');
      const tokenFromStorage = sessionStorage.getItem('resetToken');
      const tokenFromLocalStorage = localStorage.getItem('resetPasswordToken');
      const emailFromLocalStorage = localStorage.getItem('resetPasswordEmail');
      const expiresFromLocalStorage = localStorage.getItem('resetPasswordExpires');
      
      const token = tokenFromUrl || tokenFromStorage || tokenFromLocalStorage;
      const email = identifier || emailFromLocalStorage;
      
      // Verificar si el token expiró
      if (expiresFromLocalStorage && Date.now() > parseInt(expiresFromLocalStorage)) {
        localStorage.removeItem('resetPasswordToken');
        localStorage.removeItem('resetPasswordEmail');
        localStorage.removeItem('resetPasswordExpires');
        setErrors({ general: 'El token ha expirado. Por favor inicia el proceso nuevamente.' });
        return;
      }
      
      if (tokenFromStorage) {
        sessionStorage.removeItem('resetToken'); // Limpiar después de usarlo
      }
      
      await api.resetPassword(token, email, formData.password);
      
      // ✅ Limpiar TODOS los tokens después de cambiar la contraseña
      // Esto incluye tokens de autenticación y tokens temporales de recuperación
      removeToken(); // Limpia token y authToken
      localStorage.removeItem('resetPasswordToken');
      localStorage.removeItem('resetPasswordEmail');
      localStorage.removeItem('resetPasswordExpires');
      localStorage.removeItem('user'); // Limpiar datos del usuario también
      sessionStorage.clear(); // Limpiar toda la sesión
      
      setIsSuccess(true);
      onPasswordReset?.();
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al restablecer la contraseña. Intenta nuevamente.';
      
      // Verificar si el error es por token expirado
      if (errorMessage.toLowerCase().includes('expirado')) {
        localStorage.removeItem('resetPasswordToken');
        localStorage.removeItem('resetPasswordEmail');
        localStorage.removeItem('resetPasswordExpires');
      }
      
      // Verificar si el error es porque la contraseña es la misma que la anterior
      const lowerError = errorMessage.toLowerCase();
      if (lowerError.includes('misma') || 
          lowerError.includes('anterior') || 
          lowerError.includes('ya utilizada') ||
          lowerError.includes('igual a la anterior')) {
        setErrors({ 
          password: 'La nueva contraseña debe ser diferente a la contraseña anterior',
          general: 'La nueva contraseña debe ser diferente a la contraseña anterior'
        });
      } else {
        setErrors({ general: errorMessage });
      }
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
        <p className="text-center mb-4 text-sm" style={{ color: '#F2F1ED' }}>
          Ingresa tu nueva contraseña
        </p>
        <div className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-700/50">
          <p className="text-xs text-center" style={{ color: '#F2F1ED' }}>
            ⚠️ La nueva contraseña debe ser diferente a la contraseña anterior
          </p>
        </div>
        
        {timeRemaining !== null && timeRemaining > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50">
            <p className="text-sm text-center" style={{ color: '#F2F1ED' }}>
              ⏱️ Tiempo restante: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </p>
          </div>
        )}
        
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
            {passwordErrors.length > 0 && (
              <div className="mt-1 space-y-1">
                {passwordErrors.map((error, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400">
                    • {error}
                  </p>
                ))}
              </div>
            )}
            {passwordErrors.length === 0 && formData.password && (
              <div className="mt-1">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                  ✓ Contraseña válida
                </p>
                {passwordStrength && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#F2F1ED' }}>Fortaleza:</span>
                    <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          passwordStrength === 'strong'
                            ? 'bg-green-500 w-full'
                            : passwordStrength === 'medium'
                            ? 'bg-yellow-500 w-2/3'
                            : 'bg-red-500 w-1/3'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength === 'strong'
                          ? 'text-green-600'
                          : passwordStrength === 'medium'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {passwordStrength === 'strong' ? 'Fuerte' : passwordStrength === 'medium' ? 'Media' : 'Débil'}
                    </span>
                  </div>
                )}
              </div>
            )}
            {passwordErrors.length === 0 && !formData.password && (
              <p className="mt-1 text-xs" style={{ color: 'rgba(242,241,237,0.7)' }}>
                Mínimo 8 caracteres, con mayúsculas, minúsculas, números y caracteres especiales
              </p>
            )}
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

