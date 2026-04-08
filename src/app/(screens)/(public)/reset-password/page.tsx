'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ResetPassword from '../../../components/auth/ResetPassword';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const handlePasswordReset = () => {
    // Guardar el email en sessionStorage para mostrarlo en el login
    if (email && typeof window !== 'undefined') {
      sessionStorage.setItem('lastResetEmail', email);
    }
    
    // Limpiar cualquier parámetro de la URL antes de redirigir
    router.push('/login?passwordChanged=true');
    // Forzar recarga para limpiar cualquier estado residual (sin callback que dispare taint URL → setTimeout)
    void (async () => {
      await sleep(100);
      if (typeof window !== 'undefined') {
        window.location.assign('/login?passwordChanged=true');
      }
    })();
  };

  const handleSwitchToLogin = () => {
    router.push('/login');
  };

  return (
    <ResetPassword
      token={token || undefined}
      email={email || undefined}
      onPasswordReset={handlePasswordReset}
      onSwitchToLogin={handleSwitchToLogin}
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: '#F2F1ED' }}>Cargando...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
