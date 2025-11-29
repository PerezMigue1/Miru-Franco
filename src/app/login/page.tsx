'use client';

import { useRouter } from 'next/navigation';
import AuthContainer from '../components/auth/AuthContainer';

export default function LoginPage() {
  const router = useRouter();

  const handleAuthSuccess = () => {
    console.log('Usuario autenticado exitosamente');
    router.push('/home');
  };

  return (
    <AuthContainer 
      initialView="login"
      onAuthSuccess={handleAuthSuccess}
    />
  );
}

