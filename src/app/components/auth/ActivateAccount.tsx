'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Timer } from 'lucide-react';
import Notification from '../ui/Notification';
import { MENSAJE_SIN_CONEXION } from '../../utils/errorRed';

interface ActivateAccountProps {
  email: string;
  metodoVerificacion?: 'email' | 'sms'; // ✅ NUEVO: Método de verificación usado
  onActivationSuccess?: () => void;
  onBackToRegister?: () => void;
  onSkipToLogin?: () => void;
}

export default function ActivateAccount({ 
  email, 
  metodoVerificacion = 'email', // ✅ Default a email si no se especifica
  onActivationSuccess,
  onBackToRegister,
  onSkipToLogin
}: ActivateAccountProps) {
  const [codigoOTP, setCodigoOTP] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Validación del código OTP
  const validarOTP = (codigo: string): string => {
    if (!codigo.trim()) {
      return 'El código OTP es obligatorio';
    }
    if (codigo.length < 6) {
      return 'El código OTP debe tener 6 dígitos';
    }
    if (!/^[0-9]+$/.test(codigo)) {
      return 'El código OTP solo puede contener números';
    }
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Solo números, máximo 6
    setCodigoOTP(value);
    
    // Validación en tiempo real
    const errorValidacion = validarOTP(value);
    setError(errorValidacion);
    
    // Limpiar mensaje cuando el usuario empiece a escribir
    if (mensaje && value) {
      setMensaje('');
    }
  };

  const handleVerificarOTP = async () => {
    // Validación antes de enviar
    const errorValidacion = validarOTP(codigoOTP);
    if (errorValidacion) {
      setError(errorValidacion);
      setMensaje('');
      return;
    }

    setIsLoading(true);
    setError('');
    setMensaje('');

    try {
      const { api } = await import('../../services');
      const result = await api.verifyOTP(email, codigoOTP);
      
      if (result.success) {
        // ✅ Si el backend ya dejó la sesión iniciada, redirigir (el JWT viaja en cookie httpOnly;
        // nunca se guarda en localStorage)
        if (result.token) {
          setMensaje('✅ Cuenta activada correctamente. Redirigiendo...');
          setError('');
          setTimeout(() => {
            // Redirigir a home en lugar de solo llamar onActivationSuccess
            if (typeof window !== 'undefined') {
              window.location.href = '/home';
            } else {
              onActivationSuccess?.();
            }
          }, 1500);
        } else {
          // Si no hay token, solo activar y cambiar a login
          setMensaje('✅ Cuenta activada correctamente. Redirigiendo al login...');
          setError('');
          setTimeout(() => {
            onActivationSuccess?.();
          }, 1500);
        }
      } else {
        setMensaje(result.error || 'Error al verificar el código');
        setError('El código es incorrecto o ha expirado');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      const lower = errorMessage.toLowerCase();
      // Distinguir un código incorrecto/expirado (respuesta del backend) de un fallo real de conexión.
      const esErrorDeCodigo =
        lower.includes('código') || lower.includes('codigo') ||
        lower.includes('inválido') || lower.includes('invalido') ||
        lower.includes('expirado') || lower.includes('incorrecto') ||
        lower.includes('utilizado');
      if (esErrorDeCodigo) {
        setMensaje(errorMessage);
        setError('El código es incorrecto o ha expirado. Solicita uno nuevo con "Reenviar código".');
      } else {
        setMensaje('❌ Error de conexión al verificar el código');
        setError(MENSAJE_SIN_CONEXION);
      }
      console.error('Error verificando OTP:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReenviarOTP = async (esAutomatico = false) => {
    // ✅ Prevenir doble envío o si hay rate limiting activo
    if (isResending || countdown !== null) {
      console.warn('⚠️ Reenvío ya en proceso o rate limiting activo, ignorando...');
      return;
    }
    
    setIsResending(true);
    setError('');
    setCountdown(null);
    // Solo limpiar mensaje si no es automático
    if (!esAutomatico) {
      setMensaje('');
    }

    try {
      const { api } = await import('../../services');
      const result = await api.resendOTPCode(email, metodoVerificacion);
      
      // ✅ Actualizar método si el backend lo devuelve
      const metodoUsado = result.metodo || metodoVerificacion;
      
      if (result.success) {
        if (esAutomatico) {
          // Si es automático, mostrar mensaje más discreto según el método
          setMensaje(metodoUsado === 'sms' 
            ? '✅ Código de verificación enviado. Revisa tus mensajes SMS.'
            : '✅ Código de verificación enviado. Revisa tu correo.'
          );
        } else {
          setMensaje(metodoUsado === 'sms'
            ? '✅ Código reenviado correctamente. Revisa tus mensajes SMS.'
            : '✅ Código reenviado correctamente. Revisa tu correo.'
          );
        }
        setError('');
        setCodigoOTP(''); // Limpiar el código anterior
      } else {
        setMensaje(result.error || 'Error al reenviar el código');
      }
    } catch (err: unknown) {
      // ✅ Manejar error 429 (Rate Limiting)
      const error = err as Error & { status?: number; retryAfter?: number };
      if (error.status === 429) {
        const retrySeconds = error.retryAfter || 60;
        setCountdown(retrySeconds);
        setMensaje(`Demasiados intentos. Espera ${retrySeconds} segundos antes de intentar nuevamente.`);
        setError('');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        if (!esAutomatico) {
          setMensaje('❌ Error de conexión al reenviar el código');
        }
        console.error('Error reenviando OTP:', errorMessage);
      }
    } finally {
      setIsResending(false);
    }
  };

  // Contador regresivo para rate limiting
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setError('');
    }
  }, [countdown]);

  // ✅ REMOVIDO: No enviar código automáticamente porque ya se envía durante el registro
  // El código OTP se envía automáticamente cuando el usuario se registra,
  // por lo que no es necesario enviarlo nuevamente cuando se monta este componente.
  // El usuario puede hacer clic en "Reenviar código" si necesita otro código.

  return (
    <div className="w-full max-w-md mx-auto">
      <div>
        <h2
          className="mf-titulo-pagina text-center mb-2"
          style={{ color: 'var(--menu-texto-principal)' }}
        >
          Activa tu cuenta
        </h2>
        <p
          className="text-center mb-6 text-sm"
          style={{ color: 'var(--encabezados-alterno)' }}
        >
          {metodoVerificacion === 'sms'
            ? 'Hemos enviado un código de verificación a tu teléfono:'
            : 'Hemos enviado un código de verificación a:'
          }
          <br />
          <span className="font-semibold break-all" style={{ color: 'var(--menu-texto-principal)' }}>
            {metodoVerificacion === 'sms' ? 'Tu teléfono registrado' : email}
          </span>
        </p>

        <div className="mb-4">
          <label
            htmlFor="otp"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            Código de verificación (6 dígitos)
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={codigoOTP}
            onChange={handleInputChange}
            className="mf-campo w-full px-4 py-3 text-center text-2xl font-mono tracking-widest"
            aria-invalid={Boolean(error)}
            maxLength={6}
            disabled={isLoading}
          />
          {error && (
            <p className="mt-1 text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleVerificarOTP}
          disabled={isLoading || codigoOTP.length !== 6}
          className="mf-btn mf-btn-color w-full py-3 px-4 mb-3 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            ['--btn-bg' as string]: 'var(--botones-principales)',
            ['--btn-bg-hover' as string]: 'var(--hover)',
            ['--btn-texto' as string]: 'var(--marfil)',
          }}
        >
          {isLoading ? 'Verificando...' : 'Verificar código'}
        </button>

        <button
          onClick={() => handleReenviarOTP(false)}
          disabled={isResending || countdown !== null}
          className="mf-btn mf-btn-color w-full min-h-11 py-2 px-4 mb-4 rounded-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            ['--btn-bg' as string]: 'transparent',
            ['--btn-texto' as string]: 'var(--menu-texto-principal)',
            ['--btn-borde' as string]: '1.5px solid var(--mf-linea-fuerte)',
            ['--btn-bg-hover' as string]: 'var(--nav-hover-bg)',
            ['--btn-borde-hover' as string]: 'var(--menu-texto-principal)',
          }}
        >
          {isResending
            ? 'Enviando...'
            : countdown !== null
              ? `Espera ${countdown}s`
              : 'Reenviar código'
          }
        </button>

        {/* Mostrar contador regresivo si hay rate limiting */}
        {countdown !== null && countdown > 0 && (
          <div className="mb-4 p-3 rounded-[10px] border" style={{
            backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)',
            borderColor: 'var(--warning)'
          }}>
            <p className="flex items-center justify-center gap-2 text-sm text-center" style={{ color: 'var(--warning-texto)' }}>
              <Timer size={16} aria-hidden className="shrink-0" />
              <span>Puedes intentar nuevamente en: <strong>{countdown}</strong> segundos</span>
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-col items-center gap-1">
          {onBackToRegister && (
            <button
              onClick={onBackToRegister}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              <ArrowLeft size={16} aria-hidden />
              Volver
            </button>
          )}

          {onSkipToLogin && (
            <button
              onClick={onSkipToLogin}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Ir al inicio de sesión
              <ArrowRight size={16} aria-hidden />
            </button>
          )}
        </div>

        {mensaje && (
          <div className="mt-4">
            <Notification
              type={mensaje.includes('✅') ? 'success' : 'error'}
              message={mensaje.replace(/^(✅|❌)\s*/u, '')}
            />
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
            El código expira en 2 minutos.
            {metodoVerificacion === 'sms'
              ? ' Si no lo recibes, verifica que tu teléfono esté correcto.'
              : ' Si no lo recibes, verifica tu carpeta de spam.'
            }
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
            {metodoVerificacion === 'sms'
              ? 'Puedes solicitar un nuevo código si es necesario.'
              : 'Puedes verificar tu correo más tarde desde el inicio de sesión.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
