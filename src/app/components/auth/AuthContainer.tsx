'use client';

import { useState } from 'react';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ForgotPasswordSMS from './ForgotPasswordSMS';
import ForgotPasswordSecurityQuestions from './ForgotPasswordSecurityQuestions';
import ResetPassword from './ResetPassword';


type AuthView = 'login' | 'register' | 'forgot-email' | 'forgot-sms' | 'forgot-security' | 'reset-password';

interface AuthContainerProps {
  initialView?: AuthView;
  onAuthSuccess?: () => void;
}

export default function AuthContainer({ 
  initialView = 'login',
  onAuthSuccess 
}: AuthContainerProps) {
  const [currentView, setCurrentView] = useState<AuthView>(initialView);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState<string>('');

  const handleLoginSuccess = () => {
    onAuthSuccess?.();
  };

  const handleRegisterSuccess = () => {
    // Cambiar a la vista de login después de registro exitoso
    setCurrentView('login');
  };

  const handleEmailSent = () => {
    // Cuando se envía el email, guardamos el método pero no cambiamos de vista todavía
    // El usuario verá el mensaje de confirmación y luego puede ir a reset-password
    // Nota: En un flujo real, el usuario haría clic en el enlace del email
    // que lo llevaría a reset-password con un token
  };

  // handleEmailConfirmed se eliminará hasta integrar el flujo por email directo

  const handleSMSCodeVerified = (phone: string) => {
    setRecoveryIdentifier(phone);
    setCurrentView('reset-password');
  };

  const handleSecurityQuestionsVerified = (email: string, token?: string) => {
    setRecoveryIdentifier(email);
    // Si hay token, guardarlo en localStorage temporalmente o en la URL
    if (token) {
      // Guardar token en sessionStorage para que ResetPassword lo pueda obtener
      sessionStorage.setItem('resetToken', token);
    }
    setCurrentView('reset-password');
  };

  const handlePasswordReset = () => {
    // Después de restablecer la contraseña, ir al login
    setTimeout(() => {
      setCurrentView('login');
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-fondo-general">
      {currentView === 'login' && (
        <Login
          onSwitchToRegister={() => setCurrentView('register')}
          onSwitchToRecovery={() => setCurrentView('forgot-email')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentView === 'register' && (
        <Register
          onSwitchToLogin={() => setCurrentView('login')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}

      {currentView === 'forgot-email' && (
        <ForgotPassword
          onSwitchToLogin={() => setCurrentView('login')}
          onEmailSent={handleEmailSent}
          onSwitchToSMS={() => setCurrentView('forgot-sms')}
          onSwitchToSecurityQuestions={() => setCurrentView('forgot-security')}
        />
      )}

      {currentView === 'forgot-sms' && (
        <ForgotPasswordSMS
          onSwitchToLogin={() => setCurrentView('login')}
          onSwitchToEmail={() => setCurrentView('forgot-email')}
          onSwitchToSecurityQuestions={() => setCurrentView('forgot-security')}
          onCodeVerified={handleSMSCodeVerified}
        />
      )}

      {currentView === 'forgot-security' && (
        <ForgotPasswordSecurityQuestions
          onSwitchToLogin={() => setCurrentView('login')}
          onSwitchToEmail={() => setCurrentView('forgot-email')}
          onSwitchToSMS={() => setCurrentView('forgot-sms')}
          onQuestionsVerified={handleSecurityQuestionsVerified}
        />
      )}

      {currentView === 'reset-password' && (
        <ResetPassword
          onSwitchToLogin={() => setCurrentView('login')}
          onPasswordReset={handlePasswordReset}
          identifier={recoveryIdentifier}
        />
      )}
    </div>
  );
}

