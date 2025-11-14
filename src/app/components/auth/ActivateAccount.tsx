'use client';

import { useState, useEffect, useRef } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';

interface ActivateAccountProps {
  email: string;
  onActivationSuccess?: () => void;
  onBackToRegister?: () => void;
  onSkipToLogin?: () => void;
}

export default function ActivateAccount({ 
  email, 
  onActivationSuccess,
  onBackToRegister,
  onSkipToLogin
}: ActivateAccountProps) {
  const [codigoOTP, setCodigoOTP] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const emailEnviadoRef = useRef<string | null>(null);

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
        setMensaje('✅ Cuenta activada correctamente. Redirigiendo...');
        setError('');
        setTimeout(() => {
          onActivationSuccess?.();
        }, 1500);
      } else {
        setMensaje(result.error || 'Error al verificar el código');
        setError('El código es incorrecto o ha expirado');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setMensaje('❌ Error de conexión al verificar el código');
      setError('No se pudo conectar con el servidor');
      console.error('Error verificando OTP:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReenviarOTP = async (esAutomatico = false) => {
    setIsResending(true);
    setError('');
    // Solo limpiar mensaje si no es automático
    if (!esAutomatico) {
      setMensaje('');
    }

    try {
      const { api } = await import('../../services');
      const result = await api.resendOTPCode(email);
      
      if (result.success) {
        if (esAutomatico) {
          // Si es automático, mostrar mensaje más discreto
          setMensaje('✅ Código de verificación enviado. Revisa tu correo.');
        } else {
          setMensaje('✅ Código reenviado correctamente. Revisa tu correo.');
        }
        setError('');
        setCodigoOTP(''); // Limpiar el código anterior
      } else {
        setMensaje(result.error || 'Error al reenviar el código');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      if (!esAutomatico) {
        setMensaje('❌ Error de conexión al reenviar el código');
      }
      console.error('Error reenviando OTP:', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  // Enviar código automáticamente cuando el componente se monta o cuando cambia el email
  useEffect(() => {
    // Solo enviar si hay un email válido y no se ha enviado para este email antes
    if (email && emailEnviadoRef.current !== email) {
      emailEnviadoRef.current = email;
      handleReenviarOTP(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]); // Ejecutar cuando cambia el email

  // Función para obtener clase CSS del input
  const getInputClassName = (): string => {
    if (error) return 'border-red-500 dark:border-red-600';
    if (codigoOTP && !error) return 'border-green-500 dark:border-green-600';
    return 'border-zinc-300 dark:border-zinc-700';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div 
        className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8"
        style={{ backgroundColor: colors.tarjetasPaneles }}
      >
        <h2 
          className="text-2xl font-bold text-center mb-2"
          style={{ color: colors.textoFondoOscuro }}
        >
          Activa tu cuenta
        </h2>
        <p 
          className="text-center mb-6 text-sm"
          style={{ color: colorsWithOpacity.textoFondoOscuro80 }}
        >
          Hemos enviado un código de verificación a:
          <br />
          <span className="font-semibold" style={{ color: colors.textoFondoOscuro }}>
            {email}
          </span>
        </p>

        <div className="mb-4">
          <label 
            htmlFor="otp"
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textoFondoOscuro }}
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
            className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors text-center text-2xl font-mono tracking-widest ${getInputClassName()}`}
            style={{ 
              backgroundColor: '#f2f1ed', 
              color: '#161616',
            }}
            maxLength={6}
            disabled={isLoading}
          />
          {error && (
            <p className="mt-1 text-sm" style={{ color: colors.danger }}>
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleVerificarOTP}
          disabled={isLoading || codigoOTP.length !== 6}
          className={`w-full py-3 rounded-lg font-semibold transition-all mb-3 ${
            isLoading || codigoOTP.length !== 6
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-90 active:scale-95'
          }`}
          style={{ 
            backgroundColor: colors.botonesPrincipales,
            color: colors.textoFondoOscuro
          }}
        >
          {isLoading ? 'Verificando...' : 'Verificar código'}
        </button>

        <button
          onClick={() => handleReenviarOTP(false)}
          disabled={isResending}
          className={`w-full py-2 rounded-lg font-medium transition-all mb-4 ${
            isResending
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-80'
          }`}
          style={{ 
            backgroundColor: 'transparent',
            color: colors.enlacesTextosInteractivos,
            border: `1px solid ${colors.enlacesTextosInteractivos}`
          }}
        >
          {isResending ? 'Enviando...' : 'Reenviar código'}
        </button>

        <div className="mt-4 space-y-2">
          {onBackToRegister && (
            <button
              onClick={onBackToRegister}
              className="w-full text-center text-sm py-2 hover:opacity-80 transition-opacity"
              style={{ color: colors.enlacesTextosInteractivos }}
            >
              ← Volver
            </button>
          )}

          {onSkipToLogin && (
            <button
              onClick={onSkipToLogin}
              className="w-full text-center text-sm py-2 hover:opacity-80 transition-opacity font-medium"
              style={{ color: colors.enlacesTextosInteractivos }}
            >
              Ir al inicio de sesión →
            </button>
          )}
        </div>

        {mensaje && (
          <div 
            className={`mt-4 p-3 rounded-lg text-sm text-center ${
              mensaje.includes('✅') ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
            }`}
            style={{ 
              color: mensaje.includes('✅') ? colors.success : colors.danger 
            }}
          >
            {mensaje}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
            El código expira en 2 minutos. Si no lo recibes, verifica tu carpeta de spam.
          </p>
          <p className="text-xs mt-2" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
            Puedes verificar tu correo más tarde desde el inicio de sesión.
          </p>
        </div>
      </div>
    </div>
  );
}

