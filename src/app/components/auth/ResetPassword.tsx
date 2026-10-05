'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, Timer, TriangleAlert } from 'lucide-react';
import { validatePassword, removeToken } from '../../utils/security';
import Notification from '../ui/Notification';

const PRIMARIO = {
  ['--btn-bg' as string]: 'var(--botones-principales)',
  ['--btn-bg-hover' as string]: 'var(--hover)',
  ['--btn-texto' as string]: 'var(--marfil)',
} as React.CSSProperties;

interface ResetPasswordProps {
  onSwitchToLogin?: () => void;
  onPasswordReset?: () => void;
  identifier?: string; // email o teléfono
  token?: string; // Token de la URL (para enlace de recuperación)
  email?: string; // Email de la URL (para enlace de recuperación)
}

export default function ResetPassword({ 
  onSwitchToLogin,
  onPasswordReset,
  identifier,
  token: tokenFromProps,
  email: emailFromProps
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
  const [tokenValidado, setTokenValidado] = useState(false);
  const [validandoToken, setValidandoToken] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState<string>('');

  // Validar token si viene de la URL (enlace de recuperación)
  useEffect(() => {
    if (tokenFromProps && emailFromProps) {
      validarTokenRecuperacion(emailFromProps, tokenFromProps);
    } else {
      // Si no viene de URL, usar el flujo normal (OTP o preguntas de seguridad)
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
      } else {
        // Si no hay token ni en URL ni en localStorage, el token ya está validado (flujo normal)
        // Esto permite que el formulario se muestre para OTP o preguntas de seguridad
        setTokenValidado(true);
      }
    }
  }, [tokenFromProps, emailFromProps]);

  const validarTokenRecuperacion = async (email: string, token: string) => {
    setValidandoToken(true);
    setErrors({});
    
    try {
      const { api } = await import('../../services');
      const result = await api.validarTokenRecuperacion(email, token);
      
      if (result.success && result.valid) {
        setTokenValidado(true);
        if (result.nombre) {
          setNombreUsuario(result.nombre);
        }
        // Guardar token para usarlo después
        localStorage.setItem('resetPasswordToken', token);
        localStorage.setItem('resetPasswordEmail', email);
        // El token del enlace expira en 60 minutos según el backend
        localStorage.setItem('resetPasswordExpires', String(Date.now() + 60 * 60 * 1000));
      } else {
        setErrors({ 
          general: result.error || result.message || 'Token inválido, expirado o ya utilizado' 
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al validar el token';
      setErrors({ general: errorMessage });
    } finally {
      setValidandoToken(false);
    }
  };

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
    e.stopPropagation(); // Prevenir recarga de página
    
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
      const email = emailFromProps || identifier || emailFromLocalStorage;
      // Nunca registrar el token de recuperación (ni parcial) ni el correo en consola.

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
      
      const result = await api.resetPassword(token, email, formData.password);
      
      // Verificar que el cambio fue exitoso
      if (!result.success) {
        throw new Error(result.error || result.message || 'Error al cambiar la contraseña');
      }
      
      console.log('✅ Contraseña cambiada exitosamente');

      // ✅ Limpiar TODOS los tokens después de cambiar la contraseña
      // Esto incluye tokens de autenticación y tokens temporales de recuperación
      removeToken(); // Limpia token y authToken
      localStorage.removeItem('resetPasswordToken');
      localStorage.removeItem('resetPasswordEmail');
      localStorage.removeItem('resetPasswordExpires');
      localStorage.removeItem('user'); // Limpiar datos del usuario también
      sessionStorage.clear(); // Limpiar toda la sesión
      
      // Limpiar también los parámetros de la URL si vienen de ahí
      if (typeof window !== 'undefined' && (tokenFromProps || emailFromProps)) {
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        url.searchParams.delete('email');
        window.history.replaceState({}, '', url.toString());
      }
      
      setIsSuccess(true);
      
      // Esperar un momento antes de redirigir al login cuando se complete el cambio de contraseña
      setTimeout(() => {
        onPasswordReset?.();
      }, 2000);
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
        // NO borrar los datos del formulario, solo mostrar el error
        setErrors(prev => ({ 
          ...prev,
          password: 'La nueva contraseña debe ser diferente a la contraseña anterior',
          general: '⚠️ La nueva contraseña debe ser diferente a la contraseña anterior'
        }));
      } else {
        // NO borrar los datos del formulario, solo mostrar el error
        setErrors(prev => ({ 
          ...prev,
          general: errorMessage 
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Si viene token de URL y aún no está validado, mostrar loading
  if (tokenFromProps && !tokenValidado) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div>
          <div className="text-center">
            {validandoToken ? (
              <div role="status">
                <div
                  className="mx-auto w-12 h-12 border-4 rounded-full animate-spin mb-4"
                  style={{ borderColor: 'var(--mf-linea-fuerte)', borderTopColor: 'var(--menu-texto-principal)' }}
                  aria-hidden
                ></div>
                <h2 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Validando enlace...
                </h2>
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  Por favor espera mientras validamos tu enlace de recuperación
                </p>
              </div>
            ) : errors.general ? (
              <>
                <div className="mb-4">
                  <Notification
                    type="error"
                    message={errors.general}
                  />
                </div>
                {onSwitchToLogin && (
                  <button
                    onClick={onSwitchToLogin}
                    className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={PRIMARIO}
                  >
                    Ir a Iniciar Sesión
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div>
          <div className="text-center">
            <div className="mb-4">
              <Notification
                type="success"
                message="Contraseña restablecida exitosamente. Usa tu nueva contraseña para iniciar sesión."
              />
            </div>
            {onSwitchToLogin && (
              <button
                onClick={onSwitchToLogin}
                className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={PRIMARIO}
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
      <div>
        <h2 className="mf-titulo-pagina text-center mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Nueva Contraseña
        </h2>
        {nombreUsuario ? (
          <p className="text-center mb-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Hola <strong style={{ color: 'var(--menu-texto-principal)' }}>{nombreUsuario}</strong>, ingresa tu nueva contraseña
          </p>
        ) : (
          <p className="text-center mb-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Ingresa tu nueva contraseña
          </p>
        )}
        <div
          className="mb-4 p-3 rounded-[10px] border"
          style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)', borderColor: 'var(--warning)' }}
        >
          <p className="flex items-center justify-center gap-2 text-xs text-center" style={{ color: 'var(--warning-texto)' }}>
            <TriangleAlert size={16} aria-hidden className="shrink-0" />
            <span>La nueva contraseña debe ser diferente a la contraseña anterior</span>
          </p>
        </div>

        {timeRemaining !== null && timeRemaining > 0 && (
          <div
            className="mb-4 p-3 rounded-[10px] border"
            style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)', borderColor: 'var(--warning)' }}
          >
            <p className="flex items-center justify-center gap-2 text-sm text-center mf-cifras" style={{ color: 'var(--warning-texto)' }}>
              <Timer size={16} aria-hidden className="shrink-0" />
              <span>Tiempo restante: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="mf-campo w-full px-4 py-3 pr-12"
                aria-invalid={Boolean(errors.password)}
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-[10px]"
                style={{ color: 'var(--campo-placeholder)' }}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={19} aria-hidden /> : <Eye size={19} aria-hidden />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>
                {errors.password}
              </p>
            )}
            {passwordErrors.length > 0 && (
              <div className="mt-1 space-y-1">
                {passwordErrors.map((error, i) => (
                  <p key={i} className="text-xs" style={{ color: 'var(--danger-texto)' }}>
                    • {error}
                  </p>
                ))}
              </div>
            )}
            {passwordErrors.length === 0 && formData.password && (
              <div className="mt-1">
                <p className="flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--success-texto)' }}>
                  <Check size={13} aria-hidden />
                  Contraseña válida
                </p>
                {passwordStrength && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--menu-texto-principal)' }}>Fortaleza:</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                      <div
                        className={`h-full transition-[width] duration-300 ${
                          passwordStrength === 'strong'
                            ? 'bg-[color:var(--success)] w-full'
                            : passwordStrength === 'medium'
                            ? 'bg-[color:var(--warning)] w-2/3'
                            : 'bg-[color:var(--danger-texto)] w-1/3'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength === 'strong'
                          ? 'text-[color:var(--success-texto)]'
                          : passwordStrength === 'medium'
                          ? 'text-[color:var(--warning-texto)]'
                          : 'text-[color:var(--danger-texto)]'
                      }`}
                    >
                      {passwordStrength === 'strong' ? 'Fuerte' : passwordStrength === 'medium' ? 'Media' : 'Débil'}
                    </span>
                  </div>
                )}
              </div>
            )}
            {passwordErrors.length === 0 && !formData.password && (
              <p className="mt-1 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                Mínimo 8 caracteres, con mayúsculas, minúsculas, números y caracteres especiales
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className="mf-campo w-full px-4 py-3 pr-12"
                aria-invalid={Boolean(errors.confirmPassword)}
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-[10px]"
                style={{ color: 'var(--campo-placeholder)' }}
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={19} aria-hidden /> : <Eye size={19} aria-hidden />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {errors.general && (
            <div className="mb-4">
              <Notification
                type="error"
                message={errors.general}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={PRIMARIO}
          >
            {isLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}
          </button>
        </form>

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
