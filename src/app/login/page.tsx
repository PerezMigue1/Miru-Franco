'use client';

import { useRouter } from 'next/navigation';
import AuthContainer from '../components/auth/AuthContainer';

export default function LoginPage() {
  const router = useRouter();

  const handleAuthSuccess = () => {
    console.log('Usuario autenticado exitosamente');
    // Verificar token antes de redirigir
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      console.log('Token encontrado, redirigiendo a /home');
      router.push('/home');
    } else {
      console.error('No se encontró token después del login');
      alert('Error: No se pudo guardar la sesión. Por favor intenta nuevamente.');
    }
  };

  return (
    <AuthContainer 
      initialView="login"
      onAuthSuccess={handleAuthSuccess}
    />
  );
}

