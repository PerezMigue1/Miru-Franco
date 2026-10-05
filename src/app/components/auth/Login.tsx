'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleSecurityError } from '../../utils/security';
import { Eye, EyeOff, Timer } from 'lucide-react';
import Notification from '../ui/Notification';
import ActivateAccount from './ActivateAccount';
import { guardarRegresoParaGoogle } from './redireccionTrasLogin';
import LogoGoogle from './LogoGoogle';

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
  const router = useRouter();
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
  const [formDisabled, setFormDisabled] = useState(false);
  // Manejo de rate limiting para reenvío de código
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Usar refs para guardar valores y evitar que se borren
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  // Contador regresivo para rate limiting
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.general;
        return newErrors;
      });
    }
  }, [countdown]);
  
  // Funciones para navegar usando router
  const handleSwitchToRegister = () => {
    if (onSwitchToRegister) {
      onSwitchToRegister();
    } else {
      router.push('/register');
    }
  };
  
  const handleSwitchToRecovery = () => {
    if (onSwitchToRecovery) {
      onSwitchToRecovery();
    } else {
      router.push('/forgot-password');
    }
  };

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
    
    // NO borrar errores generales, solo actualizar errores de campos
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    // ✅ Prevenir recarga de página y reset del formulario - DEBE SER LO PRIMERO
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Prevenir cualquier comportamiento por defecto del formulario
      const nativeEvent = e.nativeEvent as Event;
      if (nativeEvent) {
        nativeEvent.preventDefault?.();
        nativeEvent.stopPropagation?.();
        if (typeof nativeEvent.stopImmediatePropagation === 'function') {
          nativeEvent.stopImmediatePropagation();
        }
      }
    }
    
    // Obtener valores directamente de los inputs usando refs
    const emailValue = emailRef.current?.value || email;
    const passwordValue = passwordRef.current?.value || password;
    
    // Actualizar estado con los valores de los inputs
    if (emailValue !== email) setEmail(emailValue);
    if (passwordValue !== password) setPassword(passwordValue);
    
    if (!validateForm()) {
      return false;
    }
    
    setIsLoading(true);
    // ✅ Limpiar solo errores generales, mantener errores de campos si existen
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });
    
    try {
      const { api } = await import('../../services');
      // Obtener valores directamente de los inputs para evitar problemas de estado
      const emailInput = emailRef.current?.value || email;
      const passwordInput = passwordRef.current?.value || password;
      const emailLimpio = emailInput.trim().toLowerCase();
      // Sin console.log del correo ni de la contraseña: el diagnóstico seguro (solo en
      // desarrollo, sin valores) ya lo hace api.login en services/auth.ts.
      const result = await api.login(emailLimpio, passwordInput);

      if (!result.success) {
        const errorMessage = result.error || 'Error al iniciar sesión';
        console.error('[Login] Error en login:', errorMessage);
        const lowerError = errorMessage.toLowerCase();
        
        // Verificar si el usuario viene de un cambio de contraseña exitoso
        // Si viene de un cambio de contraseña, ya verificó su identidad, no pedir OTP
        const vieneDeCambioPassword = typeof window !== 'undefined' && 
          new URLSearchParams(window.location.search).get('passwordChanged') === 'true';
        
        // Detectar si la cuenta no está verificada/activada
        // PERO solo si NO viene de un cambio de contraseña exitoso
        const cuentaNoVerificada = !vieneDeCambioPassword && (
          result.requiereVerificacion || 
          lowerError.includes('no está activada') ||
          lowerError.includes('no está activado') ||
          lowerError.includes('no está verificada') ||
          lowerError.includes('no está verificado') ||
          lowerError.includes('no está confirmada') ||
          lowerError.includes('no está confirmado') ||
          lowerError.includes('revisa tu correo') ||
          lowerError.includes('cuenta no activada') ||
          lowerError.includes('activar tu cuenta')
        );
        
        if (cuentaNoVerificada) {
          // Guardar credenciales para reintentar login después de verificar
          setPendingCredentials({ email, password });
          // Mostrar automáticamente la pantalla de activación
          setShowActivation(true);
          // No mostrar error general cuando se muestra la pantalla de activación
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.general;
            return newErrors;
          });
      } else {
        // ✅ Manejar bloqueo por fuerza bruta
        if (lowerError.includes('bloqueada') || lowerError.includes('bloqueado')) {
          const match = errorMessage.match(/(\d+)\s*minutos?/i);
          const minutos = match ? parseInt(match[1]) : 15;
          setFormDisabled(true);
          
          // NO borrar los datos del formulario, solo mostrar el error
          setErrors(prev => ({ 
            ...prev,
            general: `Tu cuenta está bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en ${minutos} minutos.` 
          }));
          
          // Habilitar formulario después del tiempo de bloqueo
          setTimeout(() => {
            setFormDisabled(false);
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.general;
              return newErrors;
            });
          }, minutos * 60 * 1000);
        } else {
          // Detectar errores específicos de email o contraseña
          const lowerError = errorMessage.toLowerCase();
          
          // Detectar si el error es sobre email incorrecto o no encontrado
          if (lowerError.includes('correo') || lowerError.includes('email') || 
              lowerError.includes('usuario no encontrado') || 
              lowerError.includes('no existe') ||
              lowerError.includes('no encontrado') ||
              lowerError.includes('no registrado')) {
            setErrors(prev => ({ 
              ...prev,
              email: 'El correo electrónico no está registrado o es incorrecto',
              general: 'Credenciales incorrectas. Verifica tu correo electrónico y contraseña.'
            }));
          } 
          // Detectar si el error es sobre contraseña incorrecta
          else if (lowerError.includes('contraseña') || lowerError.includes('password') || 
                   lowerError.includes('credenciales') || 
                   lowerError.includes('incorrecta') ||
                   lowerError.includes('inválida') ||
                   lowerError.includes('inválidas')) {
            setErrors(prev => ({ 
              ...prev,
              password: 'La contraseña es incorrecta',
              general: 'Credenciales incorrectas. Verifica tu correo electrónico y contraseña.'
            }));
          } 
          // Para otros errores, mostrar mensaje general pero mantener los campos
          else {
            const securityError = handleSecurityError(new Error(errorMessage));
            setErrors(prev => ({ 
              ...prev,
              general: securityError.message 
            }));
          }
        }
      }
      } else {
        // Login exitoso: la sesión quedó en la cookie httpOnly que emite el backend
        setShowActivation(false); // Asegurar que no se muestre la pantalla de activación

        // Llamar callback y redirigir
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          // Si no hay callback, redirigir directamente
          router.push('/home');
        }
      }
    } catch (error: unknown) {
      console.error('Error en login:', error);
      
      // ✅ Usar utilidad de seguridad para manejar errores (ya importada arriba)
      const securityError = handleSecurityError(error);
      
      // Verificar si el usuario viene de un cambio de contraseña exitoso
      // Si viene de un cambio de contraseña, ya verificó su identidad, no pedir OTP
      const vieneDeCambioPassword = typeof window !== 'undefined' && 
        new URLSearchParams(window.location.search).get('passwordChanged') === 'true';
      
      // Verificar si el error es sobre cuenta no verificada
      // PERO solo si NO viene de un cambio de contraseña exitoso
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
      const lowerError = errorMessage.toLowerCase();
      
      const cuentaNoVerificada = !vieneDeCambioPassword && (
        lowerError.includes('no está activada') ||
        lowerError.includes('no está activado') ||
        lowerError.includes('no está verificada') ||
        lowerError.includes('no está verificado') ||
        lowerError.includes('no está confirmada') ||
        lowerError.includes('no está confirmado') ||
        lowerError.includes('revisa tu correo') ||
        lowerError.includes('cuenta no activada') ||
        lowerError.includes('activar tu cuenta')
      );
      
      if (cuentaNoVerificada) {
        // Guardar credenciales para reintentar login después de verificar
        setPendingCredentials({ email, password });
        // Mostrar automáticamente la pantalla de activación
        setShowActivation(true);
        // No mostrar error general cuando se muestra la pantalla de activación
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.general;
          return newErrors;
        });
      } else {
        // Detectar errores específicos de email o contraseña
        if (lowerError.includes('correo') || lowerError.includes('email') || 
            lowerError.includes('usuario no encontrado') || 
            lowerError.includes('no existe') ||
            lowerError.includes('no encontrado') ||
            lowerError.includes('no registrado')) {
          // Mantener los valores de los campos y mostrar error específico
          setErrors(prev => ({ 
            ...prev,
            email: 'El correo electrónico no está registrado o es incorrecto',
            general: 'Credenciales incorrectas. Verifica tu correo electrónico y contraseña.'
          }));
        } 
        // Detectar si el error es sobre contraseña incorrecta
        else if (lowerError.includes('contraseña') || lowerError.includes('password') || 
                 lowerError.includes('credenciales') || 
                 lowerError.includes('incorrecta') ||
                 lowerError.includes('inválida') ||
                 lowerError.includes('inválidas')) {
          // Mantener los valores de los campos y mostrar error específico
          setErrors(prev => ({ 
            ...prev,
            password: 'La contraseña es incorrecta',
            general: 'Credenciales incorrectas. Verifica tu correo electrónico y contraseña.'
          }));
        } 
        // Para otros errores, mostrar mensaje general pero mantener los campos
        else {
          // ✅ Usar mensaje de seguridad (no revelar detalles)
          // NO borrar los datos del formulario, solo mostrar el error
          setErrors(prev => ({ 
            ...prev,
            general: securityError.message 
          }));
        }
      }
    } finally {
      setIsLoading(false);
      // Asegurar que los valores se mantengan desde los inputs
      if (emailRef.current && emailRef.current.value) {
        setEmail(emailRef.current.value);
      }
      if (passwordRef.current && passwordRef.current.value) {
        setPassword(passwordRef.current.value);
      }
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // Al volver de Google se regresa a la página de la que venía (cualquier rol).
    guardarRegresoParaGoogle(window.location.search);
    // ✅ Usar configuracion centralizada segun GUIA_ACTUALIZAR_FRONTEND_SIN_ROMPER.md
    import('../../services/config').then(({ getBackendBaseUrl }) => {
      const BACKEND_BASE = getBackendBaseUrl();
      const redirectUrl = `${BACKEND_BASE}/api/auth/google`;
      window.location.href = redirectUrl;
    });
    // Nota: No necesitamos manejar errores aquí porque la redirección es inmediata
    // El usuario será redirigido a Google para autenticarse
  };

  const handleResendCode = async () => {
    if (!email) {
      setErrors({ general: 'Por favor, ingresa tu correo electrónico primero' });
      return;
    }

    // Prevenir envío si hay rate limiting activo
    if (countdown !== null) {
      return;
    }

    setIsResending(true);
    setCountdown(null);
    // NO borrar todos los errores, solo el general
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });

    try {
      const { api } = await import('../../services');
      const result = await api.resendOTPCode(email);
      
      if (result.success) {
        setErrors({ general: '✅ Código reenviado. Revisa tu correo.' });
      } else {
        setErrors({ general: result.error || 'Error al reenviar el código' });
      }
    } catch (error: unknown) {
      // ✅ Manejar error 429 (Rate Limiting)
      const err = error as Error & { status?: number; retryAfter?: number };
      if (err.status === 429) {
        const retrySeconds = err.retryAfter || 60;
        setCountdown(retrySeconds);
        setErrors({ 
          general: `Demasiados intentos. Espera ${retrySeconds} segundos antes de intentar nuevamente.` 
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Error al reenviar el código';
        setErrors({ general: errorMessage });
      }
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
              setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.general;
              return newErrors;
            });
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
      <div>
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Iniciar Sesión
        </h1>
        <p className="mb-7 text-[0.9375rem]" style={{ color: 'var(--encabezados-alterno)' }}>
          Entra para reservar, comprar y ver tus pedidos.
        </p>
        
        {/* Mensaje de éxito si se cambió la contraseña */}
        {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('passwordChanged') === 'true' && (
          <div className="mb-4">
            <Notification
              type="success"
              message="Contraseña cambiada exitosamente. Inicia sesión con tu nueva contraseña."
            />
          </div>
        )}
        
        {/* ✅ Mensaje de error en la parte superior */}
        {errors.general && (
          <div className="mb-4">
            <Notification
              type={errors.general.includes('✅') ? 'success' : 'error'}
              message={errors.general.replace('✅ ', '')}
            />
            {errors.general.toLowerCase().includes('activada') || 
             errors.general.toLowerCase().includes('activar') ||
             errors.general.toLowerCase().includes('confirmada') ? (
              <>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending || !email || countdown !== null}
                  className="mt-2 flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  {isResending 
                    ? 'Enviando...' 
                    : countdown !== null 
                      ? `Espera ${countdown}s` 
                      : 'Reenviar código de activación'
                  }
                </button>
                
                {/* Mostrar contador regresivo si hay rate limiting */}
                {countdown !== null && countdown > 0 && (
                  <div
                    className="mt-3 p-3 rounded-[10px] mx-auto max-w-md"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 14%, transparent)' }}
                  >
                    <p className="flex items-center justify-center gap-1.5 text-sm" style={{ color: 'var(--warning-texto)' }}>
                      <Timer size={16} aria-hidden />
                      Puedes intentar nuevamente en: <strong className="mf-cifras">{countdown}</strong> segundos
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
        
        <div className="space-y-5">
          <div>
            <label htmlFor="email" className="mf-etiqueta">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                const nuevoEmail = e.target.value;
                setEmail(nuevoEmail);
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
              autoComplete="email"
              placeholder="tu@email.com"
              disabled={isLoading || formDisabled}
            />
            {errors.email && (
              <p role="alert" className="mt-1.5 text-sm" style={{ color: 'var(--danger-texto)' }}>
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mf-etiqueta">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                ref={passwordRef}
                value={password}
                onChange={(e) => {
                  const nuevaPassword = e.target.value;
                  setPassword(nuevaPassword);
                  // Limpiar error de password cuando el usuario empieza a escribir
                  if (errors.password) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.password;
                      return newErrors;
                    });
                  }
                }}
                className="mf-campo w-full px-4 py-3 pr-12"
                aria-invalid={Boolean(errors.password)}
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isLoading || formDisabled}
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
              <p role="alert" className="mt-1.5 text-sm" style={{ color: 'var(--danger-texto)' }}>
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end -mt-2">
            <button
              type="button"
              onClick={handleSwitchToRecovery}
              className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
              disabled={isLoading || formDisabled}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* ✅ Errores de campos específicos ya se muestran debajo de cada campo */}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
            disabled={isLoading || isGoogleLoading || formDisabled}
            className="mf-btn mf-btn-color w-full min-h-12 py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              ['--btn-bg' as string]: 'var(--botones-principales)',
              ['--btn-bg-hover' as string]: 'var(--hover)',
              ['--btn-texto' as string]: 'var(--marfil)',
            }}
          >
            <span className="mf-feedback-contenido" data-cambiando={isLoading ? 'true' : 'false'}>
              {isLoading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t" style={{ borderColor: 'var(--mf-linea-fuerte)' }}></div>
          <span className="px-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            o
          </span>
          <div className="flex-1 border-t" style={{ borderColor: 'var(--mf-linea-fuerte)' }}></div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="mf-btn mf-btn-color w-full min-h-12 py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          style={{
            ['--btn-bg' as string]: 'var(--input-bg)',
            ['--btn-bg-hover' as string]: 'color-mix(in srgb, var(--input-bg) 90%, var(--menu-texto-principal))',
            ['--btn-texto' as string]: 'var(--menu-texto-principal)',
            ['--btn-borde' as string]: '1px solid var(--campo-borde)',
            ['--btn-borde-hover' as string]: 'var(--campo-borde)',
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
              <LogoGoogle />
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            ¿No tienes una cuenta?{' '}
            <button
              type="button"
              onClick={handleSwitchToRegister}
              className="inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
              disabled={isLoading}
            >
              Regístrate
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

