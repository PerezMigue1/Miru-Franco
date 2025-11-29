'use client';

import { useRouter } from 'next/navigation';
import AuthContainer from '../components/auth/AuthContainer';

export default function RegisterPage() {
  const router = useRouter();

  const handleAuthSuccess = () => {
    console.log('Usuario registrado exitosamente');
    router.push('/home');
  };

  return (
    <AuthContainer 
      initialView="register"
      onAuthSuccess={handleAuthSuccess}
    />
  );
}

