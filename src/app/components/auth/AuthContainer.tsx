'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SuperficieCliente from '../cliente/SuperficieCliente';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ForgotPasswordOTP from './ForgotPasswordOTP';
import ForgotPasswordSecurityQuestions from './ForgotPasswordSecurityQuestions';
import ForgotPasswordSMS from './ForgotPasswordSMS';
import ResetPassword from './ResetPassword';
import EnlaceEnviado from './EnlaceEnviado';

type AuthView = 'login' | 'register' | 'forgot-email' | 'forgot-otp' | 'forgot-security' | 'forgot-sms' | 'reset-password' | 'enlace-enviado';

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

  const handleSMSCodeVerified = (email: string, token: string) => {
    setRecoveryIdentifier(email);
    localStorage.setItem('resetPasswordToken', token);
    localStorage.setItem('resetPasswordEmail', email);
    localStorage.setItem('resetPasswordExpires', String(Date.now() + 10 * 60 * 1000));
    sessionStorage.setItem('resetToken', token);
    setCurrentView('reset-password');
  };

  const handlePasswordReset = () => {
    // Después de restablecer la contraseña, redirigir al login
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  return (
    <SuperficieCliente
      className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      style={{ backgroundColor: 'var(--fondo-general)' }}
    >
      {/* Panel de marca (escritorio): el mismo mundo del hero de /home, estático y ligero */}
      <aside
        className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 xl:p-16"
        style={{ backgroundColor: 'var(--mf-banda)' }}
      >
        <Link
          href="/home"
          className="group inline-flex items-center gap-2 text-sm font-medium self-start"
          style={{ color: 'var(--texto-fondo-oscuro-80)', minHeight: 44 }}
        >
          <ArrowLeft size={16} aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1" style={{ color: 'var(--logo-branding)' }} />
          Volver al inicio
        </Link>
        <div className="mf-entrada flex flex-col items-center text-center">
          <div className="relative w-64 xl:w-72 aspect-square">
            <div className="absolute -inset-6 rounded-full border" style={{ borderColor: 'rgba(159, 109, 31, 0.28)' }} aria-hidden />
            <div className="absolute inset-4 rounded-full border border-dashed" style={{ borderColor: 'rgba(159, 109, 31, 0.3)' }} aria-hidden />
            <Image src="/logo-miru.jpg" alt="Mirú Franco" fill className="object-contain p-12" sizes="18rem" priority />
          </div>
          <p className="mt-10 text-brand-tagline tracking-[0.2em]" style={{ color: 'var(--logo-branding)' }}>
            Beauty Salón
          </p>
        </div>
        <p className="text-xs" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
          Huejutla de Reyes, Hidalgo
        </p>
      </aside>

      <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-10">
        <div className="lg:hidden w-full max-w-md mb-6 flex items-center justify-between">
          <Link
            href="/home"
            className="group inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--menu-texto-principal)', minHeight: 44 }}
          >
            <ArrowLeft size={16} aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1" />
            Volver al inicio
          </Link>
          <div className="relative w-10 h-10">
            <Image src="/logo-miru.jpg" alt="" fill className="object-contain" sizes="40px" />
          </div>
        </div>
        <div className="w-full mf-entrada" style={{ ['--i' as string]: 1 }}>
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
          onSwitchToSMS={() => setCurrentView('forgot-sms')}
        />
      )}

      {currentView === 'forgot-sms' && (
        <ForgotPasswordSMS
          onSwitchToLogin={handleSwitchToLogin}
          onSwitchToEmail={() => setCurrentView('forgot-email')}
          onSwitchToSecurityQuestions={() => setCurrentView('forgot-security')}
          onCodeVerified={handleSMSCodeVerified}
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
          onSwitchToSMS={() => setCurrentView('forgot-sms')}
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
      </div>
    </SuperficieCliente>
  );
}

