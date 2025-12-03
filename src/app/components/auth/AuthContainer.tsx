'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ForgotPasswordOTP from './ForgotPasswordOTP';
import ForgotPasswordSecurityQuestions from './ForgotPasswordSecurityQuestions';
import ResetPassword from './ResetPassword';
import EnlaceEnviado from './EnlaceEnviado';


type AuthView = 'login' | 'register' | 'forgot-email' | 'forgot-otp' | 'forgot-security' | 'reset-password' | 'enlace-enviado';

interface AuthContainerProps {
  initialView?: AuthView;
  onAuthSuccess?: () => void;
}

export default function AuthContainer({ 
  initialView = 'login',
  onAuthSuccess 
}: AuthContainerProps) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<AuthView>(initialView);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState<string>('');
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  
  // Funciones para navegar usando router cuando no hay callback
  const handleSwitchToRegister = () => {
    router.push('/register');
  };
  
  const handleSwitchToLogin = () => {
    router.push('/login');
  };
  
  const handleSwitchToRecovery = () => {
    router.push('/forgot-password');
  };

  const handleLoginSuccess = () => {
    onAuthSuccess?.();
  };

  const handleRegisterSuccess = () => {
    // Redirigir al login después de registro exitoso
    router.push('/login');
  };

  const handleEmailSent = (email: string) => {
    // Cuando se envía el enlace de recuperación, mostrar pantalla de éxito
    setRecoveryEmail(email);
    setCurrentView('enlace-enviado');
  };

  const handleOTPCodeSent = (email: string) => {
    // Cuando se envía el código OTP, cambiar a la vista de verificación
    setRecoveryEmail(email);
    setCurrentView('forgot-otp');
  };

  const handleOTPCodeVerified = (email: string, token: string) => {
    // Cuando se verifica el código OTP, guardar token con expiración de 10 minutos
    setRecoveryIdentifier(email);
    localStorage.setItem('resetPasswordToken', token);
    localStorage.setItem('resetPasswordEmail', email);
    localStorage.setItem('resetPasswordExpires', String(Date.now() + 10 * 60 * 1000));
    sessionStorage.setItem('resetToken', token); // Para compatibilidad
    setCurrentView('reset-password');
  };

  // handleEmailConfirmed se eliminará hasta integrar el flujo por email directo

  const handleSecurityQuestionsVerified = (email: string, token?: string) => {
    setRecoveryIdentifier(email);
    // Si hay token, guardarlo con expiración de 10 minutos
    if (token) {
      localStorage.setItem('resetPasswordToken', token);
      localStorage.setItem('resetPasswordEmail', email);
      localStorage.setItem('resetPasswordExpires', String(Date.now() + 10 * 60 * 1000));
      sessionStorage.setItem('resetToken', token); // Para compatibilidad
    }
    setCurrentView('reset-password');
  };

  const handlePasswordReset = () => {
    // Después de restablecer la contraseña, redirigir al login
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-fondo-general">
      {currentView === 'login' && (
        <Login
          onSwitchToRegister={handleSwitchToRegister}
          onSwitchToRecovery={handleSwitchToRecovery}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentView === 'register' && (
        <Register
          onSwitchToLogin={handleSwitchToLogin}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}

      {currentView === 'forgot-email' && (
        <ForgotPassword
          onSwitchToLogin={handleSwitchToLogin}
          onEmailSent={handleEmailSent}
          onSwitchToSecurityQuestions={() => setCurrentView('forgot-security')}
        />
      )}

      {currentView === 'forgot-otp' && (
        <ForgotPasswordOTP
          email={recoveryEmail}
          onCodeVerified={handleOTPCodeVerified}
          onBack={() => {
            setRecoveryEmail('');
            setCurrentView('forgot-email');
          }}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}

      {currentView === 'forgot-security' && (
        <ForgotPasswordSecurityQuestions
          onSwitchToLogin={handleSwitchToLogin}
          onSwitchToEmail={() => setCurrentView('forgot-email')}
          onQuestionsVerified={handleSecurityQuestionsVerified}
        />
      )}

      {currentView === 'reset-password' && (
        <ResetPassword
          onSwitchToLogin={handleSwitchToLogin}
          onPasswordReset={handlePasswordReset}
          identifier={recoveryIdentifier}
        />
      )}

      {currentView === 'enlace-enviado' && (
        <EnlaceEnviado
          email={recoveryEmail}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
    </div>
  );
}

