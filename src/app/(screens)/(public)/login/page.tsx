'use client';

import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import AuthContainer from '../../../components/auth/AuthContainer';
import { showAlert } from '../../../utils/toast';
import { destinoTrasLogin } from '../../../components/auth/redireccionTrasLogin';

function LoginContent() {
  const router = useRouter();

  // Destino tras el login: returnUrl permitido, /admin para admin o /home (redireccionTrasLogin.ts).
  const handleAuthSuccess = () => {
    const destino = destinoTrasLogin(window.location.search);
    if (destino) {
      router.push(destino);
    } else {
      showAlert('Error: No se pudo guardar la sesión. Por favor intenta nuevamente.');
    }
  };

  return (
    <AuthContainer
      initialView="login"
      onAuthSuccess={handleAuthSuccess}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" style={{ backgroundColor: 'var(--fondo-general)' }} />}>
      <LoginContent />
    </Suspense>
  );
}
