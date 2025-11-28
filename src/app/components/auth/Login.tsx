'use client';

import { useState } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';
import { handleSecurityError } from '../../utils/security';
import ActivateAccount from './ActivateAccount';

interface LoginProps {
  onSwitchToRegister?: () => void;
  onSwitchToRecovery?: () => void;
  onLoginSuccess?: () => void;
}

export default function Login({ 
  onSwitchToRegister, 
  onSwitchToRecovery,
  onLoginSuccess 
}: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // Guardar credenciales para reintentar login después de verificar
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }
    
    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
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
      const result = await api.login(email, password);
      
      if (!result.success) {
        const errorMessage = result.error || 'Error al iniciar sesión';
        const lowerError = errorMessage.toLowerCase();
        
        // Detectar si la cuenta no está verificada/activada
        const cuentaNoVerificada = result.requiereVerificacion || 
            lowerError.includes('no está activada') ||
            lowerError.includes('no está activado') ||
            lowerError.includes('no está verificada') ||
            lowerError.includes('no está verificado') ||
            lowerError.includes('no está confirmada') ||
            lowerError.includes('no está confirmado') ||
            lowerError.includes('revisa tu correo') ||
            lowerError.includes('cuenta no activada') ||
            lowerError.includes('activar tu cuenta') ||
            lowerError.includes('activada') ||
            lowerError.includes('activar') ||
            lowerError.includes('confirmada') ||
            lowerError.includes('verificar');
        
        if (cuentaNoVerificada) {
          // Guardar credenciales para reintentar login después de verificar
          setPendingCredentials({ email, password });
          // Mostrar automáticamente la pantalla de activación
          setShowActivation(true);
          // No mostrar error general cuando se muestra la pantalla de activación
          setErrors({});
      } else {
        // ✅ Usar utilidad de seguridad para manejar errores (no revelar detalles)
        const securityError = handleSecurityError(new Error(errorMessage));
        setErrors({ general: securityError.message });
      }
      } else {
        // Login exitoso
        setShowActivation(false); // Asegurar que no se muestre la pantalla de activación
        onLoginSuccess?.();
      }
    } catch (error: unknown) {
      console.error('Error en login:', error);
      
      // ✅ Usar utilidad de seguridad para manejar errores (ya importada arriba)
      const securityError = handleSecurityError(error);
      
      // Verificar si el error es sobre cuenta no verificada
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
      const lowerError = errorMessage.toLowerCase();
      
      const cuentaNoVerificada = lowerError.includes('no está activada') ||
          lowerError.includes('no está activado') ||
          lowerError.includes('no está verificada') ||
          lowerError.includes('no está verificado') ||
          lowerError.includes('no está confirmada') ||
          lowerError.includes('no está confirmado') ||
          lowerError.includes('revisa tu correo') ||
          lowerError.includes('cuenta no activada') ||
          lowerError.includes('activar tu cuenta') ||
          lowerError.includes('activada') ||
          lowerError.includes('activar') ||
          lowerError.includes('confirmada') ||
          lowerError.includes('verificar');
      
      if (cuentaNoVerificada) {
        // Guardar credenciales para reintentar login después de verificar
        setPendingCredentials({ email, password });
        // Mostrar automáticamente la pantalla de activación
        setShowActivation(true);
        // No mostrar error general cuando se muestra la pantalla de activación
        setErrors({});
      } else {
        // ✅ Usar mensaje de seguridad (no revelar detalles)
        setErrors({ general: securityError.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // ✅ CORRECTO: Redirección directa del navegador (según guía GUIA_FRONTEND_GOOGLE_OAUTH.md)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://miru-franco.onrender.com';
    const redirectUrl = `${API_URL}/api/auth/google`;
    window.location.href = redirectUrl;
    // Nota: No necesitamos manejar errores aquí porque la redirección es inmediata
    // El usuario será redirigido a Google para autenticarse
  };

  const handleResendCode = async () => {
    if (!email) {
      setErrors({ general: 'Por favor, ingresa tu correo electrónico primero' });
      return;
    }

    setIsResending(true);
    setErrors({});

    try {
      const { api } = await import('../../services');
      const result = await api.resendOTPCode(email);
      
      if (result.success) {
        setErrors({ general: '✅ Código reenviado. Revisa tu correo.' });
      } else {
        setErrors({ general: result.error || 'Error al reenviar el código' });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al reenviar el código';
      setErrors({ general: errorMessage });
    } finally {
      setIsResending(false);
    }
  };

  // Si se requiere activación, mostrar pantalla de activación
  if (showActivation && email) {
    return (
      <ActivateAccount
        email={email}
        onActivationSuccess={async () => {
          setShowActivation(false);
          // Intentar login nuevamente después de activar
          setIsLoading(true);
          setErrors({}); // Limpiar errores previos
          
          // Usar credenciales pendientes si existen, de lo contrario usar las del estado
          const loginEmail = pendingCredentials?.email || email;
          const loginPassword = pendingCredentials?.password || password;
          
          try {
            const { api } = await import('../../services');
            const result = await api.login(loginEmail, loginPassword);
            if (result.success) {
              // Limpiar credenciales pendientes
              setPendingCredentials(null);
              setErrors({});
              onLoginSuccess?.();
            } else {
              setErrors({ general: result.error || 'Error al iniciar sesión. Por favor, intenta nuevamente.' });
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
            setErrors({ general: errorMessage });
          } finally {
            setIsLoading(false);
          }
        }}
        onBackToRegister={() => {
          // Volver al formulario de login
          setShowActivation(false);
          setPendingCredentials(null);
        }}
        onSkipToLogin={() => {
          // Si el usuario no quiere verificar ahora, volver al login
          setShowActivation(false);
          setPendingCredentials(null);
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
        <h2 className="text-page-title text-center mb-6 text-texto-fondo-oscuro">
          Iniciar Sesión
        </h2>
        
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

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium mb-2 text-texto-fondo-oscuro"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.password;
                      return newErrors;
                    });
                  }
                }}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors pr-12 bg-texto-fondo-oscuro text-header-footer"
              style={{ 
                  borderColor: errors.password ? colors.danger : colorsWithOpacity.bordeVisible
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
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onSwitchToRecovery}
              className="text-sm transition-colors text-texto-fondo-oscuro hover:opacity-80"
              disabled={isLoading}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {errors.general && (
            <div className="text-center">
              <p className={`text-sm ${
                errors.general.includes('✅') 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {errors.general}
              </p>
              {errors.general.toLowerCase().includes('activada') || 
               errors.general.toLowerCase().includes('activar') ||
               errors.general.toLowerCase().includes('confirmada') ? (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending || !email}
                  className="mt-2 text-sm font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: colors.enlacesTextosInteractivos }}
                >
                  {isResending ? 'Enviando...' : 'Reenviar código de activación'}
                </button>
              ) : null}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-botones-principales"
            style={{ backgroundColor: colors.botonesPrincipales }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.botonesPrincipales}
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t" style={{ borderColor: colorsWithOpacity.bordeSutil }}></div>
          <span className="px-4 text-sm text-texto-fondo-oscuro" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
            O
          </span>
          <div className="flex-1 border-t" style={{ borderColor: colorsWithOpacity.bordeSutil }}></div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full py-3 px-4 rounded-lg border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 bg-texto-fondo-oscuro hover:opacity-90"
          style={{ 
            borderColor: colorsWithOpacity.bordeVisible,
            color: colors.headerFooter 
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colorsWithOpacity.bordeSecundario;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colorsWithOpacity.bordeVisible;
          }}
        >
          {isGoogleLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Conectando con Google...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        {onSwitchToRegister && (
          <div className="mt-6 text-center">
            <p className="text-sm text-texto-fondo-oscuro">
              ¿No tienes una cuenta?{' '}
              <button
                onClick={onSwitchToRegister}
                className="font-medium hover:underline text-enlaces-textos-interactivos"
                style={{ color: colors.enlacesTextosInteractivos }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.hover}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.enlacesTextosInteractivos}
                disabled={isLoading}
              >
                Regístrate
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

